import { IsNotEmpty, IsUUID } from 'class-validator';

export class OrderDetailQueryDto {
  @IsNotEmpty()
  @IsUUID()
  tripId: string;
}
