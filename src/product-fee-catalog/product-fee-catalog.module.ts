import { Module } from '@nestjs/common';
import { ProductFeeCatalogController } from './product-fee-catalog.controller';
import { ProductFeeCatalogService } from './product-fee-catalog.service';

@Module({
  controllers: [ProductFeeCatalogController],
  providers: [ProductFeeCatalogService],
})
export class ProductFeeCatalogModule {}