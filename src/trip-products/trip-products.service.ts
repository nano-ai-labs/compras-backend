import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AttachTripProductDto } from './dto/attach-trip-product.dto';
import { GcsService } from '../storage/gcs.service';

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
        where: {
          date: (() => {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            return today;
          })(),
        },
        select: { rateMxn: true },
      }),
    ]);

    const basePrice = this.round2(this.toNumber(basePriceUsd));

    const feesApplied = fees.map((f) => {
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

    const baseRate = this.round2(this.toNumber(todayRate?.rateMxn));
    const spreadsApplied = spreads.map((r) => ({
      catalogId: r.catalogId,
      label: r.nameSnapshot,
      value_mxn: this.round2(this.toNumber(r.valueAdded)),
      kind: 'spread' as const,
    }));

    const spreadTotalMxn = this.round2(
      spreadsApplied.reduce((acc, r) => acc + r.value_mxn, 0),
    );
    const finalAppliedRate = this.round2(baseRate + spreadTotalMxn);
    const subtotalMxn = this.round2(totalUsd * finalAppliedRate);

    const shippingApplied = shippingRate
      ? [
          {
            productTypeId: shippingRate.productTypeId,
            label: shippingRate.nameSnapshot,
            value_mxn: this.round2(this.toNumber(shippingRate.costMxn)),
            enabled: shippingRate.enabled,
          },
        ]
      : [];

    const shippingTotalMxn = this.round2(
      shippingApplied
        .filter((s) => s.enabled)
        .reduce((acc, s) => acc + s.value_mxn, 0),
    );

    const images = await Promise.all(
      product.images.map(async (img) => ({
        id: img.id,
        url: await this.gcs.getSignedUrl(img.path, 60),
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })),
    );

    const displayName = [
      product.productType?.name,
      product.brand?.name,
      product.color?.name,
      product.name,
    ]
      .filter(Boolean)
      .join(' + ');

    return {
      tripProductId: attached.id,
      tripId: attached.tripId,
      product: {
        id: product.id,
        name: product.name,
        displayName,
        productTypeId: product.productTypeId,
        images,
      },
      pricing_details: {
        base_price_usd: basePrice,
        fees_applied: feesApplied,
        exchange_rules_applied: [
          {
            catalogId: 'base-rate',
            label: 'Tasa Base',
            value_mxn: baseRate,
            kind: 'base_rate',
          },
          ...spreadsApplied,
        ],
        shipping_applied: shippingApplied,
        summary: {
          fees_total_usd: feesTotalUsd,
          total_usd: totalUsd,
          base_rate: baseRate,
          spread_total_mxn: spreadTotalMxn,
          final_applied_rate: finalAppliedRate,
          subtotal_mxn: subtotalMxn,
          shipping_total_mxn: shippingTotalMxn,
          total_mxn: this.round2(subtotalMxn + shippingTotalMxn),
        },
      },
    };
  }
}
