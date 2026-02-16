import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AttachTripProductDto {
  @IsUUID()
  productId: string;

  // opcional (si quieres override por viaje)
  @IsOptional()
  @IsString()
  basePriceUsd?: string;
}
