'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ipDe, llamarApi } from '../../lib/api';
import type { ClubItem, RespuestaApi } from '../../lib/api';
import {
  COOKIE_ACCESO,
  COOKIE_CLUB_ACTIVO,
  TTL_CLUB_ACTIVO_SEG,
  opcionesCookieCliente,
  rutaSegura,
} from '../../lib/cookies';

export type EstadoCrearClub =
  | {
      error?: string;
      limiteAlcanzado?: boolean;
      errores?: Record<string, string>;
      campos?: Record<string, string>;
      exito?: boolean;
    }
  | undefined;

async function metaCliente() {
  const cabeceras = await headers();
  return { ip: ipDe(cabeceras), agente: cabeceras.get('user-agent') };
}

const texto = (datos: FormData, nombre: string) => String(datos.get(nombre) ?? '').trim();

export async function obtenerMisClubes(): Promise<ClubItem[]> {
  const token = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!token) return [];

  const res = await llamarApi<ClubItem[]>('/clubes/mis-clubes', {
    token,
    ...(await metaCliente()),
  });

  return res.ok && res.datos ? res.datos : [];
}

export async function cambiarClubActivo(clubId: string) {
  const jar = await cookies();
  jar.set(COOKIE_CLUB_ACTIVO, clubId, opcionesCookieCliente(TTL_CLUB_ACTIVO_SEG));
  revalidatePath('/', 'layout');
}

export async function crearClubAction(
  _anterior: EstadoCrearClub,
  datos: FormData
): Promise<EstadoCrearClub> {
  const token = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!token) redirect('/login');

  const nombre = texto(datos, 'nombre');
  const slug = texto(datos, 'slug') || undefined;
  const deporte = texto(datos, 'deporte') || 'futbol';
  const ciudad = texto(datos, 'ciudad') || undefined;
  const logoUrl = texto(datos, 'logoUrl') || undefined;
  const colorPrimario = texto(datos, 'colorPrimario') || '#3ecf8e';
  const colorSecundario = texto(datos, 'colorSecundario') || '#1f7a52';
  const colorAcento = texto(datos, 'colorAcento') || '#6ef0b0';

  const campos = {
    nombre,
    slug: slug ?? '',
    deporte,
    ciudad: ciudad ?? '',
    colorPrimario,
    colorSecundario,
    colorAcento,
  };

  const errores: Record<string, string> = {};
  if (!nombre) {
    errores.nombre = 'Ingresa el nombre del club.';
  } else if (nombre.length < 2) {
    errores.nombre = 'El nombre debe tener al menos 2 caracteres.';
  }

  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errores.slug = 'El enlace solo puede contener letras minúsculas, números y guiones.';
  }

  if (Object.keys(errores).length > 0) {
    return { errores, campos };
  }

  const respuesta = await llamarApi<ClubItem>('/clubes', {
    metodo: 'POST',
    token,
    cuerpo: {
      nombre,
      slug,
      deporte,
      ciudad,
      logoUrl,
      colorPrimario,
      colorSecundario,
      colorAcento,
    },
    ...(await metaCliente()),
  });

  if (!respuesta.ok || !respuesta.datos) {
    if (respuesta.codigo === 'limite_clubes_alcanzado') {
      return {
        error:
          'Has alcanzado el límite de 1 club propio en tu plan actual. Para administrar múltiples clubes desde una sola cuenta, actualiza a un plan PRO.',
        limiteAlcanzado: true,
        campos,
      };
    }
    return {
      error: 'No pudimos crear el club. Verifica los datos e inténtalo nuevamente.',
      campos,
    };
  }

  // Activar automáticamente el club recién creado
  const jar = await cookies();
  jar.set(COOKIE_CLUB_ACTIVO, respuesta.datos.id, opcionesCookieCliente(TTL_CLUB_ACTIVO_SEG));

  revalidatePath('/', 'layout');
  redirect('/');
}
