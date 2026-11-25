import { createHash, randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DB, type Database } from '../database/database.module';
import {
  credencialesAcceso,
  tokensVerificacion,
  usuarios,
} from '../database/schema';
import { ContrasenasService } from './contrasenas.service';
import { TokensService } from './tokens.service';

// Alfabeto seguro sin caracteres ambiguos (excluye 0, O, I, 1, L)
const ALFABETO_CODIGO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LONGITUD_CODIGO = 6;
const MAX_INTENTOS = 5;
const TTL_MINUTOS = 15;

export const hashearToken = (valor: string): string =>
  createHash('sha256').update(valor.trim().toUpperCase()).digest('hex');

export const generarCodigoSeguro = (): string => {
  let codigo = '';
  for (let i = 0; i < LONGITUD_CODIGO; i++) {
    const indice = randomInt(0, ALFABETO_CODIGO.length);
    codigo += ALFABETO_CODIGO[indice];
  }
  return codigo;
};

@Injectable()
export class TokensVerificacionService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly contrasenas: ContrasenasService,
    private readonly tokens: TokensService,
  ) {}

  /**
   * Genera un código de 6 caracteres alfanuméricos seguros y guarda su hash en tokens_verificacion.
   */
  async crearCodigo(
    usuarioId: string,
    proposito: 'verificar_correo' | 'restablecer_password',
  ): Promise<string> {
    const ahora = new Date();
    const expiraEn = new Date(ahora.getTime() + TTL_MINUTOS * 60 * 1000);

    // Invalidar tokens previos no usados del mismo propósito
    await this.db
      .update(tokensVerificacion)
      .set({ usadoEn: ahora })
      .where(
        and(
          eq(tokensVerificacion.usuarioId, usuarioId),
          eq(tokensVerificacion.proposito, proposito),
          isNull(tokensVerificacion.usadoEn),
        ),
      );

    const codigo = generarCodigoSeguro();
    const tokenHash = hashearToken(codigo);

    await this.db.insert(tokensVerificacion).values({
      usuarioId,
      proposito,
      tokenHash,
      expiraEn,
      intentos: 0,
      creadoEn: ahora,
    });

    return codigo;
  }

  /**
   * Confirma la verificación de correo mediante el código.
   */
  async verificarCorreo(correo: string, codigo: string): Promise<void> {
    const correoNorm = correo.trim().toLowerCase();
    const [usuario] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.correo, correoNorm));

    if (!usuario) {
      throw new BadRequestException('codigo_invalido');
    }

    if (usuario.correoVerificadoEn) {
      return; // Ya está verificado
    }

    const tokenHash = hashearToken(codigo);
    const ahora = new Date();

    const [tokenFila] = await this.db
      .select()
      .from(tokensVerificacion)
      .where(
        and(
          eq(tokensVerificacion.usuarioId, usuario.id),
          eq(tokensVerificacion.proposito, 'verificar_correo'),
          isNull(tokensVerificacion.usadoEn),
        ),
      );

    if (!tokenFila) {
      throw new BadRequestException('codigo_invalido');
    }

    if (tokenFila.intentos >= MAX_INTENTOS) {
      throw new ConflictException('demasiados_intentos');
    }

    if (tokenFila.expiraEn <= ahora) {
      throw new BadRequestException('codigo_expirado');
    }

    if (tokenFila.tokenHash !== tokenHash) {
      await this.db
        .update(tokensVerificacion)
        .set({ intentos: tokenFila.intentos + 1 })
        .where(eq(tokensVerificacion.id, tokenFila.id));
      throw new BadRequestException('codigo_invalido');
    }

    // Token válido: marcar usado y verificar usuario en transacción
    await this.db.transaction(async (tx) => {
      await tx
        .update(tokensVerificacion)
        .set({ usadoEn: ahora })
        .where(eq(tokensVerificacion.id, tokenFila.id));

      await tx
        .update(usuarios)
        .set({ correoVerificadoEn: ahora, actualizadoEn: ahora })
        .where(eq(usuarios.id, usuario.id));
    });
  }

  /**
   * Valida un código de recuperación sin consumirlo todavía (Paso 1).
   */
  async validarCodigoRecuperacion(correo: string, codigo: string): Promise<boolean> {
    const correoNorm = correo.trim().toLowerCase();
    const [usuario] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.correo, correoNorm));

    if (!usuario) {
      throw new BadRequestException('codigo_invalido');
    }

    const tokenHash = hashearToken(codigo);
    const ahora = new Date();

    const [tokenFila] = await this.db
      .select()
      .from(tokensVerificacion)
      .where(
        and(
          eq(tokensVerificacion.usuarioId, usuario.id),
          eq(tokensVerificacion.proposito, 'restablecer_password'),
          isNull(tokensVerificacion.usadoEn),
        ),
      );

    if (!tokenFila) {
      throw new BadRequestException('codigo_invalido');
    }

    if (tokenFila.intentos >= MAX_INTENTOS) {
      throw new ConflictException('demasiados_intentos');
    }

    if (tokenFila.expiraEn <= ahora) {
      throw new BadRequestException('codigo_expirado');
    }

    if (tokenFila.tokenHash !== tokenHash) {
      await this.db
        .update(tokensVerificacion)
        .set({ intentos: tokenFila.intentos + 1 })
        .where(eq(tokensVerificacion.id, tokenFila.id));
      throw new BadRequestException('codigo_invalido');
    }

    return true;
  }

  /**
   * Restablece la contraseña validando y consumiendo el código de recuperación (Paso 2).
   */
  async restablecerPassword(
    correo: string,
    codigo: string,
    nuevaContrasena: string,
  ): Promise<void> {
    const correoNorm = correo.trim().toLowerCase();
    const [usuario] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.correo, correoNorm));

    if (!usuario) {
      throw new BadRequestException('codigo_invalido');
    }

    const tokenHash = hashearToken(codigo);
    const ahora = new Date();

    const [tokenFila] = await this.db
      .select()
      .from(tokensVerificacion)
      .where(
        and(
          eq(tokensVerificacion.usuarioId, usuario.id),
          eq(tokensVerificacion.proposito, 'restablecer_password'),
          isNull(tokensVerificacion.usadoEn),
        ),
      );

    if (!tokenFila) {
      throw new BadRequestException('codigo_invalido');
    }

    if (tokenFila.intentos >= MAX_INTENTOS) {
      throw new ConflictException('demasiados_intentos');
    }

    if (tokenFila.expiraEn <= ahora) {
      throw new BadRequestException('codigo_expirado');
    }

    if (tokenFila.tokenHash !== tokenHash) {
      await this.db
        .update(tokensVerificacion)
        .set({ intentos: tokenFila.intentos + 1 })
        .where(eq(tokensVerificacion.id, tokenFila.id));
      throw new BadRequestException('codigo_invalido');
    }

    const nuevoPasswordHash = await this.contrasenas.hashear(nuevaContrasena);

    // Transacción: actualizar contraseña, marcar token usado y revocar sesiones activas
    await this.db.transaction(async (tx) => {
      await tx
        .update(tokensVerificacion)
        .set({ usadoEn: ahora })
        .where(eq(tokensVerificacion.id, tokenFila.id));

      await tx
        .insert(credencialesAcceso)
        .values({
          usuarioId: usuario.id,
          tipo: 'password',
          passwordHash: nuevoPasswordHash,
        })
        .onConflictDoUpdate({
          target: [credencialesAcceso.usuarioId, credencialesAcceso.tipo],
          set: {
            passwordHash: nuevoPasswordHash,
            actualizadoEn: ahora,
          },
        });
    });

    // Revocar todas las sesiones previas por seguridad al cambiar la contraseña
    await this.tokens.revocarUsuario(usuario.id);
  }
}
