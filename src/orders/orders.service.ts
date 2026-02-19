import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../storage/gcs.service';
import { normalizePhone } from '../common/phone';
import { buildMeta } from '../common/pagination';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AvailableProductsDto } from './dto/available-products.dto';
import { AddOrderItemDto } from './dto/add-order-item.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gcs: GcsService,
  ) {}

  private toNumber(v: Prisma.Decimal | number | null | undefined): number {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    return v.toNumber();
  }

  private orderCode(id: string): string {
    return `ORD-${id.slice(0, 8).toUpperCase()}`;
  }

  private getCodeSearchToken(q?: string): string | null {
    if (!q) return null;
    const compact = q.trim().toUpperCase().replace(/^ORD-?/, '').replace(/[^A-F0-9-]/g, '');
    return compact.length > 0 ? compact : null;
  }

  private isUuid(value?: string | null): boolean {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private dateKeyFromDate(date: Date): string {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }

  private async getPricingConfig(tripId: string) {
    const [tripFees, tripExchangeRules, shippingRates] = await Promise.all([
      this.prisma.tripProductFee.findMany({
        where: { tripId },
        select: {
          catalogId: true,
          nameSnapshot: true,
          percentage: true,
        },
      }),
      this.prisma.tripExchangeRule.findMany({
        where: { tripId },
        select: {
          catalogId: true,
          nameSnapshot: true,
          valueAdded: true,
        },
      }),
      this.prisma.tripShippingRate.findMany({
        where: { tripId, enabled: true },
        select: {
          productTypeId: true,
          nameSnapshot: true,
          costMxn: true,
          enabled: true,
        },
      }),
    ]);

    const spreadTotalMxn = tripExchangeRules.reduce(
      (acc, r) => acc + this.toNumber(r.valueAdded),
      0,
    );

    const shippingByType = new Map(
      shippingRates.map((r) => [r.productTypeId, this.toNumber(r.costMxn)]),
    );

    return { tripFees, tripExchangeRules, shippingRates, spreadTotalMxn, shippingByType };
  }

  private async getRatesForOrders(orders: any[]) {
    const dateKeys = Array.from(
      new Set(
        orders.flatMap((order) =>
          order.items.map((item) => this.dateKeyFromDate(item.createdAt)),
        ),
      ),
    );

    const exactRates = await this.prisma.exchangeRate.findMany({
      where: {
        date: {
          in: dateKeys.map((k) => new Date(`${k}T00:00:00.000Z`)),
        },
      },
      select: { date: true, rateMxn: true },
    });

    const latestRate = await this.prisma.exchangeRate.findFirst({
      orderBy: { date: 'desc' },
      select: { rateMxn: true },
    });

    const fallbackRate = this.toNumber(latestRate?.rateMxn);
    const ratesByDate = new Map(
      exactRates.map((r) => [this.dateKeyFromDate(r.date), this.toNumber(r.rateMxn)]),
    );

    return { ratesByDate, fallbackRate };
  }

  private async mapOrdersWithTotals(
    orders: any[],
    tripId: string,
  ) {
    const { tripFees, spreadTotalMxn, shippingByType } =
      await this.getPricingConfig(tripId);
    const { ratesByDate, fallbackRate } = await this.getRatesForOrders(orders);

    return Promise.all(
      orders.map(async (order) => {
        let baseUsdTotal = 0;
        const feeUsdByCatalog = new Map<string, { label: string; percent: number; amount: number }>();
        const feeMxnWithoutByCatalog = new Map<string, { label: string; percent: number; amount: number }>();
        const feeMxnWithByCatalog = new Map<string, { label: string; percent: number; amount: number }>();
        let baseMxnWithoutTotal = 0;
        let baseMxnWithTotal = 0;
        let shippingTotalMxn = 0;

        const items = await Promise.all(
          order.items.map(async (item) => {
            const unitBasePriceUsd = this.toNumber(item.basePriceUsd);
            const qty = Math.max(1, Number(item.quantity || 1));
            const basePriceUsd = unitBasePriceUsd * qty;
            const dateKey = this.dateKeyFromDate(item.createdAt);
            const baseRate = ratesByDate.get(dateKey) ?? fallbackRate;
            const finalAppliedRate = baseRate + spreadTotalMxn;
            const shippingPerUnit = item.productTypeId
              ? shippingByType.get(item.productTypeId) ?? 0
              : 0;
            const shippingCostMxn = shippingPerUnit * qty;

            baseUsdTotal += basePriceUsd;
            baseMxnWithoutTotal += basePriceUsd * baseRate;
            baseMxnWithTotal += basePriceUsd * finalAppliedRate;
            shippingTotalMxn += shippingCostMxn;

            const feesApplied = tripFees.map((fee) => {
              const percent = this.toNumber(fee.percentage);
              const amountUsd = basePriceUsd * (percent / 100);
              const amountMxnWithout = amountUsd * baseRate;
              const amountMxnWith = amountUsd * finalAppliedRate;

              const byUsd = feeUsdByCatalog.get(fee.catalogId) ?? {
                label: fee.nameSnapshot,
                percent,
                amount: 0,
              };
              byUsd.amount += amountUsd;
              feeUsdByCatalog.set(fee.catalogId, byUsd);

              const byMxnWithout = feeMxnWithoutByCatalog.get(fee.catalogId) ?? {
                label: fee.nameSnapshot,
                percent,
                amount: 0,
              };
              byMxnWithout.amount += amountMxnWithout;
              feeMxnWithoutByCatalog.set(fee.catalogId, byMxnWithout);

              const byMxnWith = feeMxnWithByCatalog.get(fee.catalogId) ?? {
                label: fee.nameSnapshot,
                percent,
                amount: 0,
              };
              byMxnWith.amount += amountMxnWith;
              feeMxnWithByCatalog.set(fee.catalogId, byMxnWith);

              return {
                label: fee.nameSnapshot,
                percent,
                amount_usd: Number(amountUsd.toFixed(2)),
              };
            });

            const images = item.product
              ? await Promise.all(
                  item.product.images.map(async (img) => ({
                    id: img.id,
                    url: await this.gcs.getSignedUrl(img.path, 60),
                    isPrimary: img.isPrimary,
                    sortOrder: img.sortOrder,
                  })),
                )
              : [];

            return {
              id: item.id,
              orderId: item.orderId,
              tripProductId: item.tripProductId,
              productId: item.productId,
              productName: item.productName,
              quantity: qty,
              basePriceUsd: Number(basePriceUsd.toFixed(2)),
              shippingCostMxn: Number(shippingCostMxn.toFixed(2)),
              finalPriceMxn: this.toNumber(item.finalPriceMxn),
              pricing_details: {
                base_price_usd: Number(basePriceUsd.toFixed(2)),
                fees_applied: feesApplied,
                exchange_rules_applied: [
                  { kind: 'base_rate', value_mxn: Number(baseRate.toFixed(2)) },
                  { kind: 'spread', value_mxn: Number(spreadTotalMxn.toFixed(2)) },
                ],
                shipping_applied: [
                  { enabled: shippingCostMxn > 0, value_mxn: Number(shippingCostMxn.toFixed(2)) },
                ],
                summary: {
                  base_rate: Number(baseRate.toFixed(2)),
                  spread_total_mxn: Number(spreadTotalMxn.toFixed(2)),
                  final_applied_rate: Number(finalAppliedRate.toFixed(2)),
                  shipping_total_mxn: Number(shippingCostMxn.toFixed(2)),
                },
              },
              product: item.product
                ? {
                    id: item.product.id,
                    name: item.product.name,
                    images,
                  }
                : null,
            };
          }),
        );

        const feesUsdByCatalogList = Array.from(feeUsdByCatalog.values()).map((f) => ({
          label: f.label,
          percent: Number(f.percent.toFixed(2)),
          amount_usd: Number(f.amount.toFixed(2)),
        }));
        const feesMxnWithoutByCatalogList = Array.from(feeMxnWithoutByCatalog.values()).map((f) => ({
          label: f.label,
          percent: Number(f.percent.toFixed(2)),
          amount_mxn: Number(f.amount.toFixed(2)),
        }));
        const feesMxnWithByCatalogList = Array.from(feeMxnWithByCatalog.values()).map((f) => ({
          label: f.label,
          percent: Number(f.percent.toFixed(2)),
          amount_mxn: Number(f.amount.toFixed(2)),
        }));

        const feesUsdTotal = feesUsdByCatalogList.reduce((acc, f) => acc + f.amount_usd, 0);
        const feesMxnWithoutTotal = feesMxnWithoutByCatalogList.reduce((acc, f) => acc + f.amount_mxn, 0);
        const feesMxnWithTotal = feesMxnWithByCatalogList.reduce((acc, f) => acc + f.amount_mxn, 0);
        const usdTotal = baseUsdTotal + feesUsdTotal;
        const subtotalWithout = baseMxnWithoutTotal + feesMxnWithoutTotal;
        const subtotalWith = baseMxnWithTotal + feesMxnWithTotal;

        return {
          id: order.id,
          tripId: order.tripId,
          clientId: order.clientId,
          customerName: order.client?.name ?? null,
          customerPhone: order.client?.phone ?? null,
          code: this.orderCode(order.id),
          status: order.status,
          grandTotalMxn: this.toNumber(order.grandTotalMxn),
          totals: {
            base_usd_total: Number(baseUsdTotal.toFixed(2)),
            fees_usd_by_catalog: feesUsdByCatalogList,
            fees_usd_total: Number(feesUsdTotal.toFixed(2)),
            total_usd: Number(usdTotal.toFixed(2)),
            without_fee_rates: {
              base_mxn_total: Number(baseMxnWithoutTotal.toFixed(2)),
              fees_mxn_by_catalog: feesMxnWithoutByCatalogList,
              fees_mxn_total: Number(feesMxnWithoutTotal.toFixed(2)),
              subtotal_mxn: Number(subtotalWithout.toFixed(2)),
              shipping_total_mxn: Number(shippingTotalMxn.toFixed(2)),
              total_mxn: Number((subtotalWithout + shippingTotalMxn).toFixed(2)),
            },
            with_fee_rates: {
              spread_total_mxn: Number(spreadTotalMxn.toFixed(2)),
              base_mxn_total: Number(baseMxnWithTotal.toFixed(2)),
              fees_mxn_by_catalog: feesMxnWithByCatalogList,
              fees_mxn_total: Number(feesMxnWithTotal.toFixed(2)),
              subtotal_mxn: Number(subtotalWith.toFixed(2)),
              shipping_total_mxn: Number(shippingTotalMxn.toFixed(2)),
              total_mxn: Number((subtotalWith + shippingTotalMxn).toFixed(2)),
            },
          },
          items,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        };
      }),
    );
  }

  /**
   * Crea una nueva orden vinculada a un viaje y un cliente
   */
  async create(dto: CreateOrderDto) {
    const [trip, client] = await Promise.all([
      this.prisma.trip.findUnique({ where: { id: dto.tripId }, select: { id: true } }),
      this.prisma.client.findUnique({ where: { id: dto.clientId }, select: { id: true } }),
    ]);

    if (!trip) throw new NotFoundException('Viaje no encontrado');
    if (!client) throw new NotFoundException('Cliente no encontrado');

    try {
      return await this.prisma.order.create({
        data: {
          tripId: dto.tripId,
          clientId: dto.clientId,
          status: 'DRAFT',
        },
      });
    } catch (error) {
      // Manejo de error si ya existe la combinación única tripId-clientId
      if (error?.code === 'P2002') {
        throw new ConflictException('Ya existe un pedido para este cliente en este viaje');
      }
      throw error;
    }
  }

  /**
   * Busca todas las órdenes (puedes añadir filtros aquí después)
   */
  async findAll(query: ListOrdersDto) {
    const tripId = query.tripId;
    if (!tripId) {
      throw new BadRequestException('tripId es obligatorio');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const q = query.q?.trim();
    const normalizedPhone = normalizePhone(q);
    const codeToken = this.getCodeSearchToken(q);

    const buildWhere = (withNormalizedPhone: boolean): Prisma.OrderWhereInput => {
      const where: Prisma.OrderWhereInput = { tripId };
      if (q) {
        const orFilters: Prisma.OrderWhereInput[] = [
          { client: { name: { contains: q, mode: 'insensitive' } } },
          { client: { phone: { contains: q, mode: 'insensitive' } } },
        ];
        if (withNormalizedPhone && normalizedPhone) {
          orFilters.push({ client: { phoneNormalized: { contains: normalizedPhone } } });
        }
        if (this.isUuid(codeToken)) {
          orFilters.push({ id: codeToken as string });
        }
        where.OR = orFilters;
      }
      return where;
    };

    let total: number;
    let orders: any[];
    try {
      const where = buildWhere(true);
      [total, orders] = await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            items: {
              include: {
                appliedProductFees: true,
                product: {
                  include: {
                    images: {
                      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                    },
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        }),
      ]);
    } catch (error: any) {
      // Compatibilidad cuando la columna phone_normalized aún no existe en DB.
      if (error?.code !== 'P2022') throw error;
      const where = buildWhere(false);
      [total, orders] = await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            items: {
              include: {
                appliedProductFees: true,
                product: {
                  include: {
                    images: {
                      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                    },
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        }),
      ]);
    }

    const data = await this.mapOrdersWithTotals(orders, tripId);

    return {
      data,
      meta: buildMeta(page, limit, total),
    };
  }

  async findByPhoneInTrip(tripId: string, phone: string) {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      throw new BadRequestException('Parámetro phone inválido');
    }

    let order: any;
    try {
      order = await this.prisma.order.findFirst({
        where: {
          tripId,
          client: { is: { phoneNormalized: normalized } },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      // Compatibilidad cuando la columna phone_normalized aún no existe en DB.
      if (error?.code !== 'P2022') throw error;

      order = await this.prisma.order.findFirst({
        where: {
          tripId,
          client: {
            is: {
              OR: [
                { phone: normalized },
                { phone: { contains: normalized } },
              ],
            },
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!order) {
      return {
        existsInTrip: false,
        client: null,
        orderId: null,
      };
    }

    return {
      existsInTrip: true,
      client: {
        id: order.client.id,
        name: order.client.name,
        phone: order.client.phone,
      },
      orderId: order.id,
    };
  }

  async findOne(id: string, tripId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tripId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        items: {
          include: {
            appliedProductFees: true,
            product: {
              include: {
                images: {
                  orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    const [mapped] = await this.mapOrdersWithTotals([order], tripId);
    return mapped;
  }

  async getAvailableProducts(orderId: string, query: AvailableProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, tripId: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.tripId !== query.tripId) {
      throw new BadRequestException('El pedido no pertenece al tripId enviado');
    }

    const usedItems = await this.prisma.orderItem.findMany({
      where: { orderId },
      select: { tripProductId: true, productId: true },
    });
    const usedTripProductIds = usedItems
      .map((x) => x.tripProductId)
      .filter(Boolean) as string[];
    const usedProductIds = usedItems
      .map((x) => x.productId)
      .filter(Boolean) as string[];

    const where: Prisma.TripProductWhereInput = {
      tripId: query.tripId,
      isActive: true,
      ...(usedTripProductIds.length > 0 ? { id: { notIn: usedTripProductIds } } : {}),
      ...(usedProductIds.length > 0 ? { productId: { notIn: usedProductIds } } : {}),
    };

    const [total, tripProducts, cfg, latestRate] = await Promise.all([
      this.prisma.tripProduct.count({ where }),
      this.prisma.tripProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            include: {
              images: {
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              },
              productType: { select: { id: true, name: true } },
              brand: { select: { name: true } },
              color: { select: { name: true } },
            },
          },
        },
      }),
      this.getPricingConfig(query.tripId),
      this.prisma.exchangeRate.findFirst({
        orderBy: { date: 'desc' },
        select: { rateMxn: true },
      }),
    ]);

    const baseRate = this.toNumber(latestRate?.rateMxn);

    const data = await Promise.all(
      tripProducts.map(async (tp) => {
        const basePriceUsd = this.toNumber(tp.basePriceUsd ?? tp.product.defaultPriceUsd);
        const shippingPerUnit = cfg.shippingByType.get(tp.product.productTypeId) ?? 0;

        const feesApplied = cfg.tripFees.map((fee) => {
          const percent = this.toNumber(fee.percentage);
          const amountUsd = basePriceUsd * (percent / 100);
          return {
            label: fee.nameSnapshot,
            percent: Number(percent.toFixed(2)),
            amount_usd: Number(amountUsd.toFixed(2)),
          };
        });
        const feesTotalUsd = feesApplied.reduce((acc, f) => acc + f.amount_usd, 0);
        const finalRate = baseRate + cfg.spreadTotalMxn;
        const subtotalWithout = (basePriceUsd + feesTotalUsd) * baseRate;
        const subtotalWith = (basePriceUsd + feesTotalUsd) * finalRate;

        const images = await Promise.all(
          tp.product.images.map(async (img) => ({
            id: img.id,
            url: await this.gcs.getSignedUrl(img.path, 60),
            isPrimary: img.isPrimary,
            sortOrder: img.sortOrder,
          })),
        );

        return {
          id: tp.id,
          tripId: tp.tripId,
          productId: tp.productId,
          productTypeId: tp.product.productTypeId,
          productName: tp.product.name,
          displayName: [
            tp.product.productType?.name,
            tp.product.brand?.name,
            tp.product.color?.name ? `Color: ${tp.product.color.name}` : null,
            tp.product.name,
          ].filter(Boolean).join(' '),
          basePriceUsd: Number(basePriceUsd.toFixed(2)),
          primaryImageUrl: images.find((i) => i.isPrimary)?.url ?? images[0]?.url ?? null,
          images,
          pricing_details: {
            base_price_usd: Number(basePriceUsd.toFixed(2)),
            fees_applied: feesApplied,
            exchange_rules_applied: [
              { kind: 'base_rate', value_mxn: Number(baseRate.toFixed(2)) },
              { kind: 'spread', value_mxn: Number(cfg.spreadTotalMxn.toFixed(2)) },
            ],
            shipping_applied: [{ enabled: shippingPerUnit > 0, value_mxn: Number(shippingPerUnit.toFixed(2)) }],
            summary: {
              base_rate: Number(baseRate.toFixed(2)),
              spread_total_mxn: Number(cfg.spreadTotalMxn.toFixed(2)),
              final_applied_rate: Number(finalRate.toFixed(2)),
              shipping_total_mxn: Number(shippingPerUnit.toFixed(2)),
              subtotal_mxn_without_fee_rates: Number(subtotalWithout.toFixed(2)),
              subtotal_mxn_with_fee_rates: Number(subtotalWith.toFixed(2)),
            },
          },
        };
      }),
    );

    return {
      data,
      meta: buildMeta(page, limit, total),
    };
  }

  async addItem(orderId: string, dto: AddOrderItemDto) {
    const qty = Math.max(1, Number(dto.quantity || 1));
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, tripId: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const tripProduct = await this.prisma.tripProduct.findUnique({
      where: { id: dto.tripProductId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            stock: true,
            defaultPriceUsd: true,
            productTypeId: true,
            productType: { select: { name: true } },
          },
        },
      },
    });
    if (!tripProduct) throw new NotFoundException('TripProduct no encontrado');
    if (tripProduct.tripId !== order.tripId) {
      throw new BadRequestException('El producto no pertenece al viaje del pedido');
    }

    const duplicate = await this.prisma.orderItem.findFirst({
      where: { orderId, tripProductId: dto.tripProductId },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('Este producto ya fue agregado al pedido');

    const unitBaseUsd = this.toNumber(tripProduct.basePriceUsd ?? tripProduct.product.defaultPriceUsd);
    if (!unitBaseUsd || unitBaseUsd <= 0) {
      throw new BadRequestException('Producto sin precio base USD');
    }
    if (tripProduct.product.stock < qty) {
      throw new BadRequestException('Stock insuficiente');
    }

    const shipping = await this.prisma.tripShippingRate.findUnique({
      where: {
        tripId_productTypeId: {
          tripId: order.tripId,
          productTypeId: tripProduct.product.productTypeId,
        },
      },
      select: { costMxn: true, enabled: true, nameSnapshot: true },
    });
    const shippingPerUnit = shipping?.enabled ? this.toNumber(shipping.costMxn) : 0;
    const shippingTotal = shippingPerUnit * qty;
    const fees = await this.prisma.tripProductFee.findMany({
      where: { tripId: order.tripId },
      select: { id: true, nameSnapshot: true, percentage: true },
    });

    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.orderItem.create({
        data: {
          orderId,
          tripProductId: tripProduct.id,
          productId: tripProduct.productId,
          quantity: qty,
          productName: tripProduct.product.name,
          basePriceUsd: new Prisma.Decimal(unitBaseUsd),
          productTypeId: tripProduct.product.productTypeId,
          productTypeSnapshot: tripProduct.product.productType?.name ?? null,
          shippingCostMxn: new Prisma.Decimal(shippingTotal),
          finalPriceMxn: new Prisma.Decimal(0),
        },
      });

      for (const fee of fees) {
        const percent = this.toNumber(fee.percentage);
        const amountUsd = unitBaseUsd * qty * (percent / 100);
        await tx.orderItemProductFee.create({
          data: {
            orderItemId: created.id,
            tripProductFeeId: fee.id,
            nameSnapshot: fee.nameSnapshot,
            percentageUsed: new Prisma.Decimal(percent),
            amountUsd: new Prisma.Decimal(amountUsd),
          },
        });
      }

      await tx.product.update({
        where: { id: tripProduct.productId },
        data: { stock: { decrement: qty } },
      });

      return created;
    });

    const detailed = await this.findOne(orderId, order.tripId);
    const newGrandTotal = detailed.totals?.with_fee_rates?.total_mxn ?? 0;
    await this.prisma.order.update({
      where: { id: orderId },
      data: { grandTotalMxn: new Prisma.Decimal(newGrandTotal) },
    });

    return {
      itemId: item.id,
      order: {
        ...detailed,
        grandTotalMxn: Number(newGrandTotal.toFixed(2)),
      },
    };
  }

  /**
   * Lógica compleja de desglose y cálculos financieros
   */
  async getOrderDetails(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        items: {
          include: { product: true } // Asumiendo que OrderItem tiene relación con Product
        } 
      },
    });

    if (!order) throw new NotFoundException('Order not found.');

    let totalProductsUSD = 0;
    let totalProductsMXNBase = 0;
    let totalProductsMXNApplied = 0;

    // Usamos 'items' que es el nombre real en tu schema.prisma
    for (const item of order.items) {
      const itemDetails = await this.getItemBreakdown(item.id);
      totalProductsUSD += itemDetails.breakdown.USD.subtotal_usd;
      totalProductsMXNBase += itemDetails.breakdown.MXN.base.subtotal_mxn_base;
      totalProductsMXNApplied += itemDetails.breakdown.MXN.applied.subtotal_mxn_applied;
    }

    const totalShippingCost = await this.getShippingCost(order.id);

    const grandTotalMXNBase = totalProductsMXNBase + totalShippingCost;
    const grandTotalMXNApplied = totalProductsMXNApplied + totalShippingCost;

    return {
      orderId: order.id,
      status: order.status,
      exchangeRate: {
        base: order.exchangeRateBase,
        additional: order.exchangeRateAdd,
      },
      totalProducts: {
        cost_usd: totalProductsUSD,
        cost_mxn_base: totalProductsMXNBase,
        cost_mxn_applied: totalProductsMXNApplied,
      },
      totalShipping: totalShippingCost,
      grandTotal: {
        base: grandTotalMXNBase,
        applied: grandTotalMXNApplied,
      },
    };
  }

  /**
   * Actualiza el estado o datos de la orden
   */
  async update(id: string, dto: UpdateOrderDto) {
    const exists = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Orden con ID ${id} no encontrada`);

    return this.prisma.order.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Elimina una orden
   */
  async remove(id: string) {
    const exists = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Orden con ID ${id} no encontrada`);

    return this.prisma.order.delete({ where: { id } });
  }

  // --- MÉTODOS PRIVADOS PARA CÁLCULOS ---

  private async getItemBreakdown(itemId: string) {
    void itemId;
    // Aquí implementas la lógica de conversión de moneda por item
    // Por ahora retorno una estructura base para que no falle tu loop
    return {
      breakdown: {
        USD: { subtotal_usd: 0 },
        MXN: { 
          base: { subtotal_mxn_base: 0 },
          applied: { subtotal_mxn_applied: 0 }
        }
      }
    };
  }

  private async getShippingCost(orderId: string) {
    void orderId;
    // Lógica para obtener costos de envío vinculados a la orden
    return 0;
  }
}
