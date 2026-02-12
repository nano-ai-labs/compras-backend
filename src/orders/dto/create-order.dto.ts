import { IsString, IsNotEmpty } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  trip_id: string;

  @IsString()
  @IsNotEmpty()
  client_id: string;
}