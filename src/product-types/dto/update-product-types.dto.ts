import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateProductTypesDto {
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