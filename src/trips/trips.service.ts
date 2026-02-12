import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService, private readonly exchangeRatesService: ExchangeRatesService) {}

  async create(data: CreateTripDto) {
    const trip = await this.prisma.trips.create({
      data,
    });

    // Automatizar el snapshot al crear un viaje.
    await this.initializeTripSettings(trip.id);

    // Verificar y actualizar el tipo de cambio
    await this.exchangeRatesService.getOrUpdateTodayRate();

    return trip;
  }

  // Implementar la lógica de copiar catálogos al viaje
  async initializeTripSettings(tripId: string) {
    // Lógica aquí para copiar documentos
  }

  // Implementar la lógica de agregación financiera
  async getTripBalance(tripId: string) {
    // Lógica aquí para calcular balance
  }
}