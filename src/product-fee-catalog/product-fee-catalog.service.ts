import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductFeeCatalogDto } from './dto/create-product-fee-catalog.dto';
import { UpdateProductFeeCatalogDto } from './dto/update-product-fee-catalog.dto';

@Injectable()
export class ProductFeeCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductFeeCatalogDto) {
    try {
      return await this.prisma.productFeeCatalog.create({ data });
    } catch (error) {
      // Manejo de errores (ej. código duplicado)
      throw new Error('Error creando el producto: ' + error.message);
    }
  }

  async findAll() {
    return this.prisma.productFeeCatalog.findMany();
  }

  async findOne(id: string) {
    return this.prisma.productFeeCatalog.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateProductFeeCatalogDto) {
    return this.prisma.productFeeCatalog.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.productFeeCatalog.delete({ where: { id } });
  }
}