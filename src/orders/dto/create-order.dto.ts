import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  tripId: string;

  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
