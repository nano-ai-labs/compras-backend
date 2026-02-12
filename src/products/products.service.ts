import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GcsService } from '../storage/gcs.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService, private readonly gcsService: GcsService) {}

  async create(data: CreateProductDto, file: Express.Multer.File) {
    if (file) {
      const imageUrl = await this.gcsService.uploadFile(file, 'products');
      data.image_url = imageUrl;
    }

    return await this.prisma.product.create({
      data,
    });
  }

  async update(id: string, data: UpdateProductDto, file: Express.Multer.File) {
    if (file) {
      const imageUrl = await this.gcsService.uploadFile(file, 'products');
      data.image_url = imageUrl;
    }

    return await this.prisma.product.update({
      where: { id },
      data,
    });
  }
}