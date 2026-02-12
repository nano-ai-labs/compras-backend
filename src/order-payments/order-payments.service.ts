import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { Decimal } from '@prisma/client/runtime';

@Injectable()
export class OrderPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordPayment(data: CreateOrderPaymentDto) {
    const { orderId, amountMxn } = data;

    // Verificar si el pedido existe
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found.');

    const totalPayments = await this.prisma.orderPayment.aggregate({
      where: { orderId },
      _sum: { amountMxn: true },
    });

    const newTotal = totalPayments._sum.amountMxn ? totalPayments._sum.amountMxn.add(new Decimal(amountMxn)) : new Decimal(amountMxn);

    // Crear el pago
    await this.prisma.orderPayment.create({
      data: {
        orderId,
        amountMxn: new Decimal(amountMxn),
      },
    });

    // Actualizar el monto total pagado y el estado del pedido
    await this.prisma.order.update({
      where: { id: orderId },
      data: { paidTotalMxn: newTotal },
    });

    // Verificar si se debe actualizar el estado del pedido
    if (newTotal.gte(order.grandTotalMxn)) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });
    }
  }
}