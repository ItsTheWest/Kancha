import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LimitePorIp } from './decoradores/limite.decorador';
import { Publico } from './decoradores/publico.decorador';
import { UsuarioActual } from './decoradores/usuario-actual.decorador';
import { CompletarPerfilDto } from './dto/completar-perfil.dto';
import { GoogleCallbackDto, GoogleInicioDto } from './dto/google.dto';
import { InicioSesionDto } from './dto/inicio-sesion.dto';
import {
  ConfirmarVerificacionDto,
  RestablecerPasswordDto,
  SolicitarRecuperacionDto,
  SolicitarVerificacionDto,
  ValidarCodigoRecuperacionDto,
} from './dto/recuperacion.dto';
import { RefrescoDto } from './dto/refresco.dto';
import { RegistroDto } from './dto/registro.dto';
import { GuardiaLimite } from './guardias/limite.guard';
import type { MetaPeticion, UsuarioAutenticado } from './tipos';

// Con `trust proxy` activo, `req.ip` es la IP que el BFF reenvía en X-Forwarded-For.
const meta = (req: Request): MetaPeticion => ({
  ip: req.ip ?? 'desconocida',
  agente: req.headers['user-agent']?.slice(0, 400) ?? null,
});

@Controller('auth')
@UseGuards(GuardiaLimite)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @LimitePorIp('registro', 5, 3600)
  @Post('registro')
  registro(@Body() dto: RegistroDto, @Req() req: Request) {
    return this.auth.registrar(dto, meta(req));
  }

  @Publico()
  @LimitePorIp('login', 10, 900)
  @HttpCode(200)
  @Post('sesion')
  iniciarSesion(@Body() dto: InicioSesionDto, @Req() req: Request) {
    return this.auth.iniciarSesion(dto, meta(req));
  }

  @Publico()
  @LimitePorIp('refresco', 60, 3600)
  @HttpCode(200)
  @Post('sesion/refrescar')
  refrescar(@Body() dto: RefrescoDto, @Req() req: Request) {
    return this.auth.refrescar(dto.refreshToken, meta(req));
  }

  // Público a propósito: se cierra sesión con el refresh token aunque el access ya venció.
  @Publico()
  @HttpCode(204)
  @Delete('sesion')
  async cerrarSesion(@Body() dto: RefrescoDto) {
    await this.auth.cerrarSesion(dto.refreshToken);
  }

  @HttpCode(204)
  @Delete('sesiones')
  async cerrarTodas(@UsuarioActual() usuario: UsuarioAutenticado) {
    await this.auth.cerrarTodas(usuario.id);
  }

  @Get('perfil')
  perfil(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.auth.perfil(usuario.id);
  }

  @Post('perfil/completar')
  @HttpCode(200)
  completarPerfil(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CompletarPerfilDto,
    @Req() req: Request,
  ) {
    return this.auth.completarPerfil(usuario.id, dto, meta(req));
  }

  @Publico()
  @LimitePorIp('verificacion', 5, 900)
  @HttpCode(200)
  @Post('verificar-correo/solicitar')
  async solicitarVerificacion(@Body() dto: SolicitarVerificacionDto) {
    await this.auth.solicitarVerificacionCorreo(dto.correo);
    return { ok: true };
  }

  @Publico()
  @LimitePorIp('verificacion', 10, 900)
  @HttpCode(200)
  @Post('verificar-correo/confirmar')
  async confirmarVerificacion(@Body() dto: ConfirmarVerificacionDto) {
    await this.auth.confirmarVerificacionCorreo(dto.correo, dto.codigo);
    return { ok: true };
  }

  @Publico()
  @LimitePorIp('recuperacion', 5, 900)
  @HttpCode(200)
  @Post('recuperar-password/solicitar')
  async solicitarRecuperacion(@Body() dto: SolicitarRecuperacionDto) {
    await this.auth.solicitarRecuperacionPassword(dto.correo);
    return { ok: true };
  }

  @Publico()
  @LimitePorIp('recuperacion', 10, 900)
  @HttpCode(200)
  @Post('recuperar-password/validar')
  async validarCodigoRecuperacion(@Body() dto: ValidarCodigoRecuperacionDto) {
    await this.auth.validarCodigoRecuperacion(dto.correo, dto.codigo);
    return { ok: true };
  }

  @Publico()
  @LimitePorIp('recuperacion', 10, 900)
  @HttpCode(200)
  @Post('recuperar-password/confirmar')
  async confirmarRecuperacion(@Body() dto: RestablecerPasswordDto) {
    await this.auth.confirmarRecuperacionPassword(
      dto.correo,
      dto.codigo,
      dto.nuevaContrasena,
    );
    return { ok: true };
  }

  @Publico()
  @Get('proveedores')
  proveedores() {
    return this.auth.proveedores();
  }

  @Publico()
  @LimitePorIp('oauth', 20, 3600)
  @Get('google/inicio')
  googleInicio(@Query() consulta: GoogleInicioDto) {
    return this.auth.iniciarGoogle(consulta.siguiente);
  }

  @Publico()
  @LimitePorIp('oauth', 20, 3600)
  @HttpCode(200)
  @Post('google/callback')
  googleCallback(@Body() dto: GoogleCallbackDto, @Req() req: Request) {
    return this.auth.entrarConGoogle(dto.codigo, dto.estado, meta(req));
  }
}
