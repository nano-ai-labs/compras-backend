import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { normalizePhone } from '../common/phone';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateClientDto) {
    const name = data.name?.trim();
    if (!name) {
      throw new BadRequestException('El nombre es obligatorio');
    }

    const normalized = normalizePhone(data.phone);
    if (data.phone && !normalized) {
      throw new BadRequestException('Teléfono inválido');
    }

    return this.prisma.client.create({
      data: {
        name,
        userId: data.userId,
        phone: data.phone ?? null,
        phoneNormalized: normalized,
      },
    });
  }

  async findAll() {
    return this.prisma.client.findMany();
  }

  async findByPhone(phone: string) {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      throw new BadRequestException('Parámetro phone inválido');
    }

    const client = await this.prisma.client.findFirst({
      where: { phoneNormalized: normalized },
      orderBy: { createdAt: 'desc' },
    });

    return client ?? null;
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  async update(id: string, data: UpdateClientDto) {
    const exists = await this.prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Cliente no encontrado');

    const normalized = data.phone !== undefined
      ? normalizePhone(data.phone)
      : undefined;
    if (data.phone !== undefined && data.phone !== null && !normalized) {
      throw new BadRequestException('Teléfono inválido');
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        userId: data.userId,
        phone: data.phone,
        phoneNormalized: normalized,
      },
    });
  }

  async remove(id: string) {
    const exists = await this.prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Cliente no encontrado');

    return this.prisma.client.delete({ where: { id } });
  }
}
