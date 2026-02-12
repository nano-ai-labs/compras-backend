import { Controller, Post, Body } from '@nestjs/common';
import { OrderPaymentsService } from './order-payments.service';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';

@Controller('order-payments')
export class OrderPaymentsController {
  constructor(private readonly orderPaymentsService: OrderPaymentsService) {}

  @Post()
  create(@Body() createOrderPaymentDto: CreateOrderPaymentDto) {
    return this.orderPaymentsService.recordPayment(createOrderPaymentDto);
  }
}