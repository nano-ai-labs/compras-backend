import { IsString, IsNotEmpty, IsNumber, IsEnum, IsDateString, IsOptional } from 'class-validator';

export class CreateOrderPaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsNumber()
  @IsNotEmpty()
  amountMxn: number;

  @IsString()
  @IsNotEmpty()
  method: string; // O usa un Enum si lo definiste en Prisma

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}