import { SetMetadata } from '@nestjs/common';

export const LIMITE_IP = 'limiteIp';

export interface OpcionesLimite {
  clave: string;
  maximo: number;
  ventanaSeg: number;
}

// Límite por IP para una ruta; los límites por cuenta viven en AuthService.
export const LimitePorIp = (clave: string, maximo: number, ventanaSeg: number) =>
  SetMetadata(LIMITE_IP, { clave, maximo, ventanaSeg } satisfies OpcionesLimite);
