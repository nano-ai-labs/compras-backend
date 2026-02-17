import { Controller, Get, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('trips/:tripId/orders')
export class TripOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('by-phone')
  findByPhone(
    @Param('tripId') tripId: string,
    @Query('phone') phone: string,
  ) {
    return this.ordersService.findByPhoneInTrip(tripId, phone);
  }
}
