import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ColorsService } from './colors.service';

@UseGuards(JwtAuthGuard)
@Controller('colors')
export class ColorsController {
  constructor(private readonly colors: ColorsService) {}

  @Get('search')
  search(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.colors.search(q ?? '', Number(limit ?? 10));
  }
}
