import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExchangeRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrUpdateTodayRate() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // 1. Ver si ya lo tenemos en la DB
    const existingRate = await this.prisma.exchangeRate.findUnique({
      where: { date: today },
    });
    if (existingRate) return existingRate;

    // 2. Si no, consultamos Banorte
    let rate: number | null = null;
    let source = 'Banorte';

    try {
      const res = await fetch("https://dolarapi.com/v1/mexico/cotizaciones/banorte");
      const data = await res.json();
      rate = Array.isArray(data) ? data[0].venta : null;
    } catch (e) {
      // 3. Respaldo: Frankfurt + Spread de 0.45
      try {
        const resF = await fetch("https://api.frankfurter.app/latest?from=USD&to=MXN");
        const dataF = await resF.json();
        rate = dataF.rates.MXN + 0.45;
        source = 'Frankfurt + Spread';
      } catch (e2) {
        rate = 18.00; // Valor de emergencia
        source = 'Emergency Static';
      }
    }

    // 4. Guardar y devolver
    return this.prisma.exchangeRate.create({
      data: {
        date: today,
        rateMxn: rate,
        source: source,
      },
    });
  }
}
