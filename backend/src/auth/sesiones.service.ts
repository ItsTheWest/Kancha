import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { entornoAuth } from '../config/entorno';
import { DB } from '../database/database.module';
import type { Database } from '../database/database.module';
import { sesiones, usuarios } from '../database/schema';
import type { MetaPeticion } from './tipos';

type MotivoRevocacion = NonNullable<typeof sesiones.$inferSelect.motivoRevocacion>;

export type ResultadoRotacion =
  | { tipo: 'ok'; usuarioId: string; familiaId: string; refreshToken: string }
  | { tipo: 'invalida' }
  // Un token ya rotado llegó sin resultado reciente en caché: alguien lo reutiliza.
  | { tipo: 'reuso'; familiaId: string; usuarioId: string }
  | { tipo: 'suspendida'; familiaId: string; usuarioId: string };

export const hashRefresh = (token: string) => createHash('sha256').update(token).digest('hex');
const nuevoRefresh = () => randomBytes(32).toString('base64url');

@Injectable()
export class SesionesService {
  private readonly entorno = entornoAuth();

  constructor(@Inject(DB) private readonly db: Database) {}

  // Abre una familia nueva (un inicio de sesión) y devuelve el refresh token en claro,
  // que es la única vez que existe fuera de la caché de idempotencia.
  async iniciar(usuarioId: string, meta: MetaPeticion) {
    const refreshToken = nuevoRefresh();
    const familiaId = randomUUID();
    const ahora = Date.now();
    await this.db.insert(sesiones).values({
      usuarioId,
      familiaId,
      refreshTokenHash: hashRefresh(refreshToken),
      expiraEn: new Date(ahora + this.entorno.refrescoTtlSeg * 1000),
      familiaExpiraEn: new Date(ahora + this.entorno.refrescoTopeTtlSeg * 1000),
      ip: meta.ip,
      agenteUsuario: meta.agente,
    });
    return { refreshToken, familiaId };
  }

  // La fila se bloquea con FOR UPDATE: dos rotaciones del mismo token se serializan y
  // la segunda ya ve la fila rotada.
  rotar(refreshToken: string, meta: MetaPeticion): Promise<ResultadoRotacion> {
    return this.db.transaction(async (tx): Promise<ResultadoRotacion> => {
      const [fila] = await tx
        .select()
        .from(sesiones)
        .where(eq(sesiones.refreshTokenHash, hashRefresh(refreshToken)))
        .for('update');
      if (!fila || fila.revocadaEn) return { tipo: 'invalida' };

      if (fila.rotadaEn) {
        await this.revocarFamiliaEn(tx, fila.familiaId, 'reuso_detectado');
        return { tipo: 'reuso', familiaId: fila.familiaId, usuarioId: fila.usuarioId };
      }

      const ahora = Date.now();
      if (fila.expiraEn.getTime() <= ahora || fila.familiaExpiraEn.getTime() <= ahora) {
        return { tipo: 'invalida' };
      }

      const [usuario] = await tx
        .select({ estado: usuarios.estado })
        .from(usuarios)
        .where(eq(usuarios.id, fila.usuarioId));
      if (!usuario || usuario.estado !== 'activo') {
        await this.revocarFamiliaEn(tx, fila.familiaId, 'cuenta_suspendida');
        return { tipo: 'suspendida', familiaId: fila.familiaId, usuarioId: fila.usuarioId };
      }

      const nuevoToken = nuevoRefresh();
      const nuevoId = randomUUID();
      // Orden obligatorio: primero la vieja deja de estar vigente (la FK es diferible y
      // se comprueba al COMMIT) y solo después entra la nueva, para respetar el índice
      // único parcial de "un token vigente por familia".
      await tx
        .update(sesiones)
        .set({ rotadaEn: new Date(ahora), reemplazadaPorId: nuevoId, ultimoUsoEn: new Date(ahora) })
        .where(eq(sesiones.id, fila.id));
      await tx.insert(sesiones).values({
        id: nuevoId,
        usuarioId: fila.usuarioId,
        familiaId: fila.familiaId,
        refreshTokenHash: hashRefresh(nuevoToken),
        generacion: fila.generacion + 1,
        // La rotación desliza la caducidad pero nunca pasa del tope absoluto.
        expiraEn: new Date(
          Math.min(ahora + this.entorno.refrescoTtlSeg * 1000, fila.familiaExpiraEn.getTime()),
        ),
        familiaExpiraEn: fila.familiaExpiraEn,
        ip: meta.ip,
        agenteUsuario: meta.agente,
      });
      return {
        tipo: 'ok',
        usuarioId: fila.usuarioId,
        familiaId: fila.familiaId,
        refreshToken: nuevoToken,
      };
    });
  }

  // Devuelve la familia cerrada para que el llamador revoque también los access tokens.
  async cerrar(refreshToken: string): Promise<string | null> {
    const [fila] = await this.db
      .select({ familiaId: sesiones.familiaId })
      .from(sesiones)
      .where(eq(sesiones.refreshTokenHash, hashRefresh(refreshToken)));
    if (!fila) return null;
    await this.revocarFamiliaEn(this.db, fila.familiaId, 'cierre_sesion');
    return fila.familiaId;
  }

  async cerrarTodas(usuarioId: string): Promise<void> {
    await this.db
      .update(sesiones)
      .set({ revocadaEn: new Date(), motivoRevocacion: 'cierre_todas' })
      .where(and(eq(sesiones.usuarioId, usuarioId), isNull(sesiones.revocadaEn)));
  }

  async revocarFamilia(familiaId: string, motivo: MotivoRevocacion): Promise<void> {
    await this.revocarFamiliaEn(this.db, familiaId, motivo);
  }

  async limpiarVencidas(): Promise<void> {
    await this.db.delete(sesiones).where(lt(sesiones.expiraEn, sql`now() - interval '30 days'`));
  }

  private async revocarFamiliaEn(
    ejecutor: Pick<Database, 'update'>,
    familiaId: string,
    motivo: MotivoRevocacion,
  ) {
    await ejecutor
      .update(sesiones)
      .set({ revocadaEn: new Date(), motivoRevocacion: motivo })
      .where(and(eq(sesiones.familiaId, familiaId), isNull(sesiones.revocadaEn)));
  }
}
