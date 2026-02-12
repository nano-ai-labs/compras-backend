import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExchangeRuleCatalogDto } from './dto/create-exchange-rule-catalog.dto';
import { UpdateExchangeRuleCatalogDto } from './dto/update-exchange-rule-catalog.dto';

@Injectable()
export class ExchangeRuleCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateExchangeRuleCatalogDto) {
    try {
      return await this.prisma.exchange_rule_catalog.create({ data });
    } catch (error) {
      throw new Error('Error creando la regla de cambio: ' + error.message);
    }
  }

  async findAll() {
    return this.prisma.exchange_rule_catalog.findMany();
  }

  async findOne(id: string) {
    return this.prisma.exchange_rule_catalog.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateExchangeRuleCatalogDto) {
    return this.prisma.exchange_rule_catalog.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.exchange_rule_catalog.delete({ where: { id } });
  }
}