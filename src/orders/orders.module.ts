import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { TripOrdersController } from './trip-orders.controller';
import { GcsService } from '../storage/gcs.service';

@Module({
  controllers: [OrdersController, TripOrdersController],
  providers: [OrdersService, GcsService],
})
export class OrdersModule {}
