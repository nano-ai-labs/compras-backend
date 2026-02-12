import { Module } from '@nestjs/common';
import { OrderPaymentsController } from './order-payments.controller';
import { OrderPaymentsService } from './order-payments.service';

@Module({
  controllers: [OrderPaymentsController],
  providers: [OrderPaymentsService],
})
export class OrderPaymentsModule {}