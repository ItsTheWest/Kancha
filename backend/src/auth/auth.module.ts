import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ContrasenasService } from './contrasenas.service';
import { CorreoService } from './correo.service';
import { GoogleService } from './google.service';
import { GuardiaJwt } from './guardias/jwt.guard';
import { GuardiaLimite } from './guardias/limite.guard';
import { LimitadorService } from './limitador.service';
import { SesionesService } from './sesiones.service';
import { TokensVerificacionService } from './tokens-verificacion.service';
import { TokensService } from './tokens.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    ContrasenasService,
    CorreoService,
    GoogleService,
    GuardiaLimite,
    LimitadorService,
    SesionesService,
    TokensService,
    TokensVerificacionService,
    // Global: toda ruta exige sesión salvo las marcadas con @Publico().
    { provide: APP_GUARD, useClass: GuardiaJwt },
  ],
})
export class AuthModule {}
