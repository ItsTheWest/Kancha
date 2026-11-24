'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ipDe, llamarApi } from '../../lib/api';
import type { RespuestaApi } from '../../lib/api';
import { COOKIE_REFRESCO, rutaSegura } from '../../lib/cookies';
import type { TokensSesion } from '../../lib/cookies';
import { borrarSesion, guardarSesion } from '../../lib/sesion';

export type EstadoFormulario = { error?: string; campos?: Record<string, string> } | undefined;

function mensajeDeError(respuesta: RespuestaApi<unknown>): string {
  switch (respuesta.codigo) {
    case 'credenciales_invalidas':
      return 'Correo o contraseña incorrectos.';
    case 'demasiados_intentos':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    case 'correo_en_uso':
      return 'Ya existe una cuenta con ese correo.';
    case 'sin_conexion':
      return 'No pudimos conectar con el servidor. Inténtalo de nuevo.';
    default:
      return respuesta.status === 400
        ? 'Revisa los datos: el correo debe ser válido y la contraseña tener al menos 10 caracteres.'
        : 'No pudimos completar la solicitud. Inténtalo de nuevo.';
  }
}

async function metaCliente() {
  const cabeceras = await headers();
  return { ip: ipDe(cabeceras), agente: cabeceras.get('user-agent') };
}

const texto = (datos: FormData, nombre: string) => String(datos.get(nombre) ?? '').trim();

export async function iniciarSesion(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const correo = texto(datos, 'correo');
  const contrasena = String(datos.get('contrasena') ?? '');
  const siguiente = rutaSegura(texto(datos, 'siguiente'));

  const respuesta = await llamarApi<TokensSesion>('/auth/sesion', {
    metodo: 'POST',
    cuerpo: { correo, contrasena },
    ...(await metaCliente()),
  });
  if (!respuesta.ok || !respuesta.datos) {
    return { error: mensajeDeError(respuesta), campos: { correo } };
  }
  await guardarSesion(respuesta.datos);
  redirect(siguiente);
}

export async function registrarse(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const campos = {
    nombres: texto(datos, 'nombres'),
    apellidos: texto(datos, 'apellidos'),
    correo: texto(datos, 'correo'),
  };
  const contrasena = String(datos.get('contrasena') ?? '');
  if (contrasena !== String(datos.get('confirmacion') ?? '')) {
    return { error: 'Las contraseñas no coinciden.', campos };
  }

  const respuesta = await llamarApi<TokensSesion>('/auth/registro', {
    metodo: 'POST',
    cuerpo: { ...campos, contrasena },
    ...(await metaCliente()),
  });
  if (!respuesta.ok || !respuesta.datos) return { error: mensajeDeError(respuesta), campos };

  await guardarSesion(respuesta.datos);
  redirect('/');
}

export async function cerrarSesion() {
  const refreshToken = (await cookies()).get(COOKIE_REFRESCO)?.value;
  // Se revoca en el backend antes de borrar las cookies: si no, el access token seguiría
  // siendo válido hasta 3 h aunque el navegador ya no lo tenga.
  if (refreshToken) {
    await llamarApi('/auth/sesion', { metodo: 'DELETE', cuerpo: { refreshToken } });
  }
  await borrarSesion();
  redirect('/login');
}
