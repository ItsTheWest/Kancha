import { Inject, Injectable } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import Redis from 'ioredis';
import { entornoAuth } from '../config/entorno';
import { REDIS } from '../redis/redis.module';
import type { PayloadAcceso } from './tipos';

// Único header aceptado. Se compara como cadena en vez de leer `alg` del token:
// así no existe la confusión de algoritmos (alg=none, RS256 con clave HMAC...).
const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

const CLAVE_JTI = (jti: string) => `auth:jti_revocado:${jti}`;
const CLAVE_FAMILIA = (sid: string) => `auth:familia_revocada:${sid}`;
const CLAVE_USUARIO = (sub: string) => `auth:usuario_revocado:${sub}`;

@Injectable()
export class TokensService {
  private readonly entorno = entornoAuth();

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  firmarAcceso(usuarioId: string, sesionId: string, completo = true): { token: string; expiraEn: number } {
    const ahora = Math.floor(Date.now() / 1000);
    const payload: PayloadAcceso = {
      iss: this.entorno.jwtEmisor,
      aud: this.entorno.jwtAudiencia,
      sub: usuarioId,
      sid: sesionId,
      jti: randomUUID(),
      typ: 'acceso',
      completo,
      iat: ahora,
      exp: ahora + this.entorno.accesoTtlSeg,
    };
    const cuerpo = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const firma = this.firma(`${HEADER}.${cuerpo}`);
    return { token: `${HEADER}.${cuerpo}.${firma}`, expiraEn: this.entorno.accesoTtlSeg };
  }

  // Verifica firma y claims y luego consulta las listas de revocación en Redis.
  async verificarAcceso(token: string): Promise<PayloadAcceso | null> {
    const payload = this.verificarFirmaYClaims(token);
    if (!payload) return null;

    const [jti, familia, usuario] = await this.redis.mget(
      CLAVE_JTI(payload.jti),
      CLAVE_FAMILIA(payload.sid),
      CLAVE_USUARIO(payload.sub),
    );
    if (jti || familia) return null;
    // El valor es el instante (en segundos) del "cerrar todas": solo caen los tokens
    // emitidos ANTES de ese momento; los nuevos (re-login posterior) siguen siendo válidos.
    if (usuario && payload.iat <= Number(usuario)) return null;

    return payload;
  }

  // Las listas de revocación tienen TTL igual a la vida del access token: pasada esa
  // ventana el token ya caducó por claims y la clave en Redis no hace falta.
  async revocarJti(jti: string): Promise<void> {
    await this.redis.set(CLAVE_JTI(jti), '1', 'EX', this.entorno.accesoTtlSeg);
  }

  async revocarFamilia(sid: string): Promise<void> {
    await this.redis.set(CLAVE_FAMILIA(sid), '1', 'EX', this.entorno.accesoTtlSeg);
  }

  // Marca el instante: cualquier token anterior de ese usuario queda invalidado.
  async revocarUsuario(sub: string): Promise<void> {
    const ahora = Math.floor(Date.now() / 1000);
    await this.redis.set(CLAVE_USUARIO(sub), String(ahora), 'EX', this.entorno.accesoTtlSeg);
  }

  private firma(mensaje: string): string {
    return createHmac('sha256', this.entorno.jwtSecreto).update(mensaje).digest('base64url');
  }

  private verificarFirmaYClaims(token: string): PayloadAcceso | null {
    const partes = token.split('.');
    if (partes.length !== 3) return null;
    const [header, cuerpo, firma] = partes;
    if (header !== HEADER) return null;

    const esperada = this.firma(`${header}.${cuerpo}`);
    const a = Buffer.from(firma);
    const b = Buffer.from(esperada);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    let payload: PayloadAcceso;
    try {
      payload = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8')) as PayloadAcceso;
    } catch {
      return null;
    }

    const ahora = Math.floor(Date.now() / 1000);
    if (
      payload.iss !== this.entorno.jwtEmisor ||
      payload.aud !== this.entorno.jwtAudiencia ||
      payload.typ !== 'acceso' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string' ||
      typeof payload.jti !== 'string' ||
      typeof payload.exp !== 'number' ||
      payload.exp <= ahora
    ) {
      return null;
    }

    return payload;
  }
}
