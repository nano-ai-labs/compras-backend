import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const qty = Number(dto.quantity ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new BadRequestException('Cantidad inválida');
      }

      if (!dto.orderId || !dto.productId) {
        throw new BadRequestException('orderId y productId son obligatorios');
      }

      // 1) Cargar pedido para conocer tripId (para shipping por tipo)
      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
        select: { id: true, tripId: true },
      });
      if (!order) throw new NotFoundException('Pedido no existe');

      // 2) Cargar producto + tipo
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
        select: {
          id: true,
          name: true,
          stock: true,
          defaultPriceUsd: true,
          productTypeId: true,
          productType: { select: { name: true } },
        },
      });

      if (!product) throw new NotFoundException('Producto no existe');

      // Stock
      if (product.stock < qty) {
        throw new BadRequestException('Stock insuficiente');
      }

      // 3) Determinar precio USD base (override por viaje si existe)
      //    Preferimos trip_products.base_price_usd si está configurado para ese viaje
      const tripProduct = await tx.tripProduct.findUnique({
        where: {
          tripId_productId: { tripId: order.tripId, productId: product.id },
        },
        select: { id: true, basePriceUsd: true, isActive: true },
      });

      if (tripProduct && !tripProduct.isActive) {
        throw new BadRequestException('Este producto está inactivo para el viaje');
      }

      const basePriceUsd =
        tripProduct?.basePriceUsd ?? product.defaultPriceUsd;

      if (basePriceUsd == null) {
        throw new BadRequestException('El producto no tiene precio USD configurado');
      }

      // 4) Shipping por tipo de producto (configurable por viaje)
      let shippingCostMxn = new Prisma.Decimal(0);
      let productTypeSnapshot: string | null = null;

      if (product.productTypeId) {
        const rate = await tx.tripShippingRate.findUnique({
          where: {
            tripId_productTypeId: {
              tripId: order.tripId,
              productTypeId: product.productTypeId,
            },
          },
          select: { costMxn: true, enabled: true, nameSnapshot: true },
        });

        if (rate?.enabled) {
          shippingCostMxn = rate.costMxn;
        }

        // snapshot del tipo (para que si renombrás el catálogo no afecte el item)
        productTypeSnapshot = product.productType?.name ?? rate?.nameSnapshot ?? null;
      }

      // 5) Crear item: finalPriceMxn = 0 hasta lock del pedido (primer pago)
      const item = await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          tripProductId: tripProduct?.id ?? null,

          quantity: qty,

          productName: product.name,
          basePriceUsd: basePriceUsd,

          productTypeId: product.productTypeId ?? null,
          productTypeSnapshot: productTypeSnapshot,

          shippingCostMxn: shippingCostMxn,
          finalPriceMxn: new Prisma.Decimal(0), // se calcula al lock
        },
        include: { product: true },
      });

      // 6) Descontar stock
      await tx.product.update({
        where: { id: product.id },
        data: { stock: { decrement: qty } },
      });

      return item;
    });
  }

  findByOrder(orderId: string) {
    return this.prisma.orderItem.findMany({
      where: { orderId },
      include: {
        product: true,
        tripProduct: true,
        appliedProductFees: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({
        where: { id },
        select: { id: true, productId: true, quantity: true },
      });
      if (!item) throw new NotFoundException('Item no existe');

      // Regresar stock al eliminar item
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return tx.orderItem.delete({ where: { id } });
    });
  }
}
