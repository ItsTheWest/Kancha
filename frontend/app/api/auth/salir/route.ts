import { NextResponse } from 'next/server';
import { COOKIE_ACCESO, COOKIE_REFRESCO, urlPublica } from '../../../../lib/cookies';

// Destino de requerirSesion() cuando el backend rechaza la sesión: borra las cookies
// de quien llama (solo las suyas) y lo manda a /login. Un Server Component no puede
// escribir cookies, por eso esto vive en un route handler.
export async function GET() {
  const respuesta = NextResponse.redirect(urlPublica('/login'));
  respuesta.cookies.delete(COOKIE_ACCESO);
  respuesta.cookies.delete(COOKIE_REFRESCO);
  return respuesta;
}
