import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { OrderDetailQueryDto } from './dto/order-detail-query.dto';
import { AvailableProductsDto } from './dto/available-products.dto';
import { AddOrderItemDto } from './dto/add-order-item.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  findAll(@Query() query: ListOrdersDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query() query: OrderDetailQueryDto,
  ) {
    return this.ordersService.findOne(id, query.tripId);
  }

  @Get(':id/available-products')
  availableProducts(
    @Param('id') orderId: string,
    @Query() query: AvailableProductsDto,
  ) {
    return this.ordersService.getAvailableProducts(orderId, query);
  }

  @Post(':id/items')
  addItem(
    @Param('id') orderId: string,
    @Body() dto: AddOrderItemDto,
  ) {
    return this.ordersService.addItem(orderId, dto);
  }

  // Nuevo endpoint para los detalles calculados
  @Get(':id/details')
  getDetails(@Param('id') id: string) {
    return this.ordersService.getOrderDetails(id);
  }
}
