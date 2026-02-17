import { IsString, IsOptional, Matches } from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\d+\-\s()]{7,20}$/, { message: 'phone inválido' })
  phone?: string;
}
