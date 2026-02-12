import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateOrderPaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsNumber()
  @IsNotEmpty()
  amountMxn: number;
}