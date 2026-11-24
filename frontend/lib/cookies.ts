// Nombres y atributos de las cookies de sesión. Los comparten el proxy (middleware),
// las acciones de servidor y los route handlers de Google.

export const COOKIE_ACCESO = 'kancha_acceso';
export const COOKIE_REFRESCO = 'kancha_refresco';
export const COOKIE_OAUTH = 'kancha_oauth_estado';

export const TTL_REFRESCO_SEG = 60 * 60 * 24 * 30;
export const TTL_OAUTH_SEG = 600;

// `secure` sale de SECURE_COOKIES y no de NODE_ENV: la imagen fija NODE_ENV=production
// incluso en el docker compose local sobre http, donde una cookie Secure no se guardaría.
const segura = () => process.env.SECURE_COOKIES === 'true';

export function opcionesCookie(maxAge: number, path = '/') {
  return {
    httpOnly: true,
    secure: segura(),
    // Lax y no Strict: la vuelta desde accounts.google.com es una navegación cross-site
    // y Strict no enviaría la cookie de estado, rompiendo el callback.
    sameSite: 'lax' as const,
    path,
    maxAge,
  };
}

export interface TokensSesion {
  accessToken: string;
  refreshToken: string;
  expiraEn: number;
}

// Base pública del sitio. Detrás de Docker `request.url` trae 0.0.0.0:3000, así que las
// redirecciones absolutas se construyen con esta variable.
export const urlPublica = (ruta: string) =>
  new URL(ruta, process.env.PUBLIC_WEB_URL ?? 'http://localhost:53000');

// Solo rutas relativas del propio sitio: rechaza `//host` y `/\host` (open redirect).
export function rutaSegura(ruta: unknown): string {
  if (typeof ruta !== 'string' || ruta.length > 512) return '/';
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta.startsWith('/\\')) return '/';
  return ruta;
}
