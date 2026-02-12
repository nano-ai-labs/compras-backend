import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { OrderItemsService } from './order-items.service';
import { CreateOrderItemDto } from './dto/create-order-item.dto';

@Controller('order-items')
export class OrderItemsController {
  constructor(private readonly orderItemsService: OrderItemsService) {}

  @Post()
  create(@Body() createOrderItemDto: CreateOrderItemDto) {
    // Ahora addItemToOrder existe en el servicio
    return this.orderItemsService.addItemToOrder(createOrderItemDto);
  }

  @Get(':id/breakdown')
  getBreakdown(@Param('id') id: string) {
    return this.orderItemsService.getItemBreakdown(id);
  }
}