import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExchangeRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrUpdateTodayRate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Busca el tipo de cambio de hoy
    const existingRate = await this.prisma.exchangeRate.findUnique({
      where: { date: today },
    });

    if (existingRate) {
      return existingRate;
    }

    // Si no existe, obtener el tipo de cambio de una API externa o usar un valor por defecto
    const newRate = await this.fetchNewRate() || 20.0;  // Valor por defecto si la API falla

    // Crear registro en base de datos
    return await this.prisma.exchangeRate.create({
      data: {
        date: today,
        rate_mxn: newRate,
        source: 'Manual', // o el origen que definas
      },
    });
  }

  private async fetchNewRate() {
    try {
      // Lógica para llamar a la API externa
      // Ejemplo: usando fetch para obtener el tipo de cambio
      const response = await fetch('API_URL'); // Cambia por la URL real
      const data = await response.json();
      return data.rate_mxn; // Ajústalo según la respuesta de la API
    } catch (error) {
      console.warn('Error obteniendo tipo de cambio:', error);
      return null;
    }
  }
}