import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { LIMITE_IP, OpcionesLimite } from '../decoradores/limite.decorador';
import { LimitadorService } from '../limitador.service';

@Injectable()
export class GuardiaLimite implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limitador: LimitadorService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const opciones = this.reflector.get<OpcionesLimite | undefined>(
      LIMITE_IP,
      contexto.getHandler(),
    );
    if (!opciones) return true;
    const ip = contexto.switchToHttp().getRequest<Request>().ip ?? 'desconocida';
    await this.limitador.consumir(
      `auth:ip:${ip}:${opciones.clave}`,
      opciones.maximo,
      opciones.ventanaSeg,
    );
    return true;
  }
}
