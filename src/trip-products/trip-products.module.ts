import { Module } from '@nestjs/common';
import { TripProductsController } from './trip-products.controller';
import { TripProductsService } from './trip-products.service';
import { GcsService } from '../storage/gcs.service';

@Module({
  controllers: [TripProductsController],
  providers: [TripProductsService, GcsService],
})
export class TripProductsModule {}
