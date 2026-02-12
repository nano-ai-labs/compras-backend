import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateTripExpenseDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  amount_usd?: number;

  @IsOptional()
  @IsNumber()
  exchangeRate_base?: number;
}