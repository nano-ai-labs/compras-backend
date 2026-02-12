import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { Prisma } from '@prisma/client'; // Importamos Prisma para acceder a Decimal

@Injectable()
export class OrderPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordPayment(dto: CreateOrderPaymentDto) {
    const { orderId, amountMxn } = dto;

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found.');

    const totalPayments = await this.prisma.orderPayment.aggregate({
      where: { orderId },
      _sum: { amountMxn: true },
    });

    // Usamos Prisma.Decimal para instanciar valores
    const currentTotal = totalPayments._sum.amountMxn || new Prisma.Decimal(0);
    const amountToAdd = new Prisma.Decimal(amountMxn);
    const newTotal = currentTotal.add(amountToAdd);

    return await this.prisma.$transaction(async (tx) => {
      await tx.orderPayment.create({
        data: {
          orderId,
          amountMxn: amountToAdd,
          method: dto.method || 'CASH',
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        },
      });

      const isPaid = newTotal.gte(order.grandTotalMxn);

      return await tx.order.update({
        where: { id: orderId },
        data: { 
          paidTotalMxn: newTotal,
          status: isPaid ? 'PAID' : order.status
        },
      });
    });
  }
}