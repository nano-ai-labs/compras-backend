import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class UpdateTripProductDto {
  @IsOptional()
  @IsString()
  basePriceUsd?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}
