import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateClientDto) {
    try {
      return await this.prisma.clients.create({ data });
    } catch (error) {
      throw new Error('Error creando el cliente: ' + error.message);
    }
  }

  async findAll() {
    return this.prisma.clients.findMany();
  }

  async findOne(id: string) {
    return this.prisma.clients.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateClientDto) {
    return this.prisma.clients.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.clients.delete({ where: { id } });
  }
}