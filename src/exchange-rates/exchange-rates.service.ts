import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExchangeRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTodayRate() {
    // Definimos el inicio del día en UTC para evitar desfases
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

    // Si ya existe registro de hoy, lo devolvemos sin crear otro
    if (existingRate) return existingRate;

    // Si no existe, lo creamos
    return this.prisma.exchangeRate.create({
      data: {
        date: today,
        rateMxn: rate,
        source: 'Banorte - Automatic Sync',
      },
    });
  }
}
