import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductTypesDto } from './dto/create-product-types.dto';
import { UpdateProductTypesDto } from './dto/update-product-types.dto';

@Injectable()
export class ProductTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductTypesDto) {
    try {
      // ✅ Corregido: productType en lugar de product_types
      return await this.prisma.productType.create({ data });
    } catch (error) {
      throw new BadRequestException('Error al crear el tipo de producto: ' + error.message);
    }
  }

  async findAll() {
    // ✅ Corregido: productType
    return this.prisma.productType.findMany();
  }

  async findOne(id: string) {
    const type = await this.prisma.productType.findUnique({ where: { id } });
    
    if (!type) {
      throw new NotFoundException(`Tipo de producto con ID ${id} no encontrado`);
    }
    
    return type;
  }

  async update(id: string, data: UpdateProductTypesDto) {
    // Primero verificamos que exista para lanzar un 404 limpio
    await this.findOne(id);

    return this.prisma.productType.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    // Verificamos existencia antes de borrar
    await this.findOne(id);

    return this.prisma.productType.delete({ where: { id } });
  }
}