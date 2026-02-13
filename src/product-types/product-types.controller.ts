import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ProductTypesService } from './product-types.service';
import { CreateProductTypesDto } from './dto/create-product-types.dto';
import { UpdateProductTypesDto } from './dto/update-product-types.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('product-types')
export class ProductTypesController {
  constructor(private readonly productTypesService: ProductTypesService) {}

  @Post()
  create(@Body() createProductTypesDto: CreateProductTypesDto) {
    return this.productTypesService.create(createProductTypesDto);
  }

  // ✅ Ahora soporta /product-types?enabled=true|false
  @Get()
  findAll(@Query('enabled') enabled?: string) {
    // enabled undefined => no filtra
    // enabled "true" => true
    // enabled "false" => false
    const parsed =
      enabled === undefined ? undefined : enabled === 'true' ? true : false;

    return this.productTypesService.findAll(parsed);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productTypesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductTypesDto: UpdateProductTypesDto,
  ) {
    return this.productTypesService.update(id, updateProductTypesDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productTypesService.remove(id);
  }
}
