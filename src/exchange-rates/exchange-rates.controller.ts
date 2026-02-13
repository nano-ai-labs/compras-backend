import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Asegúrate que la ruta sea correcta

@Controller('exchange-rates')
@UseGuards(JwtAuthGuard) // 🛡️ Solo usuarios logueados pueden sincronizar
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
