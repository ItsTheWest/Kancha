import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ES_PUBLICO } from '../decoradores/publico.decorador';
import { TokensService } from '../tokens.service';
import type { UsuarioAutenticado } from '../tipos';

// Guardia global: todo exige access token salvo lo marcado con @Publico().
@Injectable()
export class GuardiaJwt implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const publico = this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (publico) return true;

    const peticion = contexto
      .switchToHttp()
      .getRequest<Request & { usuario?: UsuarioAutenticado }>();
    const [esquema, token] = (peticion.headers.authorization ?? '').split(' ');
    if (esquema !== 'Bearer' || !token) throw new UnauthorizedException('no_autenticado');

    const payload = await this.tokens.verificarAcceso(token);
    if (!payload) throw new UnauthorizedException('no_autenticado');
    peticion.usuario = { id: payload.sub, sesionId: payload.sid };
    return true;
  }
}
