import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductTypesDto } from './dto/create-product-types.dto';
import { UpdateProductTypesDto } from './dto/update-product-types.dto';

@Injectable()
export class ProductTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductTypesDto) {
    try {
      return await this.prisma.productType.create({ data });
    } catch (error: any) {
      throw new BadRequestException('Error al crear el tipo de producto: ' + error.message);
    }
  }

  // ✅ ahora acepta enabled opcional
  async findAll(enabled?: boolean) {
    return this.prisma.productType.findMany({
      where: {
        ...(typeof enabled === 'boolean' ? { enabled } : {}),
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const type = await this.prisma.productType.findUnique({ where: { id } });

    if (!type) {
      throw new NotFoundException(`Tipo de producto con ID ${id} no encontrado`);
    }

    return type;
  }

  async update(id: string, data: UpdateProductTypesDto) {
    await this.findOne(id);

    return this.prisma.productType.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.productType.delete({ where: { id } });
  }
}
