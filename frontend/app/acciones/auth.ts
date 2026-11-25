'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ipDe, llamarApi } from '../../lib/api';
import type { RespuestaApi } from '../../lib/api';
import { COOKIE_ACCESO, COOKIE_REFRESCO, rutaSegura } from '../../lib/cookies';
import type { TokensSesion } from '../../lib/cookies';
import { borrarSesion, guardarSesion } from '../../lib/sesion';

export type EstadoFormulario =
  | {
      error?: string;
      errores?: Record<string, string>;
      campos?: Record<string, string>;
    }
  | undefined;

function mensajeDeError(respuesta: RespuestaApi<unknown>): string {
  switch (respuesta.codigo) {
    case 'credenciales_invalidas':
      return 'Correo o contraseña incorrectos.';
    case 'demasiados_intentos':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    case 'correo_en_uso':
      return 'Ya existe una cuenta con ese correo electrónico.';
    case 'cedula_en_uso':
      return 'Ya existe una cuenta registrada con esa cédula o RIF.';
    case 'sin_conexion':
      return 'No pudimos conectar con el servidor. Inténtalo de nuevo.';
    default:
      return respuesta.status === 400
        ? 'Revisa los datos: hay campos con formato inválido.'
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
  const correo = texto(datos, 'correo').toLowerCase();
  const contrasena = String(datos.get('contrasena') ?? '');
  const siguiente = rutaSegura(texto(datos, 'siguiente'));

  const errores: Record<string, string> = {};
  if (!correo) {
    errores.correo = 'Ingresa tu correo electrónico.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    errores.correo = 'El formato del correo electrónico no es válido.';
  }

  if (!contrasena) {
    errores.contrasena = 'Ingresa tu contraseña.';
  }

  if (Object.keys(errores).length > 0) {
    return { errores, campos: { correo } };
  }

  const respuesta = await llamarApi<TokensSesion>('/auth/sesion', {
    metodo: 'POST',
    cuerpo: { correo, contrasena },
    ...(await metaCliente()),
  });

  if (!respuesta.ok || !respuesta.datos) {
    if (respuesta.codigo === 'credenciales_invalidas') {
      return {
        error: 'Correo o contraseña incorrectos.',
        errores: {
          correo: 'Verifica tu correo',
          contrasena: 'Verifica tu contraseña',
        },
        campos: { correo },
      };
    }
    return { error: mensajeDeError(respuesta), campos: { correo } };
  }

  await guardarSesion(respuesta.datos);
  redirect(siguiente);
}

export async function registrarse(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombres = texto(datos, 'nombres');
  const apellidos = texto(datos, 'apellidos');
  const correo = texto(datos, 'correo').toLowerCase();
  const rol = texto(datos, 'rol');
  const tipoDoc = texto(datos, 'tipoDocumento') || 'V';
  const numDoc = texto(datos, 'numeroDocumento').replace(/[^0-9]/g, '');
  const codigoTel = texto(datos, 'codigoTelefono') || '0412';
  const numTel = texto(datos, 'numeroTelefono').replace(/[^0-9]/g, '');
  const contrasena = String(datos.get('contrasena') ?? '');
  const confirmacion = String(datos.get('confirmacion') ?? '');

  const campos = {
    nombres,
    apellidos,
    correo,
    rol,
    tipoDocumento: tipoDoc,
    numeroDocumento: numDoc,
    codigoTelefono: codigoTel,
    numeroTelefono: numTel,
  };

  const errores: Record<string, string> = {};

  if (!nombres) {
    errores.nombres = 'Ingresa tus nombres.';
  } else if (nombres.length < 2) {
    errores.nombres = 'Los nombres deben tener al menos 2 caracteres.';
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(nombres)) {
    errores.nombres = 'Solo se permiten letras y espacios.';
  }

  if (!apellidos) {
    errores.apellidos = 'Ingresa tus apellidos.';
  } else if (apellidos.length < 2) {
    errores.apellidos = 'Los apellidos deben tener al menos 2 caracteres.';
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(apellidos)) {
    errores.apellidos = 'Solo se permiten letras y espacios.';
  }

  if (!rol || (rol !== 'jugador' && rol !== 'propietario')) {
    errores.rol = 'Selecciona un rol válido (Jugador o Propietario).';
  }

  if (!numDoc) {
    errores.cedula = 'Ingresa el número de cédula o RIF.';
  } else if (numDoc.length < 6 || numDoc.length > 10) {
    errores.cedula = 'El documento debe tener entre 6 y 10 dígitos numéricos.';
  }

  let telefono: string | undefined = undefined;
  if (numTel.length > 0) {
    if (numTel.length !== 7) {
      errores.telefono = 'El teléfono debe tener exactamente 7 dígitos después del prefijo (ej: 1234567).';
    } else {
      telefono = `${codigoTel}${numTel}`;
    }
  }

  if (!correo) {
    errores.correo = 'Ingresa tu correo electrónico.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    errores.correo = 'El formato del correo electrónico no es válido.';
  }

  if (!contrasena) {
    errores.contrasena = 'Ingresa una contraseña.';
  } else if (contrasena.length < 10) {
    errores.contrasena = 'La contraseña debe tener al menos 10 caracteres.';
  }

  if (!confirmacion) {
    errores.confirmacion = 'Confirma tu contraseña.';
  } else if (contrasena && contrasena !== confirmacion) {
    errores.confirmacion = 'Las contraseñas no coinciden.';
  }

  if (Object.keys(errores).length > 0) {
    return { errores, campos };
  }

  const respuesta = await llamarApi<TokensSesion>('/auth/registro', {
    metodo: 'POST',
    cuerpo: {
      nombres,
      apellidos,
      correo,
      rol,
      cedula: `${tipoDoc}${numDoc}`,
      telefono,
      contrasena,
    },
    ...(await metaCliente()),
  });

  if (!respuesta.ok || !respuesta.datos) {
    if (respuesta.codigo === 'correo_en_uso') {
      return {
        errores: { correo: 'Ya existe una cuenta con este correo electrónico.' },
        campos,
      };
    }
    if (respuesta.codigo === 'cedula_en_uso') {
      return {
        errores: { cedula: 'Ya existe una cuenta registrada con esta cédula o RIF.' },
        campos,
      };
    }
    return { error: mensajeDeError(respuesta), campos };
  }

  await guardarSesion(respuesta.datos);
  redirect('/');
}

export async function completarPerfilAction(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const rol = texto(datos, 'rol');
  const tipoDoc = texto(datos, 'tipoDocumento') || 'V';
  const numDoc = texto(datos, 'numeroDocumento').replace(/[^0-9]/g, '');
  const codigoTel = texto(datos, 'codigoTelefono') || '0412';
  const numTel = texto(datos, 'numeroTelefono').replace(/[^0-9]/g, '');

  const campos = {
    rol,
    tipoDocumento: tipoDoc,
    numeroDocumento: numDoc,
    codigoTelefono: codigoTel,
    numeroTelefono: numTel,
  };

  const errores: Record<string, string> = {};

  if (!rol || (rol !== 'jugador' && rol !== 'propietario')) {
    errores.rol = 'Selecciona un rol válido (Jugador o Propietario).';
  }

  if (!numDoc) {
    errores.cedula = 'Ingresa el número de cédula o RIF.';
  } else if (numDoc.length < 6 || numDoc.length > 10) {
    errores.cedula = 'El documento debe tener entre 6 y 10 dígitos numéricos.';
  }

  let telefono: string | undefined = undefined;
  if (numTel.length > 0) {
    if (numTel.length !== 7) {
      errores.telefono = 'El teléfono debe tener exactamente 7 dígitos después del prefijo (ej: 1234567).';
    } else {
      telefono = `${codigoTel}${numTel}`;
    }
  }

  if (Object.keys(errores).length > 0) {
    return { errores, campos };
  }

  const token = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!token) redirect('/login');

  const respuesta = await llamarApi<TokensSesion>('/auth/perfil/completar', {
    metodo: 'POST',
    token,
    cuerpo: {
      rol,
      cedula: `${tipoDoc}${numDoc}`,
      telefono,
    },
    ...(await metaCliente()),
  });

  if (!respuesta.ok || !respuesta.datos) {
    if (respuesta.codigo === 'cedula_en_uso') {
      return {
        errores: { cedula: 'Ya existe una cuenta registrada con esta cédula o RIF.' },
        campos,
      };
    }
    return { error: mensajeDeError(respuesta), campos };
  }

  await guardarSesion(respuesta.datos);
  redirect('/');
}

export async function cerrarSesion() {
  const refreshToken = (await cookies()).get(COOKIE_REFRESCO)?.value;
  if (refreshToken) {
    await llamarApi('/auth/sesion', { metodo: 'DELETE', cuerpo: { refreshToken } });
  }
  await borrarSesion();
  redirect('/login');
}
