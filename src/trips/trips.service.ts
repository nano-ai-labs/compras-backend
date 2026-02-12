import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../storage/gcs.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildMeta } from '../common/pagination';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Prisma, Trip } from '@prisma/client';

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gcs: GcsService,
  ) {}

  private async withImageUrl(t: Trip) {
    let imageUrl: string | null = null;
    try {
      if (t.imagePath) {
        imageUrl = await this.gcs.getSignedUrl(t.imagePath, 60);
      }
    } catch (error) {
      console.error(`Error al obtener URL para el viaje ${t.id}:`, error.message);
    }

    return {
      ...t,
      imageUrl,
    };
  }

  async create(dto: CreateTripDto) {
    const created = await this.prisma.trip.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: dto.status ?? 'ACTIVE',
      },
    });

    return this.withImageUrl(created);
  }

  async findAll({ page = 1, limit = 20, q, status }: PaginationDto) {
    const skip = (page - 1) * limit;

    const where: Prisma.TripWhereInput = {
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      status: (status as any) ?? 'ACTIVE',
    };

    const [total, trips] = await Promise.all([
      this.prisma.trip.count({ where }),
      this.prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const data = await Promise.all(trips.map((t) => this.withImageUrl(t)));
    return { data, meta: buildMeta(page, limit, total) };
  }

  async findOne(id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Trip no encontrado');

    return this.withImageUrl(trip);
  }

  async update(id: string, dto: UpdateTripDto) {
    const exists = await this.prisma.trip.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Trip no encontrado');

    const updated = await this.prisma.trip.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        status: dto.status ?? undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });

    return this.withImageUrl(updated);
  }

  async setImage(id: string, file: Express.Multer.File) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Trip no encontrado');

    if (trip.imagePath) {
      try {
        await this.gcs.delete(trip.imagePath);
      } catch (e) {
        console.warn('No se pudo borrar la imagen anterior');
      }
    }

    const imagePath = await this.gcs.uploadTripImage(id, file);

    const updated = await this.prisma.trip.update({
      where: { id },
      data: { imagePath },
    });

    return this.withImageUrl(updated);
  }

  async removeImage(id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Trip no encontrado');

    if (trip.imagePath) {
      await this.gcs.delete(trip.imagePath);
    }

    const updated = await this.prisma.trip.update({
      where: { id },
      data: { imagePath: null },
    });

    return this.withImageUrl(updated);
  }

  async remove(id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Trip no encontrado');

    if (trip.imagePath) {
      await this.gcs.delete(trip.imagePath);
    }

    return this.prisma.trip.delete({ where: { id } });
  }
}