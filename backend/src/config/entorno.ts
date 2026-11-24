// Lee y valida el entorno de autenticación una sola vez: si falta algo crítico el
// proceso falla al arrancar, no en la primera petición.

export interface ConfigGoogle {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface EntornoAuth {
  jwtSecreto: string;
  jwtEmisor: string;
  jwtAudiencia: string;
  accesoTtlSeg: number;
  refrescoTtlSeg: number;
  refrescoTopeTtlSeg: number;
  // null cuando no hay credenciales: el login con Google queda desactivado.
  google: ConfigGoogle | null;
}

function entero(nombre: string, porDefecto: number): number {
  const crudo = process.env[nombre];
  if (crudo === undefined || crudo === '') return porDefecto;
  const valor = Number(crudo);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`[config] ${nombre} debe ser un entero positivo (recibido: ${crudo})`);
  }
  return valor;
}

let cache: EntornoAuth | undefined;

export function entornoAuth(): EntornoAuth {
  if (cache) return cache;

  const jwtSecreto = process.env.AUTH_JWT_SECRET ?? '';
  // 32 caracteres como mínimo: HS256 no gana nada con un secreto más corto que su salida.
  if (jwtSecreto.length < 32) {
    throw new Error('[config] AUTH_JWT_SECRET es obligatorio y debe tener al menos 32 caracteres');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? '';
  const google =
    clientId && clientSecret && redirectUri ? { clientId, clientSecret, redirectUri } : null;

  const acceso = entero('ACCESS_TOKEN_TTL', 10800);
  const refresco = entero('REFRESH_TOKEN_TTL', 2592000);
  const tope = entero('REFRESH_FAMILY_TTL', 7776000);
  if (tope < refresco) {
    throw new Error('[config] REFRESH_FAMILY_TTL no puede ser menor que REFRESH_TOKEN_TTL');
  }

  cache = {
    jwtSecreto,
    jwtEmisor: 'kancha-api',
    jwtAudiencia: 'kancha-web',
    accesoTtlSeg: acceso,
    refrescoTtlSeg: refresco,
    refrescoTopeTtlSeg: tope,
    google,
  };
  return cache;
}
