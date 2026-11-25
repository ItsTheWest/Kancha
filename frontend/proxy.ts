import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ipDe, llamarApi } from './lib/api';
import {
  COOKIE_ACCESO,
  COOKIE_REFRESCO,
  TTL_REFRESCO_SEG,
  opcionesCookie,
  urlPublica,
} from './lib/cookies';
import type { TokensSesion } from './lib/cookies';
import { caducado, leerPayload } from './lib/jwt';

// En Next 16 el middleware se llama "proxy"; es la misma funcionalidad.
// Es una puerta de UX: solo mira `exp`. El límite real de autorización es el guard de Nest.

const RUTAS_PUBLICAS = [
  '/login',
  '/registro',
  '/recuperar-password',
  '/recuperar-password/confirmar',
];

const esPublica = (ruta: string) =>
  RUTAS_PUBLICAS.some((r) => ruta === r || ruta.startsWith('/recuperar-password')) ||
  ruta.startsWith('/api/auth/');

export async function proxy(peticion: NextRequest) {
  const { pathname, search } = peticion.nextUrl;
  const acceso = peticion.cookies.get(COOKIE_ACCESO)?.value;
  const refresco = peticion.cookies.get(COOKIE_REFRESCO)?.value;
  const vigente = Boolean(acceso && !caducado(acceso));

  if (esPublica(pathname)) {
    // Con sesión vigente, login y registro no tienen sentido.
    if (vigente && (pathname === '/login' || pathname === '/registro')) {
      return NextResponse.redirect(urlPublica('/'));
    }
    return NextResponse.next();
  }

  if (vigente) {
    const claims = acceso ? leerPayload(acceso) : null;
    const necesitaCompletar = claims?.completo === false;

    if (necesitaCompletar && pathname !== '/completar-perfil' && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(urlPublica('/completar-perfil'));
    }
    if (!necesitaCompletar && pathname === '/completar-perfil') {
      return NextResponse.redirect(urlPublica('/'));
    }
    return NextResponse.next();
  }

  if (refresco) {
    // El prefetch del router no debe gastar el refresh token: solo pasa.
    if (peticion.headers.get('next-router-prefetch') === '1') return NextResponse.next();

    const renovada = await refrescar(refresco, peticion);
    if (renovada.tokens) {
      const claims = leerPayload(renovada.tokens.accessToken);
      const necesitaCompletar = claims?.completo === false;

      if (necesitaCompletar && pathname !== '/completar-perfil' && !pathname.startsWith('/api/')) {
        const respuesta = NextResponse.redirect(urlPublica('/completar-perfil'));
        respuesta.cookies.set(COOKIE_ACCESO, renovada.tokens.accessToken, opcionesCookie(renovada.tokens.expiraEn));
        respuesta.cookies.set(COOKIE_REFRESCO, renovada.tokens.refreshToken, opcionesCookie(TTL_REFRESCO_SEG));
        return respuesta;
      }

      return conSesionRenovada(peticion, renovada.tokens);
    }
    // Con 401 el refresh token ya no sirve: se limpian las cookies. Ante un fallo
    // transitorio (red, 5xx) se conservan para poder reintentar.
    return aLogin(peticion, pathname, search, renovada.rechazado);
  }

  return aLogin(peticion, pathname, search, Boolean(acceso));
}

async function refrescar(token: string, peticion: NextRequest) {
  const respuesta = await llamarApi<TokensSesion>('/auth/sesion/refrescar', {
    metodo: 'POST',
    cuerpo: { refreshToken: token },
    ip: ipDe(peticion.headers),
    agente: peticion.headers.get('user-agent'),
  });
  return { tokens: respuesta.datos, rechazado: respuesta.status === 401 };
}

// Escribir la cookie en la respuesta NO la hace visible al Server Component de esta misma
// petición: hay que reescribir también el header `cookie` que se reenvía "aguas arriba".
function conSesionRenovada(peticion: NextRequest, tokens: TokensSesion) {
  const resto = peticion.cookies
    .getAll()
    .filter((c) => c.name !== COOKIE_ACCESO && c.name !== COOKIE_REFRESCO)
    .map((c) => `${c.name}=${c.value}`);
  resto.push(`${COOKIE_ACCESO}=${tokens.accessToken}`, `${COOKIE_REFRESCO}=${tokens.refreshToken}`);

  const cabeceras = new Headers(peticion.headers);
  cabeceras.set('cookie', resto.join('; '));

  const respuesta = NextResponse.next({ request: { headers: cabeceras } });
  respuesta.cookies.set(COOKIE_ACCESO, tokens.accessToken, opcionesCookie(tokens.expiraEn));
  respuesta.cookies.set(COOKIE_REFRESCO, tokens.refreshToken, opcionesCookie(TTL_REFRESCO_SEG));
  return respuesta;
}

function aLogin(peticion: NextRequest, ruta: string, busqueda: string, limpiar: boolean) {
  const destino = urlPublica('/login');
  if (ruta !== '/') destino.searchParams.set('siguiente', ruta + busqueda);
  const respuesta = NextResponse.redirect(destino);
  if (limpiar) {
    respuesta.cookies.delete(COOKIE_ACCESO);
    respuesta.cookies.delete(COOKIE_REFRESCO);
  }
  return respuesta;
}

export const config = {
  // Excluye estáticos de Next y cualquier archivo con extensión (favicon, imágenes...).
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.[\\w]+$).*)'],
};
