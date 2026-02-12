import { Controller, Get, Post, Param } from '@nestjs/common';
import { TripsService } from './trips.service';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  create(@Body() createTripDto: CreateTripDto) {
    return this.tripsService.create(createTripDto);
  }

  @Post(':id/initialize')
  initialize(@Param('id') id: string) {
    return this.tripsService.initializeTripSettings(id);
  }

  @Get(':id/balance')
  getBalance(@Param('id') id: string) {
    return this.tripsService.getTripBalance(id);
  }
}