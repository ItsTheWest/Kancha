import {
  BadGatewayException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import { entornoAuth } from '../config/entorno';
import { REDIS } from '../redis/redis.module';

const URL_AUTORIZACION = 'https://accounts.google.com/o/oauth2/v2/auth';
const URL_TOKEN = 'https://oauth2.googleapis.com/token';
const EMISORES = ['https://accounts.google.com', 'accounts.google.com'];
const TTL_ESTADO_SEG = 600;

const CLAVE_ESTADO = (estado: string) => `auth:google:estado:${estado}`;

interface DatosEstado {
  verifier: string;
  nonce: string;
  siguiente: string;
}

export interface IdentidadGoogle {
  sub: string;
  correo: string;
  nombres: string | null;
  apellidos: string | null;
  siguiente: string;
}

// Solo rutas relativas del propio sitio: rechaza `//host` y `/\host` (open redirect).
export function rutaSegura(ruta: unknown): string {
  if (typeof ruta !== 'string' || ruta.length > 512) return '/';
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta.startsWith('/\\')) return '/';
  return ruta;
}

@Injectable()
export class GoogleService {
  private readonly config = entornoAuth().google;

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  disponible(): boolean {
    return this.config !== null;
  }

  async inicio(siguiente: string | undefined): Promise<{ url: string; estado: string }> {
    const config = this.exigirConfig();
    const estado = randomBytes(32).toString('base64url');
    // El verifier de PKCE nunca sale del backend: solo viaja su hash (el challenge).
    const verifier = randomBytes(32).toString('base64url');
    const nonce = randomBytes(16).toString('base64url');
    const datos: DatosEstado = { verifier, nonce, siguiente: rutaSegura(siguiente) };
    await this.redis.set(CLAVE_ESTADO(estado), JSON.stringify(datos), 'EX', TTL_ESTADO_SEG);

    const parametros = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: estado,
      nonce,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      // Sin refresh token de Google: no vamos a llamar a sus APIs, solo identificar.
      access_type: 'online',
      prompt: 'select_account',
    });
    return { url: `${URL_AUTORIZACION}?${parametros}`, estado };
  }

  async canjear(codigo: string, estado: string): Promise<IdentidadGoogle> {
    const config = this.exigirConfig();
    // GETDEL es atómico: el estado se consume y el mismo código no se puede repetir.
    const crudo = await this.redis.getdel(CLAVE_ESTADO(estado));
    if (!crudo) throw new UnauthorizedException('estado_invalido');
    const datos = JSON.parse(crudo) as DatosEstado;

    let respuesta: Response;
    try {
      respuesta = await fetch(URL_TOKEN, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: codigo,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code',
          code_verifier: datos.verifier,
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new BadGatewayException('google_no_disponible');
    }
    if (!respuesta.ok) throw new UnauthorizedException('codigo_invalido');

    const { id_token: idToken } = (await respuesta.json()) as { id_token?: string };
    const claims = idToken ? this.leerClaims(idToken) : null;
    if (!claims) throw new UnauthorizedException('id_token_invalido');

    // No se verifica la firma del id_token porque llega directo del endpoint de token
    // de Google por HTTPS (servidor a servidor), caso en que su guía permite omitirla.
    // Si algún día se aceptan id_token que lleguen del navegador, la firma pasa a ser
    // obligatoria (JWKS de Google).
    const ahora = Math.floor(Date.now() / 1000);
    const verificado = claims.email_verified === true || claims.email_verified === 'true';
    if (
      !EMISORES.includes(String(claims.iss)) ||
      claims.aud !== config.clientId ||
      typeof claims.exp !== 'number' ||
      claims.exp <= ahora ||
      claims.nonce !== datos.nonce ||
      typeof claims.sub !== 'string' ||
      !claims.sub ||
      typeof claims.email !== 'string' ||
      // Regla absoluta: un correo sin verificar en Google no prueba nada.
      !verificado
    ) {
      throw new UnauthorizedException('id_token_invalido');
    }

    return {
      sub: claims.sub,
      correo: claims.email.toLowerCase(),
      nombres: typeof claims.given_name === 'string' ? claims.given_name : null,
      apellidos: typeof claims.family_name === 'string' ? claims.family_name : null,
      siguiente: datos.siguiente,
    };
  }

  private leerClaims(idToken: string): Record<string, unknown> | null {
    const partes = idToken.split('.');
    if (partes.length !== 3) return null;
    try {
      return JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    } catch {
      return null;
    }
  }

  private exigirConfig() {
    if (!this.config) throw new NotFoundException('google_no_configurado');
    return this.config;
  }
}
