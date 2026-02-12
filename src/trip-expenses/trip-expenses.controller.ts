import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { TripExpensesService } from './trip-expenses.service';
import { CreateTripExpenseDto } from './dto/create-trip-expense.dto';

@Controller('trip-expenses')
export class TripExpensesController {
  constructor(private readonly tripExpensesService: TripExpensesService) {}

  @Post()
  create(@Body() createTripExpenseDto: CreateTripExpenseDto) {
    return this.tripExpensesService.create(createTripExpenseDto);
  }

  @Get(':tripId')
  findAllByTrip(@Param('tripId') tripId: string) {
    return this.tripExpensesService.findAllByTrip(tripId);
  }
}