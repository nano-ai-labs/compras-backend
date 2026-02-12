import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { ProductFeeCatalogService } from './product-fee-catalog.service';
import { CreateProductFeeCatalogDto } from './dto/create-product-fee-catalog.dto';
import { UpdateProductFeeCatalogDto } from './dto/update-product-fee-catalog.dto';

@Controller('product-fee-catalog')
export class ProductFeeCatalogController {
  constructor(private readonly productFeeCatalogService: ProductFeeCatalogService) {}

  @Post()
  create(@Body() createProductFeeCatalogDto: CreateProductFeeCatalogDto) {
    return this.productFeeCatalogService.create(createProductFeeCatalogDto);
  }

  @Get()
  findAll() {
    return this.productFeeCatalogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productFeeCatalogService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateProductFeeCatalogDto: UpdateProductFeeCatalogDto) {
    return this.productFeeCatalogService.update(id, updateProductFeeCatalogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productFeeCatalogService.remove(id);
  }
}