import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ipDe, llamarApi } from '../../../../../lib/api';
import {
  COOKIE_ACCESO,
  COOKIE_OAUTH,
  COOKIE_REFRESCO,
  TTL_REFRESCO_SEG,
  opcionesCookie,
  rutaSegura,
  urlPublica,
} from '../../../../../lib/cookies';
import type { TokensSesion } from '../../../../../lib/cookies';

export async function GET(peticion: NextRequest) {
  const parametros = peticion.nextUrl.searchParams;
  const codigo = parametros.get('code');
  const estado = parametros.get('state');
  const guardado = peticion.cookies.get(COOKIE_OAUTH)?.value;

  const fallar = (motivo: string) => {
    const respuesta = NextResponse.redirect(urlPublica(`/login?error=${motivo}`));
    respuesta.cookies.delete({ name: COOKIE_OAUTH, path: '/api/auth' });
    return respuesta;
  };

  // El usuario canceló en Google, o el state no coincide con el de este navegador (CSRF).
  if (parametros.get('error') || !codigo || !estado || !guardado || guardado !== estado) {
    return fallar('google');
  }

  const respuesta = await llamarApi<TokensSesion & { siguiente: string }>('/auth/google/callback', {
    metodo: 'POST',
    cuerpo: { codigo, estado },
    ip: ipDe(peticion.headers),
    agente: peticion.headers.get('user-agent'),
  });
  if (!respuesta.ok || !respuesta.datos) {
    return fallar(respuesta.codigo === 'google_ya_vinculado' ? 'google_vinculado' : 'google');
  }

  const destino = NextResponse.redirect(urlPublica(rutaSegura(respuesta.datos.siguiente)));
  destino.cookies.set(COOKIE_ACCESO, respuesta.datos.accessToken, opcionesCookie(respuesta.datos.expiraEn));
  destino.cookies.set(COOKIE_REFRESCO, respuesta.datos.refreshToken, opcionesCookie(TTL_REFRESCO_SEG));
  destino.cookies.delete({ name: COOKIE_OAUTH, path: '/api/auth' });
  return destino;
}
