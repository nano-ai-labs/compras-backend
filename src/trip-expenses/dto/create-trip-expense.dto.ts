import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateTripExpenseDto {
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsNumber()
  amount_usd?: number;

  @IsOptional()
  @IsNumber()
  exchangeRate_base?: number;
}