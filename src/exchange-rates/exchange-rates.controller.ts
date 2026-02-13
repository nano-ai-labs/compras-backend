import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { JwtAuthGuard } from '../auth/jwt.guard'; // ✅ Ruta corregida según tu TripsController

@Controller('exchange-rates')
@UseGuards(JwtAuthGuard) // 🛡️ Ahora sí coincide con el resto de tu app
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Post('sync')
  async syncRate(@Body('rate') rate: number) {
    return this.exchangeRatesService.saveRateIfNew(rate);
  }

  @Get('today')
  async getToday() {
    return this.exchangeRatesService.getTodayRate();
  }
}

