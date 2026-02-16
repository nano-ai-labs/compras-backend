import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @IsUUID()
  tripId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  defaultPriceUsd: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  stock: number;

  @IsUUID()
  productTypeId: string;

  @IsUUID()
  productVariantId: string;

  @IsUUID()
  brandId: string;

  @IsUUID()
  colorId: string;

  @IsOptional()
  @IsString()
  isActive?: string; // "true" | "false"
}
