import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExchangeRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTodayRate() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return this.prisma.exchangeRate.findUnique({
      where: { date: today },
    });
  }

  async saveRateIfNew(rate: number) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const existingRate = await this.prisma.exchangeRate.findUnique({
      where: { date: today },
    });

    if (existingRate) return existingRate;

    return this.prisma.exchangeRate.create({
      data: {
        date: today,
        rateMxn: rate,
        source: 'Banorte - Automatic',
      },
    });
  }
}
