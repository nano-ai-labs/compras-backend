import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service'; // <--- Añadir esto
import { GcsService } from '../storage/gcs.service';       // <--- Añadir esto

@Module({
  controllers: [ProductsController],
  providers: [
    ProductsService, 
    PrismaService, // <--- Provee la conexión a la DB
    GcsService     // <--- Provee la conexión a Google Cloud
  ],
})
export class ProductsModule {}