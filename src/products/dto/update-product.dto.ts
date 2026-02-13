import { IsOptional, IsString, IsUUID, Matches, IsNotEmpty } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Matches(/^[0-9]+(\.[0-9]{1,2})?$/, { message: 'defaultPriceUsd inválido' })
  defaultPriceUsd?: string;

  @IsOptional()
  @Matches(/^\d+$/, { message: 'stock inválido' })
  stock?: string;

  @IsOptional()
  @IsUUID()
  productTypeId?: string;

  @IsOptional()
  @IsString()
  isActive?: string; // "true" | "false"
}
