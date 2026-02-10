import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @IsOptional() @IsString() @MaxLength(50)
  sku?: string;

  @IsString() @MaxLength(255)
  name: string;

  @IsInt() @Min(0)
  stock: number;

  // Decimal como string
  priceMxn: string;
}
