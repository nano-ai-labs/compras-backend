import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripExpenseDto } from './dto/create-trip-expense.dto';
import { GcsService } from '../storage/gcs.service';

@Injectable()
export class TripExpensesService {
  constructor(private readonly prisma: PrismaService, private readonly gcsService: GcsService) {}

  // Added '?' to file to make it optional (Fixes TS2554)
async create(data: CreateTripExpenseDto, file?: Express.Multer.File) {
    const { tripId, categoryId, amount_usd, exchangeRate_base } = data;

    const amount = amount_usd ?? 0;
    const rate = exchangeRate_base ?? 1;
    const convertedAmount = amount * rate;

    const newExpense = await this.prisma.tripExpense.create({
      data: {
        tripId,
        categoryId,
        amountMxn: convertedAmount,
        amount: amount,
        // FIX: Added the missing required property 'expenseDate'
        expenseDate: new Date(), 
      },
    });

    if (file) {
      const receiptUrl = await this.gcsService.uploadFile(file, 'expenses');
      await this.prisma.tripExpense.update({
        where: { id: newExpense.id },
        data: { receiptUrl },
      });
    }

    return newExpense;
  }

  async findAllByTrip(tripId: string) {
    return this.prisma.tripExpense.findMany({ where: { tripId } });
  }
  
}