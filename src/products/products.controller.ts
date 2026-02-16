import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  HttpCode,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { MatchProductsDto } from './dto/match-products.dto';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ✅ match por combinación (paginado)
  @Get('match')
  match(@Query() dto: MatchProductsDto) {
    return this.productsService.match(dto);
  }

  // ✅ crear product + product_images + trip_product
  @Post()
  @HttpCode(201)
  @UseInterceptors(FilesInterceptor('images', 12))
  async create(
    @Body() dto: CreateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<void> {
    await this.productsService.create(dto, files ?? []);
  }

  // update (si aún quieres permitir 1 imagen legacy, lo dejamos)
  @Put(':id')
  @HttpCode(204)
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<void> {
    await this.productsService.update(id, dto, file);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
}
