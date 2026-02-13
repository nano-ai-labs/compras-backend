import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { JwtAuthGuard } from '../auth/jwt.guard'; // 🔑 Tu guard que ya funciona

@UseGuards(JwtAuthGuard)
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  // Este lo llama el SiteLayout (Server Component)
  @Get('today')
  async getToday() {
    return this.service.getTodayFromDb();
  }

  // Este lo llama el SiteLayoutClient (vía /api/fx)
  @Post('sync')
  async sync(@Body('rate') rate: number) {
    return this.service.saveRate(rate);
  }
}
