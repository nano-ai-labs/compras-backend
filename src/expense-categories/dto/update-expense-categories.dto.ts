import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateExpenseCategoriesDto {
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