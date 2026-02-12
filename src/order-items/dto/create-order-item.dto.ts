import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsNotEmpty()
  base_price_usd: number; // Asegúrate de que el nombre coincida exactamente
}