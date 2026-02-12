import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateTripExpenseDto {
  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsNumber()
  amount_usd?: number;

  @IsOptional()
  @IsNumber()
  exchange_rate_base?: number;
}