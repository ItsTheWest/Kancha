'use client';

import { useActionState } from 'react';
import { iniciarSesion } from '../../acciones/auth';

export function FormularioLogin({ siguiente }: { siguiente: string }) {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, undefined);

  return (
    <form action={accion} className="formulario">
      <input type="hidden" name="siguiente" value={siguiente} />
      <label>
        Correo
        <input
          type="email"
          name="correo"
          autoComplete="email"
          defaultValue={estado?.campos?.correo}
          required
        />
      </label>
      <label>
        Contraseña
        <input type="password" name="contrasena" autoComplete="current-password" required />
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
