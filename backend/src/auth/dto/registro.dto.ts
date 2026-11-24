import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegistroDto {
  @IsEmail()
  @MaxLength(254)
  correo: string;

  // Largo mínimo sin reglas de composición (NIST 800-63B). El máximo evita usar
  // argon2 como amplificador de CPU.
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  contrasena: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellidos: string;
}
