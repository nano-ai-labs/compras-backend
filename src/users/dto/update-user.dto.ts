import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsString() @MaxLength(100)
  fullName?: string;

  @IsOptional() @IsString() @MaxLength(20)
  role?: string;

  // Admin global se recomienda manejarlo SOLO por DB/scripts,
  // pero si lo quieres exponer vía API, déjalo; si no, bórralo.
  @IsOptional() @IsBoolean()
  isGlobalAdmin?: boolean;
}