import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { ExpenseCategoriesService } from './expense-categories.service';
import { CreateExpenseCategoriesDto } from './dto/create-expense-categories.dto';
import { UpdateExpenseCategoriesDto } from './dto/update-expense-categories.dto';

@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(private readonly expenseCategoriesService: ExpenseCategoriesService) {}

  @Post()
  create(@Body() createExpenseCategoriesDto: CreateExpenseCategoriesDto) {
    return this.expenseCategoriesService.create(createExpenseCategoriesDto);
  }

  @Get()
  findAll() {
    return this.expenseCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expenseCategoriesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateExpenseCategoriesDto: UpdateExpenseCategoriesDto) {
    return this.expenseCategoriesService.update(id, updateExpenseCategoriesDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expenseCategoriesService.remove(id);
  }
}