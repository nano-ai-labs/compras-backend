import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ProductVariantsService } from './product-variants.service';

@UseGuards(JwtAuthGuard)
@Controller('product-variants')
export class ProductVariantsController {
  constructor(private readonly variants: ProductVariantsService) {}

  @Get('search')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  search(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('productTypeId') productTypeId?: string,
  ) {
    return this.variants.search(q ?? '', Number(limit ?? 10), productTypeId);
  }
}
