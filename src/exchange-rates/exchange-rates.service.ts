import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExchangeRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrUpdateTodayRate() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // 1. Ver si ya existe en la DB para hoy
    const existingRate = await this.prisma.exchangeRate.findUnique({
      where: { date: today },
    });
    if (existingRate) return existingRate;

    // 2. Intentar obtener el precio real (Banorte primero, Frankfurt después)
    let rate: number | null = null;
    let source = '';

    try {
      const res = await fetch("https://dolarapi.com/v1/mexico/cotizaciones/banorte", {
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      const precioVenta = Array.isArray(data) ? data[0].venta : data.venta;
      if (precioVenta) {
        rate = precioVenta;
        source = 'Banorte';
      }
    } catch (e) {
      console.warn("Banorte falló, intentando Frankfurt...");
      try {
        const resF = await fetch("https://api.frankfurter.app/latest?from=USD&to=MXN");
        const dataF = await resF.json();
        if (dataF?.rates?.MXN) {
          rate = dataF.rates.MXN + 0.45; // Spread de seguridad
          source = 'Frankfurt + Spread';
        }
      } catch (e2) {
        console.error("Ambas APIs de divisas fallaron");
      }
    }

    // 3. VALIDACIÓN ESTRICTA: Solo guardar si tenemos un precio real
    if (!rate) {
      throw new ServiceUnavailableException("No se pudo obtener un precio de dólar confiable.");
    }

    return this.prisma.exchangeRate.create({
      data: {
        date: today,
        rateMxn: rate,
        source: source,
      },
    });
  }
}
