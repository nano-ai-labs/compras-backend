import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;
}  @IsOptional()\n  @IsString()\n  status?: string;
