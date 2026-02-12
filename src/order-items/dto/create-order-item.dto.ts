import { IsString, IsNotEmpty } from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @IsString()
  @IsNotEmpty()
  product_id: string;
}