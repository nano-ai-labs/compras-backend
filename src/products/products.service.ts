import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../storage/gcs.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma, Product } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gcs: GcsService,
  ) {}

  // ✅ Igual que TripsService.withImageUrl, pero usando Product.imageUrl como PATH
  private async withSignedImageUrl(p: Product) {
    let signed: string | null = null;

    try {
      if (p.imageUrl) {
        signed = await this.gcs.getSignedUrl(p.imageUrl, 60);
      }
    } catch (error: any) {
      console.error(`Error al obtener URL para producto ${p.id}:`, error?.message);
    }

    return { ...p, imageUrl: signed };
  }

  async create(dto: CreateProductDto, file?: Express.Multer.File): Promise<void> {
    const stock = Number(dto.stock);
    if (!Number.isFinite(stock) || stock < 0) throw new BadRequestException('stock inválido');

    const isActive = (dto.isActive ?? 'true') === 'true';

    // ✅ Subimos imagen si existe. Guardamos PATH en imageUrl
    let imagePath: string | null = null;
    if (file) {
      // Puedes organizar por viaje + products
      imagePath = await this.gcs.uploadFile(file, `trips/${dto.tripId}/products`);
    }

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: dto.name.trim(),
          defaultPriceUsd: new Prisma.Decimal(dto.defaultPriceUsd),
          stock,
          isActive,
          productTypeId: dto.productTypeId,
          imageUrl: imagePath, // ✅ PATH en GCS
        },
        select: { id: true },
      });

      // ✅ Casar con el viaje
      await tx.tripProduct.create({
        data: {
          tripId: dto.tripId,
          productId: created.id,
          isActive: true,
          basePriceUsd: new Prisma.Decimal(dto.defaultPriceUsd), // override opcional
        },
      });
    });
  }

  async update(id: string, dto: UpdateProductDto, file?: Express.Multer.File): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const data: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.defaultPriceUsd !== undefined) data.defaultPriceUsd = new Prisma.Decimal(dto.defaultPriceUsd);

    if (dto.stock !== undefined) {
      const stock = Number(dto.stock);
      if (!Number.isFinite(stock) || stock < 0) throw new BadRequestException('stock inválido');
      data.stock = stock;
    }

    if (dto.productTypeId !== undefined) {
      data.productType = { connect: { id: dto.productTypeId } };
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive === 'true';
    }

    // ✅ Reemplazar imagen con misma lógica de TripsService.setImage
    if (file) {
      if (product.imageUrl) {
        try {
          await this.gcs.delete(product.imageUrl);
        } catch (e) {
          console.warn('No se pudo borrar la imagen anterior del producto');
        }
      }

      // Para update, como no tenemos tripId, guardamos por productId
      const newPath = await this.gcs.uploadFile(file, `products/${id}`);
      data.imageUrl = newPath;
    }

    await this.prisma.product.update({ where: { id }, data });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    return this.withSignedImageUrl(product);
  }
}
