import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  tripId: string;

  @IsUUID()
  clientId: string;

  @IsOptional() @IsString() @MaxLength(20)
  status?: string;
}
