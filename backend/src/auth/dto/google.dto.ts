import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class GoogleInicioDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  siguiente?: string;
}

export class GoogleCallbackDto {
  @IsString()
  @MaxLength(2048)
  codigo: string;

  @IsString()
  @Length(20, 100)
  estado: string;
}
