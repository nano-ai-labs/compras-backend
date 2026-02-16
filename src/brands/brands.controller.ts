import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { BrandsService } from './brands.service';

@UseGuards(JwtAuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.brands.search(q ?? '', Number(limit ?? 10));
  }
}
