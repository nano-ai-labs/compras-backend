import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  create(@Body() dto: CreateTripDto) {
    return this.trips.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.trips.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trips.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.trips.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.trips.remove(id);
  }
}
