import { Controller, Get, UseGuards } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get('today')
  async getToday() {
    const result = await this.exchangeRatesService.getOrUpdateTodayRate();
    // Devolvemos el formato que el frontend espera
    return { ok: true, usd_mxn: result.rateMxn };
  }
}
