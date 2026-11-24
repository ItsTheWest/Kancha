// Cliente del backend (solo servidor). El navegador nunca habla con el backend: lo hace
// este BFF por la red interna de Docker.

export interface Perfil {
  id: string;
  codigoPublico: string;
  correo: string;
  nombres: string;
  apellidos: string;
  correoVerificadoEn: string | null;
  estado: 'activo' | 'suspendido';
}

export interface RespuestaApi<T> {
  ok: boolean;
  status: number;
  datos: T | null;
  // Código de error del backend (p. ej. "credenciales_invalidas").
  codigo: string | null;
}

interface Opciones {
  metodo?: 'GET' | 'POST' | 'DELETE';
  token?: string;
  cuerpo?: unknown;
  ip?: string;
  agente?: string | null;
}

// El backend limita por IP: hay que reenviar la del cliente o todos parecerían el BFF.
export const ipDe = (cabeceras: Headers): string | undefined =>
  cabeceras.get('x-forwarded-for')?.split(',')[0]?.trim() || cabeceras.get('x-real-ip') || undefined;

export async function llamarApi<T>(ruta: string, opciones: Opciones = {}): Promise<RespuestaApi<T>> {
  const base = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3001';
  const cabeceras: Record<string, string> = { 'content-type': 'application/json' };
  if (opciones.token) cabeceras.authorization = `Bearer ${opciones.token}`;
  if (opciones.ip) cabeceras['x-forwarded-for'] = opciones.ip;
  if (opciones.agente) cabeceras['user-agent'] = opciones.agente;

  try {
    const respuesta = await fetch(`${base}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: cabeceras,
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    let cuerpo: unknown = null;
    try {
      cuerpo = await respuesta.json();
    } catch {
      // 204 o cuerpo vacío.
    }
    const mensaje = (cuerpo as { message?: unknown } | null)?.message;
    return {
      ok: respuesta.ok,
      status: respuesta.status,
      datos: respuesta.ok ? (cuerpo as T) : null,
      codigo: typeof mensaje === 'string' ? mensaje : null,
    };
  } catch {
    return { ok: false, status: 0, datos: null, codigo: 'sin_conexion' };
  }
}
