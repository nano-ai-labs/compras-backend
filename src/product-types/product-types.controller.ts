import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { ProductTypesService } from './product-types.service';
import { CreateProductTypesDto } from './dto/create-product-types.dto';
import { UpdateProductTypesDto } from './dto/update-product-types.dto';

@Controller('product-types')
export class ProductTypesController {
  constructor(private readonly productTypesService: ProductTypesService) {}

  @Post()
  create(@Body() createProductTypesDto: CreateProductTypesDto) {
    return this.productTypesService.create(createProductTypesDto);
  }

  @Get()
  findAll() {
    return this.productTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productTypesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateProductTypesDto: UpdateProductTypesDto) {
    return this.productTypesService.update(id, updateProductTypesDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productTypesService.remove(id);
  }
}