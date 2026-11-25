'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { solicitarRecuperacionAction } from '../../acciones/auth';

export function FormularioSolicitarRecuperacion() {
  const [estado, accion, pendiente] = useActionState(solicitarRecuperacionAction, undefined);

  return (
    <form action={accion} className="formulario" noValidate>
      <label>
        Correo electrónico de tu cuenta
        <input
          type="email"
          name="correo"
          autoComplete="email"
          defaultValue={estado?.campos?.correo}
          placeholder="ejemplo@correo.com"
          required
          className={estado?.errores?.correo ? 'con-error' : undefined}
        />
        {estado?.errores?.correo && (
          <span className="error-campo" role="alert">{estado.errores.correo}</span>
        )}
      </label>

      {estado?.error && (
        <p className="aviso" role="alert">
          {estado.error}
        </p>
      )}

      <button className="boton" type="submit" disabled={pendiente}>
        {pendiente ? 'Enviando código…' : 'Enviar código de recuperación'}
      </button>

      <p className="pie" style={{ marginTop: '0.5rem' }}>
        <Link href="/login">Volver a iniciar sesión</Link>
      </p>
    </form>
  );
}
