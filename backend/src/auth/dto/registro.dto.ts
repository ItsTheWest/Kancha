import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

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

  @IsIn(['jugador', 'propietario'], {
    message: 'El rol debe ser jugador o propietario.',
  })
  rol: 'jugador' | 'propietario';

  @Transform(recortar)
  @IsString()
  @Matches(/^[VEJGC][0-9]{6,10}$/, {
    message: 'El documento debe comenzar por V, E, J, G o C seguido de 6 a 10 dígitos numéricos.',
  })
  cedula: string;

  @Transform(recortar)
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'El teléfono debe contener entre 10 y 15 dígitos.',
  })
  telefono?: string;
}
