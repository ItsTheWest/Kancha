import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CompletarPerfilDto {
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
