import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseCategoriesDto } from './dto/create-expense-categories.dto';
import { UpdateExpenseCategoriesDto } from './dto/update-expense-categories.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateExpenseCategoriesDto) {
    try {
      return await this.prisma.expenseCategory.create({ data });
    } catch (error) {
      throw new Error('Error creando la categoría de gasto: ' + error.message);
    }
  }

  async findAll() {
    return this.prisma.expenseCategory.findMany();
  }

  async findOne(id: string) {
    return this.prisma.expenseCategory.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateExpenseCategoriesDto) {
    return this.prisma.expenseCategory.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.expenseCategory.delete({ where: { id } });
  }
}