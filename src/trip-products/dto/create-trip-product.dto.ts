import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTripProductDto {
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsNumber()
  base_price_usd?: number;
}