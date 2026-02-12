import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateExchangeRuleCatalogDto {
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