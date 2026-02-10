import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTripDto {
  @IsString() @MaxLength(100)
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional() @IsString() @MaxLength(20)
  status?: string;
}
