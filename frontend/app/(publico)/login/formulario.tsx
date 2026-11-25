'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { iniciarSesion } from '../../acciones/auth';

export function FormularioLogin({ siguiente }: { siguiente: string }) {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, undefined);

  return (
    <form action={accion} className="formulario" noValidate>
      <input type="hidden" name="siguiente" value={siguiente} />
      <label>
        Correo electrónico
        <input
          type="email"
          name="correo"
          autoComplete="email"
          defaultValue={estado?.campos?.correo}
          required
          className={estado?.errores?.correo ? 'con-error' : undefined}
        />
        {estado?.errores?.correo && (
          <span className="error-campo" role="alert">{estado.errores.correo}</span>
        )}
      </label>
      <label>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Contraseña</span>
          <Link href="/recuperar-password" style={{ fontSize: '0.8rem', textDecoration: 'none' }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <input
          type="password"
          name="contrasena"
          autoComplete="current-password"
          required
          className={estado?.errores?.contrasena ? 'con-error' : undefined}
        />
        {estado?.errores?.contrasena && (
          <span className="error-campo" role="alert">{estado.errores.contrasena}</span>
        )}
      </label>
      {estado?.error && (
        <p className="aviso" role="alert">
          {estado.error}
        </p>
      )}
      <button className="boton" type="submit" disabled={pendiente}>
        {pendiente ? 'Ingresando…' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
