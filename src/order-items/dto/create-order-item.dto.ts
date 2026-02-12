import { IsString, IsNotEmpty } from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  productId: string;
}