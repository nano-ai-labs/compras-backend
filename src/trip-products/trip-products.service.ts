import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripProductDto } from './dto/create-trip-product.dto';

@Injectable()
export class TripProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async addProductToTrip(data: CreateTripProductDto) {
    const { tripId, productId, base_price_usd } = data;

    // Verificar si el producto ya existe en el viaje
    const existing = await this.prisma.tripProduct.findUnique({
      where: { tripId_productId: { tripId: tripId, productId: productId } },
    });

    if (existing) {
      throw new Error('El producto ya está agregado a este viaje.');
    }

    // Obtener precio por defecto si no se proporciona
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    const price = base_price_usd || product.defaultPriceUsd;

    return await this.prisma.tripProduct.create({
      data: {
        tripId: tripId,
        productId: productId,
        base_price_usd: price,
      },
    });
  }
}