import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../storage/gcs.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { MatchProductsDto } from './dto/match-products.dto';
import { buildMeta } from '../common/pagination';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gcs: GcsService,
  ) {}

  private isTrue(v?: string) {
    return (v ?? 'true') === 'true';
  }

  // ✅ prioridad: isPrimary desc, sortOrder asc
  private async signPrimaryImage(productId: string): Promise<string | null> {
    const img = await this.prisma.productImage.findFirst({
      where: { productId },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
      select: { path: true },
    });
    if (!img?.path) return null;
    return this.gcs.getSignedUrl(img.path, 60);
  }

  async match(dto: MatchProductsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 6;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      brandId: dto.brandId,
      productVariantId: dto.productVariantId,
      colorId: dto.colorId,
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true },
      }),
    ]);

    const data = await Promise.all(
      products.map(async (p) => ({
        id: p.id,
        name: p.name,
        primaryImageUrl: await this.signPrimaryImage(p.id),
      })),
    );

    return { data, meta: buildMeta(page, limit, total) };
  }

  async create(dto: CreateProductDto, files: Express.Multer.File[]): Promise<void> {
    // -----------------------------
    // Validaciones básicas
    // -----------------------------
    if (!dto.tripId) throw new BadRequestException('tripId requerido');
    if (!dto.productTypeId) throw new BadRequestException('productTypeId requerido');
    if (!dto.productVariantId) throw new BadRequestException('productVariantId requerido');
    if (!dto.brandId) throw new BadRequestException('brandId requerido');
    if (!dto.colorId) throw new BadRequestException('colorId requerido');

    const stock = Number(dto.stock);
    if (!Number.isFinite(stock) || stock < 0) throw new BadRequestException('stock inválido');

    if (!dto.defaultPriceUsd || Number.isNaN(Number(dto.defaultPriceUsd))) {
      throw new BadRequestException('defaultPriceUsd inválido');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('Agrega al menos 1 imagen');
    }

    const isActive = this.isTrue(dto.isActive);

    // -----------------------------
    // Validaciones integridad catálogo
    // -----------------------------
    const [type, variant, brand, color] = await Promise.all([
      this.prisma.productType.findUnique({ where: { id: dto.productTypeId } }),
      this.prisma.productVariant.findUnique({ where: { id: dto.productVariantId } }),
      this.prisma.brand.findUnique({ where: { id: dto.brandId } }),
      this.prisma.color.findUnique({ where: { id: dto.colorId } }),
    ]);

    if (!type) throw new NotFoundException('ProductType no encontrado');
    if (!variant) throw new NotFoundException('ProductVariant no encontrado');
    if (!brand) throw new NotFoundException('Brand no encontrado');
    if (!color) throw new NotFoundException('Color no encontrado');

    if (variant.productTypeId !== dto.productTypeId) {
      throw new BadRequestException('La variante no pertenece al tipo seleccionado');
    }

    // -----------------------------
    // Transaction: Product + Images + TripProduct
    // -----------------------------
    await this.prisma.$transaction(async (tx) => {
      // ✅ sku requerido y unique: lo generamos server-side
      const sku = `SKU-${Date.now()}-${randomUUID().slice(0, 8)}`;

      const created = await tx.product.create({
        data: {
          sku,
          name: dto.name.trim(),
          defaultPriceUsd: new Prisma.Decimal(dto.defaultPriceUsd),
          stock,
          isActive,

          productTypeId: dto.productTypeId,
          productVariantId: dto.productVariantId,
          brandId: dto.brandId,
          colorId: dto.colorId,
        },
        select: { id: true },
      });

      // 1) Subir imágenes a GCS y crear ProductImage
      // Ruta ordenada: trips/{tripId}/products/{productId}/...
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const folder = `trips/${dto.tripId}/products/${created.id}`;
        const path = await this.gcs.uploadFile(f, folder);

        await tx.productImage.create({
          data: {
            productId: created.id,
            path,
            sortOrder: i,
            isPrimary: i === 0, // ✅ primera = principal
          },
        });
      }

      // 2) TripProduct snapshot
      await tx.tripProduct.create({
        data: {
          tripId: dto.tripId,
          productId: created.id,
          isActive: true,
          basePriceUsd: new Prisma.Decimal(dto.defaultPriceUsd),
        },
      });
    });
  }

  async update(id: string, dto: UpdateProductDto, file?: Express.Multer.File): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const data: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();

    if (dto.defaultPriceUsd !== undefined) {
      if (Number.isNaN(Number(dto.defaultPriceUsd))) throw new BadRequestException('defaultPriceUsd inválido');
      data.defaultPriceUsd = new Prisma.Decimal(dto.defaultPriceUsd);
    }

    if (dto.stock !== undefined) {
      const stock = Number(dto.stock);
      if (!Number.isFinite(stock) || stock < 0) throw new BadRequestException('stock inválido');
      data.stock = stock;
    }

    if (dto.isActive !== undefined) data.isActive = dto.isActive === 'true';

    if (dto.productTypeId !== undefined) data.productType = { connect: { id: dto.productTypeId } };
    if (dto.productVariantId !== undefined) data.productVariant = { connect: { id: dto.productVariantId } };
    if (dto.brandId !== undefined) data.brand = { connect: { id: dto.brandId } };
    if (dto.colorId !== undefined) data.color = { connect: { id: dto.colorId } };

    // ✅ (legacy) si mandan 1 imagen en update, la guardamos como NUEVA principal (opcional)
    if (file) {
      const folder = `products/${id}`;
      const path = await this.gcs.uploadFile(file, folder);

      // ponemos esta como principal y reordenamos
      await this.prisma.$transaction(async (tx) => {
        await tx.productImage.updateMany({
          where: { productId: id },
          data: { isPrimary: false },
        });

        await tx.productImage.create({
          data: {
            productId: id,
            path,
            sortOrder: 0,
            isPrimary: true,
          },
        });
      });
    }

    // validar pertenencia si cambias tipo+variante
    if (dto.productTypeId && dto.productVariantId) {
      const variant = await this.prisma.productVariant.findUnique({ where: { id: dto.productVariantId } });
      if (!variant) throw new NotFoundException('ProductVariant no encontrado');
      if (variant.productTypeId !== dto.productTypeId) {
        throw new BadRequestException('La variante no pertenece al tipo seleccionado');
      }
    }

    await this.prisma.product.update({ where: { id }, data });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        brand: { select: { id: true, name: true } },
        color: { select: { id: true, name: true } },
        productVariant: { select: { id: true, name: true, productTypeId: true } },
        productType: { select: { id: true, name: true } },
      },
    });

    if (!product) throw new NotFoundException('Producto no encontrado');

    const images = await Promise.all(
      product.images.map(async (img) => ({
        id: img.id,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
        url: await this.gcs.getSignedUrl(img.path, 60),
      })),
    );

    const primaryImageUrl = images.find((x) => x.isPrimary)?.url ?? images[0]?.url ?? null;

    return {
      ...product,
      images,
      primaryImageUrl,
    };
  }
}
