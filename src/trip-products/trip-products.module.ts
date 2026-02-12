import { Module } from '@nestjs/common';
import { TripProductsController } from './trip-products.controller';
import { TripProductsService } from './trip-products.service';

@Module({
  controllers: [TripProductsController],
  providers: [TripProductsService],
})
export class TripProductsModule {}