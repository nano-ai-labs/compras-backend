import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { normalizePhone } from '../common/phone';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  private isMissingPhoneNormalizedColumn(error: any): boolean {
    return error?.code === 'P2022';
  }

  async create(data: CreateClientDto) {
    const name = data.name?.trim();
    if (!name) {
      throw new BadRequestException('El nombre es obligatorio');
    }

    const normalized = normalizePhone(data.phone);
    if (data.phone && !normalized) {
      throw new BadRequestException('Teléfono inválido');
    }

    try {
      return await this.prisma.client.create({
        data: {
          name,
          userId: data.userId,
          phone: data.phone ?? null,
          phoneNormalized: normalized,
        },
      });
    } catch (error: any) {
      if (!this.isMissingPhoneNormalizedColumn(error)) throw error;
      return this.prisma.client.create({
        data: {
          name,
          userId: data.userId,
          phone: data.phone ?? null,
        },
      });
    }
  }

  async findAll() {
    return this.prisma.client.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByPhone(phone: string) {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      throw new BadRequestException('Parámetro phone inválido');
    }

    let client;
    try {
      client = await this.prisma.client.findFirst({
        where: { phoneNormalized: normalized },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error: any) {
      if (!this.isMissingPhoneNormalizedColumn(error)) throw error;
      client = await this.prisma.client.findFirst({
        where: {
          OR: [
            { phone: normalized },
            { phone: { contains: normalized } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    return client ?? null;
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
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

    try {
      return await this.prisma.client.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          userId: data.userId,
          phone: data.phone,
          phoneNormalized: normalized,
        },
      });
    } catch (error: any) {
      if (!this.isMissingPhoneNormalizedColumn(error)) throw error;
      return this.prisma.client.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          userId: data.userId,
          phone: data.phone,
        },
      });
    }
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
