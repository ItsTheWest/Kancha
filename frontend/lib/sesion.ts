import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { llamarApi } from './api';
import type { Perfil } from './api';
import {
  COOKIE_ACCESO,
  COOKIE_REFRESCO,
  TTL_REFRESCO_SEG,
  opcionesCookie,
} from './cookies';
import type { TokensSesion } from './cookies';

// cache() de React: varias llamadas en el mismo render comparten una sola petición.
export const leerSesion = cache(async (): Promise<Perfil | null> => {
  const token = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!token) return null;
  const respuesta = await llamarApi<Perfil>('/auth/perfil', { token });
  return respuesta.ok ? respuesta.datos : null;
});

// Todas las páginas privadas cuelgan de app/(privado)/layout.tsx, que llama a esto: la
// comprobación es estructural y no se puede olvidar en una página nueva.
export async function requerirSesion(): Promise<Perfil> {
  const perfil = await leerSesion();
  // Sesión rechazada por el backend: se limpian las cookies en un route handler (aquí no
  // se pueden escribir) para no rebotar entre /login y / con una cookie que parece vigente.
  if (!perfil) redirect('/api/auth/salir');
  return perfil;
}

export async function guardarSesion(tokens: TokensSesion) {
  const jar = await cookies();
  jar.set(COOKIE_ACCESO, tokens.accessToken, opcionesCookie(tokens.expiraEn));
  jar.set(COOKIE_REFRESCO, tokens.refreshToken, opcionesCookie(TTL_REFRESCO_SEG));
}

export async function borrarSesion() {
  const jar = await cookies();
  jar.delete(COOKIE_ACCESO);
  jar.delete(COOKIE_REFRESCO);
}
