import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateTripExpenseDto {
  @IsString()
  @IsNotEmpty()
  trip_id: string;

  @IsString()
  @IsNotEmpty()
  category_id: string;

  @IsOptional()
  @IsNumber()
  amount_usd?: number;

  @IsOptional()
  @IsNumber()
  exchange_rate_base?: number;
}