import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsNumber()
  default_price_usd?: number;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsString()
  @IsNotEmpty()
  product_type_id: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;
}