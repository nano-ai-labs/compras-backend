import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateClientDto {
  @IsString() @MaxLength(100)
  name: string;

  @IsOptional() @IsString() @MaxLength(20)
  phone?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsUUID()
  userId?: string;
}
