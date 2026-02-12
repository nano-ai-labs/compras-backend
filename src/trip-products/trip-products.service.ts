import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripProductDto } from './dto/create-trip-product.dto';

@Injectable()
export class TripProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async addProductToTrip(data: CreateTripProductDto) {
    const { tripId, productId, base_price_usd } = data;

    // Verificar si el producto ya existe en el viaje
    const existing = await this.prisma.trip_products.findUnique({
      where: { trip_id_product_id: { trip_id: tripId, product_id: productId } },
    });

    if (existing) {
      throw new Error('El producto ya está agregado a este viaje.');
    }

    // Obtener precio por defecto si no se proporciona
    const product = await this.prisma.products.findUnique({ where: { id: productId } });
    const price = base_price_usd || product.default_price_usd;

    return await this.prisma.trip_products.create({
      data: {
        trip_id: tripId,
        product_id: productId,
        base_price_usd: price,
      },
    });
  }
}