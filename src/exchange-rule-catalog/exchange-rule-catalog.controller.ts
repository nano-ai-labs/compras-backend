import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { ExchangeRuleCatalogService } from './exchange-rule-catalog.service';
import { CreateExchangeRuleCatalogDto } from './dto/create-exchange-rule-catalog.dto';
import { UpdateExchangeRuleCatalogDto } from './dto/update-exchange-rule-catalog.dto';

@Controller('exchange-rule-catalog')
export class ExchangeRuleCatalogController {
  constructor(private readonly exchangeRuleCatalogService: ExchangeRuleCatalogService) {}

  @Post()
  create(@Body() createExchangeRuleCatalogDto: CreateExchangeRuleCatalogDto) {
    return this.exchangeRuleCatalogService.create(createExchangeRuleCatalogDto);
  }

  @Get()
  findAll() {
    return this.exchangeRuleCatalogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exchangeRuleCatalogService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateExchangeRuleCatalogDto: UpdateExchangeRuleCatalogDto) {
    return this.exchangeRuleCatalogService.update(id, updateExchangeRuleCatalogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.exchangeRuleCatalogService.remove(id);
  }
}