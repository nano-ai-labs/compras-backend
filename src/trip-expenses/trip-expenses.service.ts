import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripExpenseDto } from './dto/create-trip-expense.dto';
import { GcsService } from '../storage/gcs.service';

@Injectable()
export class TripExpensesService {
  constructor(private readonly prisma: PrismaService, private readonly gcsService: GcsService) {}

  async create(data: CreateTripExpenseDto, file: Express.Multer.File) {
    const { trip_id, category_id, amount_usd, exchange_rate_base } = data;

    const convertedAmount = amount_usd ? amount_usd * exchange_rate_base : 0;

    const newExpense = await this.prisma.trip_expenses.create({
      data: {
        trip_id,
        category_id,
        amount_mxn: convertedAmount,
        amount_usd,
      },
    });

    if (file) {
      const receiptUrl = await this.gcsService.uploadFile(file, 'expenses');
      await this.prisma.trip_expenses.update({
        where: { id: newExpense.id },
        data: { receipt_url: receiptUrl },
      });
    }

    return newExpense;
  }

  async findAllByTrip(tripId: string) {
    return this.prisma.trip_expenses.findMany({ where: { trip_id: tripId } });
  }
}