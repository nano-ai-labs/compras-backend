import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateOrderPaymentDto {
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @IsNumber()
  @IsNotEmpty()
  amount_mxn: number;
}