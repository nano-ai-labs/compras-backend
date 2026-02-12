import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateExpenseCategoriesDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}