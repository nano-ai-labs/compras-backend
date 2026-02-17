import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AttachTripProductDto } from './dto/attach-trip-product.dto';
import { GcsService } from '../storage/gcs.service';
import { buildMeta } from '../common/pagination';
import { UpdateTripProductDto } from './dto/update-trip-product.dto';

@Injectable()
export class TripProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gcs: GcsService,
  ) {}

  private toNumber(v: Prisma.Decimal | number | null | undefined): number {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    return v.toNumber();
  }

  private round2(n: number): number {
    return Number(n.toFixed(2));
  }

  private getTodayUtcDate() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }

  private buildDisplayName({
    productTypeName,
    brandName,
    colorName,
    productName,
  }: {
    productTypeName?: string | null;
    brandName?: string | null;
    colorName?: string | null;
    productName: string;
  }) {
    const parts = [
      productTypeName?.trim(),
      brandName?.trim(),
      colorName ? `Color: ${colorName.trim()}` : null,
      productName?.trim(),
    ].filter(Boolean);

    return parts.join(' ');
  }

  private async signImages(
    images: Array<{ id: string; path: string; sortOrder: number; isPrimary: boolean }>,
  ) {
    return Promise.all(
      images.map(async (img) => ({
        id: img.id,
        url: await this.gcs.getSignedUrl(img.path, 60),
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })),
    );
  }

  private buildPricingDetails(args: {
    basePriceUsd: Prisma.Decimal | number | null | undefined;
    fees: Array<{ catalogId: string; nameSnapshot: string; percentage: Prisma.Decimal }>;
    spreads: Array<{ catalogId: string; nameSnapshot: string; valueAdded: Prisma.Decimal }>;
    baseRate: Prisma.Decimal | number | null | undefined;
    shippingRate: {
      productTypeId: string;
      nameSnapshot: string;
      costMxn: Prisma.Decimal;
      enabled: boolean;
    } | null;
  }) {
    const basePrice = this.round2(this.toNumber(args.basePriceUsd));

    const feesApplied = args.fees.map((f) => {
      const value = this.toNumber(f.percentage);
      const amountUsd = this.round2((basePrice * value) / 100);
      return {
        catalogId: f.catalogId,
        label: f.nameSnapshot,
        value: this.round2(value),
        type: 'percentage' as const,
        amount_usd: amountUsd,
      };
    });

    const feesTotalUsd = this.round2(
      feesApplied.reduce((acc, f) => acc + f.amount_usd, 0),
    );
    const totalUsd = this.round2(basePrice + feesTotalUsd);

    const baseRateValue = this.round2(this.toNumber(args.baseRate));
    const spreadsApplied = args.spreads.map((r) => ({
      catalogId: r.catalogId,
      label: r.nameSnapshot,
      value_mxn: this.round2(this.toNumber(r.valueAdded)),
      kind: 'spread' as const,
    }));

    const spreadTotalMxn = this.round2(
      spreadsApplied.reduce((acc, r) => acc + r.value_mxn, 0),
    );
    const finalAppliedRate = this.round2(baseRateValue + spreadTotalMxn);
    const subtotalMxn = this.round2(totalUsd * finalAppliedRate);

    const shippingApplied = args.shippingRate
      ? [
          {
            productTypeId: args.shippingRate.productTypeId,
            label: args.shippingRate.nameSnapshot,
            value_mxn: this.round2(this.toNumber(args.shippingRate.costMxn)),
            enabled: args.shippingRate.enabled,
          },
        ]
      : [];

    const shippingTotalMxn = this.round2(
      shippingApplied
        .filter((s) => s.enabled)
        .reduce((acc, s) => acc + s.value_mxn, 0),
    );

    return {
      base_price_usd: basePrice,
      fees_applied: feesApplied,
      exchange_rules_applied: [
        {
          catalogId: 'base-rate',
          label: 'Tasa Base',
          value_mxn: baseRateValue,
          kind: 'base_rate',
        },
        ...spreadsApplied,
      ],
      shipping_applied: shippingApplied,
      summary: {
        fees_total_usd: feesTotalUsd,
        total_usd: totalUsd,
        base_rate: baseRateValue,
        spread_total_mxn: spreadTotalMxn,
        final_applied_rate: finalAppliedRate,
        subtotal_mxn: subtotalMxn,
        shipping_total_mxn: shippingTotalMxn,
        total_mxn: this.round2(subtotalMxn + shippingTotalMxn),
      },
    };
  }

  async findByTrip(
    tripId: string,
    page = 1,
    limit = 20,
  ) {
    if (!tripId) throw new BadRequestException('tripId requerido');

    const [trip, total, rows, fees, spreads, shippingRates, todayRate] =
      await Promise.all([
        this.prisma.trip.findUnique({ where: { id: tripId }, select: { id: true } }),
        this.prisma.tripProduct.count({ where: { tripId } }),
        this.prisma.tripProduct.findMany({
          where: { tripId },
          skip: (page - 1) * limit,
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
        this.prisma.tripProductFee.findMany({
          where: { tripId },
          orderBy: { createdAt: 'asc' },
          select: { catalogId: true, nameSnapshot: true, percentage: true },
        }),
        this.prisma.tripExchangeRule.findMany({
          where: { tripId },
          orderBy: { createdAt: 'asc' },
          select: { catalogId: true, nameSnapshot: true, valueAdded: true },
        }),
        this.prisma.tripShippingRate.findMany({
          where: { tripId },
          select: { productTypeId: true, nameSnapshot: true, costMxn: true, enabled: true },
        }),
        this.prisma.exchangeRate.findUnique({
          where: { date: this.getTodayUtcDate() },
          select: { rateMxn: true },
        }),
      ]);

    if (!trip) throw new NotFoundException('Trip no encontrado');

    const shippingMap = new Map(
      shippingRates.map((r) => [r.productTypeId, r]),
    );

    const data = await Promise.all(
      rows.map(async (tp) => {
        const images = await this.signImages(tp.product.images);
        const pricingDetails = this.buildPricingDetails({
          basePriceUsd: tp.basePriceUsd ?? tp.product.defaultPriceUsd,
          fees,
          spreads,
          baseRate: todayRate?.rateMxn,
          shippingRate: shippingMap.get(tp.product.productTypeId) ?? null,
        });

        return {
          id: tp.id,
          tripId: tp.tripId,
          productId: tp.productId,
          productName: tp.product.name,
          displayName: this.buildDisplayName({
            productTypeName: tp.product.productType?.name,
            brandName: tp.product.brand?.name,
            colorName: tp.product.color?.name,
            productName: tp.product.name,
          }),
          basePriceUsd: pricingDetails.base_price_usd,
          primaryImageUrl: images.find((i) => i.isPrimary)?.url ?? images[0]?.url ?? null,
          images,
          pricing_details: pricingDetails,
        };
      }),
    );

    return {
      data,
      meta: buildMeta(page, limit, total),
    };
  }

  async attach(tripId: string, dto: AttachTripProductDto) {
    if (!tripId) throw new BadRequestException('tripId requerido');

    const [trip, product] = await Promise.all([
      this.prisma.trip.findUnique({ where: { id: tripId } }),
      this.prisma.product.findUnique({
        where: { id: dto.productId },
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
          productType: { select: { id: true, name: true } },
          brand: { select: { name: true } },
          color: { select: { name: true } },
        },
      }),
    ]);

    if (!trip) throw new NotFoundException('Trip no encontrado');
    if (!product) throw new NotFoundException('Producto no encontrado');

    const basePriceUsd =
      dto.basePriceUsd && !Number.isNaN(Number(dto.basePriceUsd))
        ? new Prisma.Decimal(dto.basePriceUsd)
        : product.defaultPriceUsd ?? null;

    // ✅ @@unique([tripId, productId]) => si existe Prisma lanzará P2002
    const attached = await this.prisma.tripProduct.create({
      data: {
        tripId,
        productId: dto.productId,
        isActive: true,
        basePriceUsd: basePriceUsd ?? null,
      },
      select: { id: true, tripId: true },
    });

    const [fees, spreads, shippingRate, todayRate] = await Promise.all([
      this.prisma.tripProductFee.findMany({
        where: { tripId },
        orderBy: { createdAt: 'asc' },
        select: {
          catalogId: true,
          nameSnapshot: true,
          percentage: true,
        },
      }),
      this.prisma.tripExchangeRule.findMany({
        where: { tripId },
        orderBy: { createdAt: 'asc' },
        select: {
          catalogId: true,
          nameSnapshot: true,
          valueAdded: true,
        },
      }),
      this.prisma.tripShippingRate.findUnique({
        where: {
          tripId_productTypeId: {
            tripId,
            productTypeId: product.productTypeId,
          },
        },
        select: {
          productTypeId: true,
          nameSnapshot: true,
          costMxn: true,
          enabled: true,
        },
      }),
      this.prisma.exchangeRate.findUnique({
        where: { date: this.getTodayUtcDate() },
        select: { rateMxn: true },
      }),
    ]);

    const images = await this.signImages(product.images);
    const pricingDetails = this.buildPricingDetails({
      basePriceUsd,
      fees,
      spreads,
      baseRate: todayRate?.rateMxn,
      shippingRate,
    });

    return {
      tripProductId: attached.id,
      tripId: attached.tripId,
      product: {
        id: product.id,
        name: product.name,
        displayName: this.buildDisplayName({
          productTypeName: product.productType?.name,
          brandName: product.brand?.name,
          colorName: product.color?.name,
          productName: product.name,
        }),
        productTypeId: product.productTypeId,
        images,
      },
      pricing_details: pricingDetails,
    };
  }

  async update(
    tripId: string,
    tripProductId: string,
    dto: UpdateTripProductDto,
  ) {
    const current = await this.prisma.tripProduct.findFirst({
      where: { id: tripProductId, tripId },
      include: {
        product: {
          include: {
            images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
            productType: { select: { id: true, name: true } },
            brand: { select: { name: true } },
            color: { select: { name: true } },
          },
        },
      },
    });
    if (!current) throw new NotFoundException('TripProduct no encontrado');

    const data: Prisma.TripProductUpdateInput = {};
    if (dto.basePriceUsd !== undefined) {
      if (dto.basePriceUsd === '' || Number.isNaN(Number(dto.basePriceUsd))) {
        throw new BadRequestException('basePriceUsd inválido');
      }
      data.basePriceUsd = new Prisma.Decimal(dto.basePriceUsd);
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive === 'true';
    }

    await this.prisma.tripProduct.update({
      where: { id: tripProductId },
      data,
    });

    return this.findByTripProductId(tripId, tripProductId);
  }

  async remove(tripId: string, tripProductId: string) {
    const exists = await this.prisma.tripProduct.findFirst({
      where: { id: tripProductId, tripId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('TripProduct no encontrado');

    await this.prisma.tripProduct.delete({
      where: { id: tripProductId },
    });

    return { deleted: true, id: tripProductId, tripId };
  }

  async findByTripProductId(tripId: string, tripProductId: string) {
    const [row, fees, spreads, shippingRates, todayRate] = await Promise.all([
      this.prisma.tripProduct.findFirst({
        where: { id: tripProductId, tripId },
        include: {
          product: {
            include: {
              images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
              productType: { select: { id: true, name: true } },
              brand: { select: { name: true } },
              color: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.tripProductFee.findMany({
        where: { tripId },
        orderBy: { createdAt: 'asc' },
        select: { catalogId: true, nameSnapshot: true, percentage: true },
      }),
      this.prisma.tripExchangeRule.findMany({
        where: { tripId },
        orderBy: { createdAt: 'asc' },
        select: { catalogId: true, nameSnapshot: true, valueAdded: true },
      }),
      this.prisma.tripShippingRate.findMany({
        where: { tripId },
        select: { productTypeId: true, nameSnapshot: true, costMxn: true, enabled: true },
      }),
      this.prisma.exchangeRate.findUnique({
        where: { date: this.getTodayUtcDate() },
        select: { rateMxn: true },
      }),
    ]);

    if (!row) throw new NotFoundException('TripProduct no encontrado');

    const shippingMap = new Map(shippingRates.map((s) => [s.productTypeId, s]));
    const images = await this.signImages(row.product.images);
    const pricingDetails = this.buildPricingDetails({
      basePriceUsd: row.basePriceUsd ?? row.product.defaultPriceUsd,
      fees,
      spreads,
      baseRate: todayRate?.rateMxn,
      shippingRate: shippingMap.get(row.product.productTypeId) ?? null,
    });

    return {
      id: row.id,
      tripId: row.tripId,
      productId: row.productId,
      productName: row.product.name,
      displayName: this.buildDisplayName({
        productTypeName: row.product.productType?.name,
        brandName: row.product.brand?.name,
        colorName: row.product.color?.name,
        productName: row.product.name,
      }),
      basePriceUsd: pricingDetails.base_price_usd,
      primaryImageUrl: images.find((i) => i.isPrimary)?.url ?? images[0]?.url ?? null,
      images,
      pricing_details: pricingDetails,
    };
  }
}
