import { IsString, IsOptional } from 'class-validator';

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

   @IsOptional()
  @IsString()
  status?: string; // Moved inside the class
}  
