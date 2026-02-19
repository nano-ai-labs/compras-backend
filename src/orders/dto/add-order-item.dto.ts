import { Transform } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddOrderItemDto {
  @IsUUID()
  tripProductId: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  quantity: number = 1;
}
