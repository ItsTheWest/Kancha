import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ActualizarClubDto {
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El nombre no puede exceder los 100 caracteres.' })
  nombre?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  deporte?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  ciudad?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  logoUrl?: string;

  @IsString()
  @IsOptional()
  @IsHexColor({ message: 'El color primario debe ser un código hexadecimal válido (ej: #3ecf8e).' })
  colorPrimario?: string;

  @IsString()
  @IsOptional()
  @IsHexColor({ message: 'El color secundario debe ser un código hexadecimal válido (ej: #1f7a52).' })
  colorSecundario?: string;

  @IsString()
  @IsOptional()
  @IsHexColor({ message: 'El color de acento debe ser un código hexadecimal válido (ej: #6ef0b0).' })
  colorAcento?: string;
}
