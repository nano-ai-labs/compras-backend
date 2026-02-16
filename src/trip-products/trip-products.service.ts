import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AttachTripProductDto } from './dto/attach-trip-product.dto';

@Injectable()
export class TripProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async attach(tripId: string, dto: AttachTripProductDto): Promise<void> {
    if (!tripId) throw new BadRequestException('tripId requerido');

    const [trip, product] = await Promise.all([
      this.prisma.trip.findUnique({ where: { id: tripId } }),
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
    ]);

    if (!trip) throw new NotFoundException('Trip no encontrado');
    if (!product) throw new NotFoundException('Producto no encontrado');

    const basePriceUsd =
      dto.basePriceUsd && !Number.isNaN(Number(dto.basePriceUsd))
        ? new Prisma.Decimal(dto.basePriceUsd)
        : product.defaultPriceUsd ?? null;

    // ✅ @@unique([tripId, productId]) => si existe Prisma lanzará P2002
    await this.prisma.tripProduct.create({
      data: {
        tripId,
        productId: dto.productId,
        isActive: true,
        basePriceUsd: basePriceUsd ?? null,
      },
    });
  }
}
