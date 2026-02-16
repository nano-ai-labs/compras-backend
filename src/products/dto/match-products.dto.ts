import { IsInt, IsUUID, Max, Min, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class MatchProductsDto {
  @IsUUID()
  brandId: string;

  @IsUUID()
  productVariantId: string;

  @IsUUID()
  colorId: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 6;
}
