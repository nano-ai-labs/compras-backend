import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
      });

      if (!product || product.stock < dto.quantity) {
        throw new BadRequestException('Stock insuficiente');
      }

      // Convierte a Decimal para que Prisma no se queje con tipos
      const qty = Number(dto.quantity ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new BadRequestException('Cantidad inválida');
      }

      const unitPriceMxn = product.priceMxn; // Decimal (Prisma)
      const finalPriceMxn = unitPriceMxn.mul(new Prisma.Decimal(qty));

      const item = await tx.orderItem.create({
        data: {
          orderId: dto.orderId,
          productId: dto.productId,
          quantity: qty,
          unitPriceMxn: unitPriceMxn,

          // ✅ Campos obligatorios de OrderItem en tu schema
          productName: product.name,
          originalUsdPrice: new Prisma.Decimal(0),
          exchangeRateUsed: new Prisma.Decimal(0),
          finalPriceMxn: finalPriceMxn,
        },
      });

      await tx.product.update({
        where: { id: dto.productId },
        data: { stock: { decrement: qty } },
      });

      return item;
    });
  }

  findByOrder(orderId: string) {
    return this.prisma.orderItem.findMany({
      where: { orderId },
      include: { product: true },
    });
  }

  remove(id: string) {
    return this.prisma.orderItem.delete({ where: { id } });
  }
}
