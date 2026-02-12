import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../storage/gcs.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gcsService: GcsService,
  ) {}

  async create(dto: CreateProductDto, file?: Express.Multer.File) {
    let imageUrl = dto.image_url;
    
    // Si hay un archivo, lo subimos y usamos la URL generada
    if (file) {
      imageUrl = await this.gcsService.uploadFile(file, 'products');
    }

    return await this.prisma.product.create({
      data: {
        name: dto.name,
        imageUrl: imageUrl, // Mapeo de snake_case (DTO) a camelCase (Prisma)
        defaultPriceUsd: dto.default_price_usd,
        stock: dto.stock,
        productTypeId: dto.product_type_id,
        isActive: dto.is_active ?? true,
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { productType: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto, file?: Express.Multer.File) {
    // Validamos que el producto existe antes de intentar actualizar
    await this.findOne(id);

    let imageUrl = dto.image_url;
    if (file) {
      imageUrl = await this.gcsService.uploadFile(file, 'products');
    }

    return await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        imageUrl: imageUrl ?? undefined,
        defaultPriceUsd: dto.default_price_usd ?? undefined,
        stock: dto.stock ?? undefined,
        productTypeId: dto.product_type_id ?? undefined,
        isActive: dto.is_active ?? undefined,
      },
    });
  }

  async findAll() {
    return await this.prisma.product.findMany({
      include: { productType: true },
      orderBy: { name: 'asc' }
    });
  }

  async remove(id: string) {
    // Usamos findOne para asegurar que existe y obtener datos si es necesario (como el path de la imagen para borrarla de GCS)
    const product = await this.findOne(id);
    
    // Opcional: Si quieres borrar la imagen de GCS al eliminar el producto
    if (product.imageUrl) {
      await this.gcsService.delete(product.imageUrl).catch(() => {
        console.warn('No se pudo eliminar la imagen de GCS al borrar el producto');
      });
    }

    return await this.prisma.product.delete({ where: { id: product.id } });
  }
}