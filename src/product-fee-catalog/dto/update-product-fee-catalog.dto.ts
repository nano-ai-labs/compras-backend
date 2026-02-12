import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateProductFeeCatalogDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}