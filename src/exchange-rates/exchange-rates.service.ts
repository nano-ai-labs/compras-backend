import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExchangeRatesService {
  constructor(private readonly prisma: PrismaService) {}

  // Para el GET: Solo busca en la DB lo de hoy
  async getTodayFromDb() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return this.prisma.exchangeRate.findUnique({
      where: { date: today },
    });
  }

  // Para el POST: Guarda el precio que le mande el Frontend
  async saveRate(rate: number) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Verificamos si ya existe para no duplicar por error
    const existing = await this.prisma.exchangeRate.findUnique({
      where: { date: today },
    });

    if (existing) return existing;

    return this.prisma.exchangeRate.create({
      data: {
        date: today,
        rateMxn: rate,
        source: 'Frontend Sync (Banorte/Frankfurt)',
      },
    });
  }
}
