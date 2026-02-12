import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExchangeRuleCatalogDto } from './dto/create-exchange-rule-catalog.dto';
import { UpdateExchangeRuleCatalogDto } from './dto/update-exchange-rule-catalog.dto';

@Injectable()
export class ExchangeRuleCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateExchangeRuleCatalogDto) {
    try {
      return await this.prisma.exchangeRuleCatalog.create({ data });
    } catch (error) {
      throw new Error('Error creando la regla de cambio: ' + error.message);
    }
  }

  async findAll() {
    return this.prisma.exchangeRuleCatalog.findMany();
  }

  async findOne(id: string) {
    return this.prisma.exchangeRuleCatalog.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateExchangeRuleCatalogDto) {
    return this.prisma.exchangeRuleCatalog.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.exchangeRuleCatalog.delete({ where: { id } });
  }
}