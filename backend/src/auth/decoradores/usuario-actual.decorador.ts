import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioAutenticado } from '../tipos';

export const UsuarioActual = createParamDecorator(
  (_: unknown, contexto: ExecutionContext): UsuarioAutenticado =>
    contexto.switchToHttp().getRequest<Request & { usuario: UsuarioAutenticado }>().usuario,
);
