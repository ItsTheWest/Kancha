import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ContrasenasService } from './contrasenas.service';
import { GoogleService } from './google.service';
import { GuardiaJwt } from './guardias/jwt.guard';
import { GuardiaLimite } from './guardias/limite.guard';
import { LimitadorService } from './limitador.service';
import { SesionesService } from './sesiones.service';
import { TokensService } from './tokens.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    ContrasenasService,
    GoogleService,
    GuardiaLimite,
    LimitadorService,
    SesionesService,
    TokensService,
    // Global: toda ruta exige sesión salvo las marcadas con @Publico().
    { provide: APP_GUARD, useClass: GuardiaJwt },
  ],
})
export class AuthModule {}
