import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional() @IsString() @MaxLength(20)
  status?: string;
}
