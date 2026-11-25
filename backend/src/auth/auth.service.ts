import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import Redis from 'ioredis';
import { DB } from '../database/database.module';
import type { Database } from '../database/database.module';
import { credencialesAcceso, sesiones, usuarios } from '../database/schema';
import { REDIS } from '../redis/redis.module';
import { ContrasenasService } from './contrasenas.service';
import type { CompletarPerfilDto } from './dto/completar-perfil.dto';
import type { InicioSesionDto } from './dto/inicio-sesion.dto';
import type { RegistroDto } from './dto/registro.dto';
import { GoogleService } from './google.service';
import { LimitadorService } from './limitador.service';
import { hashRefresh, SesionesService } from './sesiones.service';
import { TokensService } from './tokens.service';
import type { MetaPeticion, PerfilUsuario, RespuestaSesion, TokensEmitidos } from './tipos';

type FilaUsuario = typeof usuarios.$inferSelect;

const CLAVE_RESULTADO = (hash: string) => `auth:refresco:resultado:${hash}`;
const CLAVE_CERROJO = (hash: string) => `auth:refresco:cerrojo:${hash}`;
const VENTANA_IDEMPOTENCIA_SEG = 30;
const ESPERA_MAX_MS = 5000;

const esViolacionUnica = (error: unknown): boolean => {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly contrasenas: ContrasenasService,
    private readonly tokens: TokensService,
    private readonly sesiones: SesionesService,
    private readonly google: GoogleService,
    private readonly limitador: LimitadorService,
  ) {}

  async registrar(dto: RegistroDto, meta: MetaPeticion): Promise<RespuestaSesion> {
    const correo = dto.correo.trim().toLowerCase();
    const cedula = dto.cedula.trim().toUpperCase();
    const telefono = dto.telefono ? dto.telefono.trim() : null;
    const passwordHash = await this.contrasenas.hashear(dto.contrasena);
    let usuario: FilaUsuario;
    try {
      usuario = await this.db.transaction(async (tx) => {
        const [creado] = await tx
          .insert(usuarios)
          .values({
            correo,
            nombres: dto.nombres,
            apellidos: dto.apellidos,
            rol: dto.rol,
            cedula,
            telefono,
          })
          .returning();
        await tx
          .insert(credencialesAcceso)
          .values({ usuarioId: creado.id, tipo: 'password', passwordHash });
        return creado;
      });
    } catch (error) {
      if (esViolacionUnica(error)) {
        const errStr = JSON.stringify(error) + (error instanceof Error ? error.message : '');
        if (errStr.includes('cedula') || (error as { constraint?: string })?.constraint?.includes('cedula')) {
          throw new ConflictException('cedula_en_uso');
        }
        throw new ConflictException('correo_en_uso');
      }
      throw error;
    }
    return this.abrirSesion(usuario, meta);
  }

  async iniciarSesion(dto: InicioSesionDto, meta: MetaPeticion): Promise<RespuestaSesion> {
    const correo = dto.correo.trim().toLowerCase();
    const huella = this.limitador.huella(correo);
    const claveCuentaIp = `auth:cuenta:${huella}:${meta.ip}`;
    // El límite duro es por (cuenta × IP): uno solo por cuenta permitiría a cualquiera
    // bloquear a una víctima a base de intentos fallidos.
    await this.limitador.consumir(claveCuentaIp, 5, 900);
    await this.limitador.consumir(`auth:cuenta:${huella}`, 20, 3600);

    const [fila] = await this.db
      .select({ usuario: usuarios, passwordHash: credencialesAcceso.passwordHash })
      .from(usuarios)
      .leftJoin(
        credencialesAcceso,
        and(eq(credencialesAcceso.usuarioId, usuarios.id), eq(credencialesAcceso.tipo, 'password')),
      )
      .where(eq(usuarios.correo, correo))
      .limit(1);

    // Cuenta inexistente o solo-Google: misma respuesta y mismo coste que una contraseña mala.
    if (!fila?.passwordHash) {
      await this.contrasenas.verificarSenuelo(dto.contrasena);
      throw new UnauthorizedException('credenciales_invalidas');
    }
    const correcta = await this.contrasenas.verificar(fila.passwordHash, dto.contrasena);
    if (!correcta || fila.usuario.estado !== 'activo') {
      throw new UnauthorizedException('credenciales_invalidas');
    }

    await this.limitador.reiniciar(claveCuentaIp);
    await this.db
      .update(credencialesAcceso)
      .set({ ultimoAccesoEn: new Date() })
      .where(
        and(eq(credencialesAcceso.usuarioId, fila.usuario.id), eq(credencialesAcceso.tipo, 'password')),
      );
    return this.abrirSesion(fila.usuario, meta);
  }

  // Varias peticiones paralelas (navegación + prefetches) presentan el MISMO refresh
  // token. Sin coordinación la primera rota y las demás parecen un reuso y revocan la
  // familia. Capas: resultado cacheado 30 s, cerrojo en Redis, índice único parcial.
  async refrescar(refreshToken: string, meta: MetaPeticion): Promise<TokensEmitidos> {
    const hash = hashRefresh(refreshToken);
    const enCache = await this.leerResultado(hash);
    if (enCache) return enCache;

    const cerrojo = await this.redis.set(CLAVE_CERROJO(hash), '1', 'PX', 10_000, 'NX');
    if (cerrojo !== 'OK') {
      const limite = Date.now() + ESPERA_MAX_MS;
      while (Date.now() < limite) {
        await new Promise((r) => setTimeout(r, 100));
        const listo = await this.leerResultado(hash);
        if (listo) return listo;
      }
      throw new ConflictException('refresco_en_curso');
    }

    try {
      // Quien tomó el cerrojo justo después de que otro terminara ya encuentra su resultado.
      const tardio = await this.leerResultado(hash);
      if (tardio) return tardio;

      let resultado;
      try {
        resultado = await this.sesiones.rotar(refreshToken, meta);
      } catch (error) {
        // El índice parcial frenó una rotación paralela: es una carrera, no un reuso.
        if (esViolacionUnica(error)) throw new ConflictException('refresco_en_curso');
        throw error;
      }

      if (resultado.tipo === 'reuso' || resultado.tipo === 'suspendida') {
        await this.tokens.revocarFamilia(resultado.familiaId);
        console.log(
          `[auth] ${resultado.tipo} usuario=${resultado.usuarioId} familia=${resultado.familiaId}`,
        );
        throw new UnauthorizedException('sesion_invalida');
      }
      if (resultado.tipo === 'invalida') throw new UnauthorizedException('sesion_invalida');

      const [usuario] = await this.db
        .select()
        .from(usuarios)
        .where(eq(usuarios.id, resultado.usuarioId));
      if (!usuario || usuario.estado !== 'activo') {
        throw new UnauthorizedException('sesion_invalida');
      }

      const completo = Boolean(usuario.rol && usuario.cedula);
      const tokens = this.tokens.firmarAcceso(resultado.usuarioId, resultado.familiaId, completo);
      const salida: TokensEmitidos = {
        accessToken: tokens.token,
        refreshToken: resultado.refreshToken,
        expiraEn: tokens.expiraEn,
      };
      await this.redis.set(CLAVE_RESULTADO(hash), JSON.stringify(salida), 'EX', VENTANA_IDEMPOTENCIA_SEG);
      this.limpiezaOportunista();
      return salida;
    } finally {
      await this.redis.del(CLAVE_CERROJO(hash));
    }
  }

  async cerrarSesion(refreshToken: string): Promise<void> {
    const familiaId = await this.sesiones.cerrar(refreshToken);
    if (familiaId) await this.tokens.revocarFamilia(familiaId);
  }

  async cerrarTodas(usuarioId: string): Promise<void> {
    await this.tokens.revocarUsuario(usuarioId);
    await this.sesiones.cerrarTodas(usuarioId);
  }

  async perfil(usuarioId: string): Promise<PerfilUsuario> {
    const [usuario] = await this.db.select().from(usuarios).where(eq(usuarios.id, usuarioId));
    if (!usuario) throw new UnauthorizedException('usuario_no_encontrado');
    return this.aPerfil(usuario);
  }

  async completarPerfil(usuarioId: string, dto: CompletarPerfilDto, meta: MetaPeticion): Promise<RespuestaSesion> {
    const cedula = dto.cedula.trim().toUpperCase();
    const telefono = dto.telefono ? dto.telefono.trim() : null;
    let actualizado: FilaUsuario;
    try {
      const [u] = await this.db
        .update(usuarios)
        .set({
          rol: dto.rol,
          cedula,
          telefono,
          actualizadoEn: new Date(),
        })
        .where(eq(usuarios.id, usuarioId))
        .returning();

      if (!u) throw new NotFoundException('usuario_no_encontrado');
      actualizado = u;
    } catch (error) {
      if (esViolacionUnica(error)) {
        throw new ConflictException('cedula_en_uso');
      }
      throw error;
    }
    return this.abrirSesion(actualizado, meta);
  }

  proveedores() {
    return { google: this.google.disponible() };
  }

  async iniciarGoogle(siguiente: string | undefined) {
    return this.google.inicio(siguiente);
  }

  async entrarConGoogle(codigo: string, estado: string, meta: MetaPeticion) {
    const identidad = await this.google.canjear(codigo, estado);

    let vinculo: { usuario: FilaUsuario; revocarSesionesPrevias: boolean; nuevo: boolean };
    try {
      vinculo = await this.vincularGoogle(identidad);
    } catch (error) {
      // Dos inicios simultáneos con el mismo correo/sub chocan con los UNIQUE.
      if (esViolacionUnica(error)) throw new ConflictException('google_ya_vinculado');
      throw error;
    }
    if (vinculo.usuario.estado !== 'activo') throw new UnauthorizedException('credenciales_invalidas');
    if (vinculo.revocarSesionesPrevias) await this.tokens.revocarUsuario(vinculo.usuario.id);

    const respuesta = await this.abrirSesion(vinculo.usuario, meta);
    // Si el usuario no tiene rol ni cédula, se le envía a completar perfil.
    const perfilIncompleto = !vinculo.usuario.rol || !vinculo.usuario.cedula;
    const destinoFinal = perfilIncompleto ? '/completar-perfil' : identidad.siguiente;

    return { ...respuesta, siguiente: destinoFinal };
  }

  // Vinculación por correo. El riesgo real: como el registro no verifica el correo, un
  // atacante pudo registrar el correo de la víctima con su propia contraseña. Si la
  // víctima entra luego con Google y solo "vinculáramos", esa contraseña seguiría viva.
  private vincularGoogle(identidad: {
    sub: string;
    correo: string;
    nombres: string | null;
    apellidos: string | null;
    siguiente: string;
  }) {
    const esOrigenRegistro = identidad.siguiente.includes('origen=registro');

    return this.db.transaction(async (tx) => {
      const [porSub] = await tx
        .select({ usuario: usuarios })
        .from(credencialesAcceso)
        .innerJoin(usuarios, eq(usuarios.id, credencialesAcceso.usuarioId))
        .where(and(eq(credencialesAcceso.tipo, 'google'), eq(credencialesAcceso.googleSub, identidad.sub)));
      if (porSub) {
        if (esOrigenRegistro) {
          // El usuario intentó registrarse pero ya tenía cuenta vinculada
          throw new ConflictException('correo_en_uso');
        }
        return { usuario: porSub.usuario, revocarSesionesPrevias: false, nuevo: false };
      }

      const [existente] = await tx
        .select()
        .from(usuarios)
        .where(eq(usuarios.correo, identidad.correo))
        .for('update');

      if (existente && esOrigenRegistro) {
        // La cuenta con este correo ya existe previamente en la base de datos
        throw new ConflictException('correo_en_uso');
      }

      if (!existente) {
        const parteLocal = identidad.correo.split('@')[0] || 'Usuario';
        const [creado] = await tx
          .insert(usuarios)
          .values({
            correo: identidad.correo,
            nombres: identidad.nombres?.trim() || parteLocal,
            apellidos: identidad.apellidos?.trim() || '—',
            correoVerificadoEn: new Date(),
          })
          .returning();
        await tx
          .insert(credencialesAcceso)
          .values({ usuarioId: creado.id, tipo: 'google', googleSub: identidad.sub });
        return { usuario: creado, revocarSesionesPrevias: false, nuevo: true };
      }

      // 4a. El sub es el único identificador estable de Google; el correo se recicla.
      const [googleActual] = await tx
        .select({ id: credencialesAcceso.id })
        .from(credencialesAcceso)
        .where(and(eq(credencialesAcceso.usuarioId, existente.id), eq(credencialesAcceso.tipo, 'google')));
      if (googleActual) throw new ConflictException('google_ya_vinculado');

      // 4b. Nadie demostró ser dueño del correo; Google sí. Se descarta la contraseña
      // y se cierran las sesiones abiertas con ella.
      let revocarSesionesPrevias = false;
      if (!existente.correoVerificadoEn) {
        const borradas = await tx
          .delete(credencialesAcceso)
          .where(and(eq(credencialesAcceso.usuarioId, existente.id), eq(credencialesAcceso.tipo, 'password')))
          .returning({ id: credencialesAcceso.id });
        await tx
          .update(sesiones)
          .set({ revocadaEn: new Date(), motivoRevocacion: 'password_cambiada' })
          .where(eq(sesiones.usuarioId, existente.id));
        revocarSesionesPrevias = borradas.length > 0;
        await tx
          .update(usuarios)
          .set({ correoVerificadoEn: new Date() })
          .where(eq(usuarios.id, existente.id));
        if (borradas.length > 0) {
          console.log(`[auth] usuario=${existente.id} contraseña sin verificar descartada al vincular Google`);
        }
      }

      await tx
        .insert(credencialesAcceso)
        .values({ usuarioId: existente.id, tipo: 'google', googleSub: identidad.sub });
      return { usuario: existente, revocarSesionesPrevias, nuevo: false };
    });
  }

  private async abrirSesion(usuario: FilaUsuario, meta: MetaPeticion): Promise<RespuestaSesion> {
    const { refreshToken, familiaId } = await this.sesiones.iniciar(usuario.id, meta);
    const completo = Boolean(usuario.rol && usuario.cedula);
    const acceso = this.tokens.firmarAcceso(usuario.id, familiaId, completo);
    return {
      usuario: this.aPerfil(usuario),
      accessToken: acceso.token,
      refreshToken,
      expiraEn: acceso.expiraEn,
    };
  }

  private aPerfil(usuario: FilaUsuario): PerfilUsuario {
    return {
      id: usuario.id,
      codigoPublico: usuario.codigoPublico,
      correo: usuario.correo,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      rol: (usuario.rol as 'jugador' | 'propietario') ?? null,
      cedula: usuario.cedula ?? null,
      telefono: usuario.telefono ?? null,
      correoVerificadoEn: usuario.correoVerificadoEn,
      estado: usuario.estado,
    };
  }

  private async leerResultado(hash: string): Promise<TokensEmitidos | null> {
    const crudo = await this.redis.get(CLAVE_RESULTADO(hash));
    return crudo ? (JSON.parse(crudo) as TokensEmitidos) : null;
  }

  // Como mucho una vez al día y sin @nestjs/schedule: el cerrojo en Redis lo garantiza.
  private limpiezaOportunista() {
    this.redis
      .set('auth:limpieza', '1', 'EX', 86400, 'NX')
      .then((r) => (r === 'OK' ? this.sesiones.limpiarVencidas() : undefined))
      .catch((error) => console.log(`[auth] limpieza fallida: ${(error as Error).message}`));
  }
}
