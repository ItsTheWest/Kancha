import { IsEmail, IsNotEmpty, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class SolicitarVerificacionDto {
  @IsEmail()
  @MaxLength(254)
  correo: string;
}

export class ConfirmarVerificacionDto {
  @IsEmail()
  @MaxLength(254)
  correo: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'El código debe tener exactamente 6 caracteres.' })
  @Matches(/^[0-9A-Z]{6}$/i, { message: 'El código solo puede contener letras y números.' })
  codigo: string;
}

export class SolicitarRecuperacionDto {
  @IsEmail()
  @MaxLength(254)
  correo: string;
}

export class ValidarCodigoRecuperacionDto {
  @IsEmail()
  @MaxLength(254)
  correo: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'El código debe tener exactamente 6 caracteres.' })
  @Matches(/^[0-9A-Z]{6}$/i, { message: 'El código solo puede contener letras y números.' })
  codigo: string;
}

export class RestablecerPasswordDto {
  @IsEmail()
  @MaxLength(254)
  correo: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'El código debe tener exactamente 6 caracteres.' })
  @Matches(/^[0-9A-Z]{6}$/i, { message: 'El código solo puede contener letras y números.' })
  codigo: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(128)
  nuevaContrasena: string;
}
