import { Controller, Post, Body, Get, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TripExpensesService } from './trip-expenses.service';
import { CreateTripExpenseDto } from './dto/create-trip-expense.dto';

@Controller('trip-expenses')
export class TripExpensesController {
  constructor(private readonly tripExpensesService: TripExpensesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file')) // Allows receiving a file in the request
  create(
    @Body() createTripExpenseDto: CreateTripExpenseDto,
    @UploadedFile() file?: Express.Multer.File, // Get the file from the request
  ) {
    return this.tripExpensesService.create(createTripExpenseDto, file);
  }

  @Get(':tripId')
  findAllByTrip(@Param('tripId') tripId: string) {
    return this.tripExpensesService.findAllByTrip(tripId);
  }
}