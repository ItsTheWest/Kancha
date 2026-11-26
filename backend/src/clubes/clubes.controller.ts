import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorador';
import type { UsuarioAutenticado } from '../auth/tipos';
import { ClubesService } from './clubes.service';
import { ActualizarClubDto } from './dto/actualizar-club.dto';
import { CrearClubDto } from './dto/crear-club.dto';

@Controller('clubes')
export class ClubesController {
  constructor(private readonly clubesService: ClubesService) {}

  @Post()
  @HttpCode(201)
  crear(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CrearClubDto,
  ) {
    return this.clubesService.crearClub(usuario.id, dto);
  }

  @Get('mis-clubes')
  misClubes(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.clubesService.misClubes(usuario.id);
  }

  @Get(':idOSlug')
  obtener(
    @Param('idOSlug') idOSlug: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.clubesService.obtenerPorIdOSlug(idOSlug, usuario.id);
  }

  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: ActualizarClubDto,
  ) {
    return this.clubesService.actualizarClub(id, usuario.id, dto);
  }
}
