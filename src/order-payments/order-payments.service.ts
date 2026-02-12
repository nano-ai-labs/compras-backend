import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { Decimal } from '@prisma/client/runtime';

@Injectable()
export class OrderPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordPayment(data: CreateOrderPaymentDto) {
    const { order_id, amount_mxn } = data;

    // Verificar si el pedido existe
    const order = await this.prisma.orders.findUnique({ where: { id: order_id } });
    if (!order) throw new Error('Order not found.');

    const totalPayments = await this.prisma.order_payments.aggregate({
      where: { order_id },
      _sum: { amount_mxn: true },
    });

    const newTotal = totalPayments._sum.amount_mxn ? totalPayments._sum.amount_mxn.add(new Decimal(amount_mxn)) : new Decimal(amount_mxn);

    // Crear el pago
    await this.prisma.order_payments.create({
      data: {
        order_id,
        amount_mxn: new Decimal(amount_mxn),
      },
    });

    // Actualizar el monto total pagado y el estado del pedido
    await this.prisma.orders.update({
      where: { id: order_id },
      data: { paid_total_mxn: newTotal },
    });

    // Verificar si se debe actualizar el estado del pedido
    if (newTotal.gte(order.grand_total_mxn)) {
      await this.prisma.orders.update({
        where: { id: order_id },
        data: { status: 'PAID' },
      });
    }
  }
}