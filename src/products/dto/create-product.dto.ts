import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateProductDto {
  // ✅ para casar Product con TripProduct al crear
  @IsUUID()
  tripId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  // Decimal en string: "10", "10.5", "10.50"
  @Matches(/^[0-9]+(\.[0-9]{1,2})?$/, { message: 'defaultPriceUsd inválido' })
  defaultPriceUsd: string;

  // multipart llega como string
  @Matches(/^\d+$/, { message: 'stock inválido' })
  stock: string;

  @IsUUID()
  productTypeId: string;

  // opcional, pero en tu FE lo mandamos "true"
  @IsOptional()
  @IsString()
  isActive?: string; // "true" | "false"
}
