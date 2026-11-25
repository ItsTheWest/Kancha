import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class InicioSesionDto {
  @IsEmail()
  @MaxLength(254)
  correo: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  contrasena: string;
}
