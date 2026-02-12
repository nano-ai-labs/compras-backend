import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripProductDto } from './dto/create-trip-product.dto';

@Injectable()
export class TripProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async addProductToTrip(dto: CreateTripProductDto) {
    const { tripId, productId, base_price_usd } = dto;

    const existing = await this.prisma.tripProduct.findUnique({
      where: { tripId_productId: { tripId, productId } },
    });

    if (existing) {
      throw new BadRequestException('Este producto ya existe en el viaje.');
    }

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const finalPrice = base_price_usd ?? product.defaultPriceUsd ?? 0;

    return await this.prisma.tripProduct.create({
      data: {
        tripId,
        productId,
        // CHANGED: Most likely 'basePriceUsd' based on standard Prisma naming
        basePriceUsd: finalPrice, 
      },
    });
  }
}