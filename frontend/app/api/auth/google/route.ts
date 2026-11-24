import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ipDe, llamarApi } from '../../../../lib/api';
import { COOKIE_OAUTH, TTL_OAUTH_SEG, opcionesCookie, rutaSegura, urlPublica } from '../../../../lib/cookies';

// Inicio del flujo: pide al backend la URL de Google y guarda el `state` en una cookie
// para compararlo a la vuelta (la otra mitad vive en Redis, en el backend).
export async function GET(peticion: NextRequest) {
  const siguiente = rutaSegura(peticion.nextUrl.searchParams.get('siguiente'));
  const respuesta = await llamarApi<{ url: string; estado: string }>(
    `/auth/google/inicio?siguiente=${encodeURIComponent(siguiente)}`,
    { ip: ipDe(peticion.headers), agente: peticion.headers.get('user-agent') },
  );
  if (!respuesta.ok || !respuesta.datos) {
    return NextResponse.redirect(urlPublica('/login?error=google'));
  }

  const destino = NextResponse.redirect(respuesta.datos.url);
  // Path acotado al callback; sameSite lax (nunca strict, ver lib/cookies.ts).
  destino.cookies.set(
    COOKIE_OAUTH,
    respuesta.datos.estado,
    opcionesCookie(TTL_OAUTH_SEG, '/api/auth'),
  );
  return destino;
}
