import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripExpenseDto } from './dto/create-trip-expense.dto';
import { GcsService } from '../storage/gcs.service';

@Injectable()
export class TripExpensesService {
  constructor(private readonly prisma: PrismaService, private readonly gcsService: GcsService) {}

  async create(data: CreateTripExpenseDto, file: Express.Multer.File) {
    const { tripId, categoryId, amount_usd, exchangeRate_base } = data;

    const convertedAmount = amount_usd ? amount_usd * exchangeRate_base : 0;

    const newExpense = await this.prisma.tripExpense.create({
      data: {
        tripId,
        categoryId,
        amountMxn: convertedAmount,
        amount_usd,
      },
    });

    if (file) {
      const receiptUrl = await this.gcsService.uploadFile(file, 'expenses');
      await this.prisma.tripExpense.update({
        where: { id: newExpense.id },
        data: { receiptUrl: receiptUrl },
      });
    }

    return newExpense;
  }

  async findAllByTrip(tripId: string) {
    return this.prisma.tripExpense.findMany({ where: { tripId: tripId } });
  }
}