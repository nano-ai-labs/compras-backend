import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  // ✅ para casar Product -> TripProduct
  @IsUUID()
  tripId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  // multipart/form-data llega como string
  @IsString()
  @IsNotEmpty()
  defaultPriceUsd: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  stock: number;

  // ✅ catálogos obligatorios según tu schema
  @IsUUID()
  productTypeId: string;

  @IsUUID()
  productVariantId: string;

  @IsUUID()
  brandId: string;

  @IsUUID()
  colorId: string;

  // opcional (si quieres permitir crear inactivo desde UI)
  @IsOptional()
  @IsString()
  isActive?: string; // "true" | "false"
}
