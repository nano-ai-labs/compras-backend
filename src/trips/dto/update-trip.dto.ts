import { IsString, IsOptional } from 'class-validator';

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;
}