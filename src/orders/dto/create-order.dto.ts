import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsUUID()
  tripId: string;

  @IsNotEmpty()
  @IsUUID()
  clientId: string;
}
