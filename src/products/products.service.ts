import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
      console.error(
        `Error al obtener URL para producto ${p.id}:`,
        error?.message,
      );
    }

    return { ...p, imageUrl: signed };
  }

  async create(
    dto: CreateProductDto,
    file?: Express.Multer.File,
  ): Promise<void> {
    // -----------------------------
    // Validaciones básicas
    // -----------------------------
    if (!dto.tripId) throw new BadRequestException('tripId requerido');
    if (!dto.productTypeId) throw new BadRequestException('productTypeId requerido');
    if (!dto.productVariantId) throw new BadRequestException('productVariantId requerido');
    if (!dto.brandId) throw new BadRequestException('brandId requerido');
    if (!dto.colorId) throw new BadRequestException('colorId requerido');

    const stock = Number(dto.stock);
    if (!Number.isFinite(stock) || stock < 0) {
      throw new BadRequestException('stock inválido');
    }

    if (!dto.defaultPriceUsd || Number.isNaN(Number(dto.defaultPriceUsd))) {
      throw new BadRequestException('defaultPriceUsd inválido');
    }

    // imagen obligatoria (porque tú dijiste que la necesitas siempre)
    if (!file) throw new BadRequestException('Imagen requerida');

    const isActive = (dto.isActive ?? 'true') === 'true';

    // -----------------------------
    // Validaciones de integridad catálogo
    // (evita guardar IDs incorrectos)
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

    // ✅ La variante debe pertenecer al tipo
    if (variant.productTypeId !== dto.productTypeId) {
      throw new BadRequestException(
        'La variante no pertenece al tipo seleccionado',
      );
    }

    // -----------------------------
    // Subir imagen: guardamos PATH en products.imageUrl
    // -----------------------------
    const imagePath = await this.gcs.uploadFile(
      file,
      `trips/${dto.tripId}/products`,
    );

    // -----------------------------
    // Transaction: Product + TripProduct
    // -----------------------------
    await this.prisma.$transaction(async (tx) => {
      // 1) Crear producto global
      const created = await tx.product.create({
        data: {
          name: dto.name.trim(),
          defaultPriceUsd: new Prisma.Decimal(dto.defaultPriceUsd),
          stock,
          isActive,

          productTypeId: dto.productTypeId,
          productVariantId: dto.productVariantId,
          brandId: dto.brandId,
          colorId: dto.colorId,

          imageUrl: imagePath, // ✅ PATH GCS
        },
        select: { id: true },
      });

      // 2) Casar con el viaje (snapshot / override por viaje)
      // Nota: si ya existe (unique tripId+productId) aquí no aplica porque es producto nuevo.
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

  async update(
    id: string,
    dto: UpdateProductDto,
    file?: Express.Multer.File,
  ): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const data: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();

    if (dto.defaultPriceUsd !== undefined) {
      if (Number.isNaN(Number(dto.defaultPriceUsd))) {
        throw new BadRequestException('defaultPriceUsd inválido');
      }
      data.defaultPriceUsd = new Prisma.Decimal(dto.defaultPriceUsd);
    }

    if (dto.stock !== undefined) {
      const stock = Number(dto.stock);
      if (!Number.isFinite(stock) || stock < 0) {
        throw new BadRequestException('stock inválido');
      }
      data.stock = stock;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive === 'true';
    }

    // ✅ actualizar catálogos si mandas IDs
    if (dto.productTypeId !== undefined) {
      // si cambia tipo, debería cambiar variante también; aquí lo dejamos permitido solo si viene completo
      data.productType = { connect: { id: dto.productTypeId } };
    }

    if (dto.productVariantId !== undefined) {
      data.productVariant = { connect: { id: dto.productVariantId } };
    }

    if (dto.brandId !== undefined) {
      data.brand = { connect: { id: dto.brandId } };
    }

    if (dto.colorId !== undefined) {
      data.color = { connect: { id: dto.colorId } };
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

      const newPath = await this.gcs.uploadFile(file, `products/${id}`);
      data.imageUrl = newPath;
    }

    // (opcional recomendado) si cambiaste productTypeId y productVariantId, validar pertenencia
    if (dto.productTypeId && dto.productVariantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: dto.productVariantId },
      });
      if (!variant) throw new NotFoundException('ProductVariant no encontrado');
      if (variant.productTypeId !== dto.productTypeId) {
        throw new BadRequestException(
          'La variante no pertenece al tipo seleccionado',
        );
      }
    }

    await this.prisma.product.update({ where: { id }, data });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    return this.withSignedImageUrl(product);
  }
}
