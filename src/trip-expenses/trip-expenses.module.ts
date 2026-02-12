import { Module } from '@nestjs/common';
import { TripExpensesController } from './trip-expenses.controller';
import { TripExpensesService } from './trip-expenses.service';

@Module({
  controllers: [TripExpensesController],
  providers: [TripExpensesService],
})
export class TripExpensesModule {}