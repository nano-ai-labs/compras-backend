import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductTypesDto } from './dto/create-product-types.dto';
import { UpdateProductTypesDto } from './dto/update-product-types.dto';

@Injectable()
export class ProductTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductTypesDto) {
    try {
      return await this.prisma.product_types.create({ data });
    } catch (error) {
      throw new Error('Error creando el tipo de producto: ' + error.message);
    }
  }

  async findAll() {
    return this.prisma.product_types.findMany();
  }

  async findOne(id: string) {
    return this.prisma.product_types.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateProductTypesDto) {
    return this.prisma.product_types.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.product_types.delete({ where: { id } });
  }
}