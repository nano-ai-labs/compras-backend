import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateItemDto {
  @IsUUID()
  orderId: string;

  @IsUUID()
  productId: string;

  @IsInt() @Min(1)
  quantity: number;
}
