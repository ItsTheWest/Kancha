'use client';

import { useActionState } from 'react';
import { registrarse } from '../../acciones/auth';

export function FormularioRegistro() {
  const [estado, accion, pendiente] = useActionState(registrarse, undefined);

  return (
    <form action={accion} className="formulario">
      <div className="par">
        <label>
          Nombres
          <input
            type="text"
            name="nombres"
            autoComplete="given-name"
            defaultValue={estado?.campos?.nombres}
            maxLength={100}
            required
          />
        </label>
        <label>
          Apellidos
          <input
            type="text"
            name="apellidos"
            autoComplete="family-name"
            defaultValue={estado?.campos?.apellidos}
            maxLength={100}
            required
          />
        </label>
      </div>
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
        <input
          type="password"
          name="contrasena"
          autoComplete="new-password"
          minLength={10}
          maxLength={128}
          required
        />
        <small>Al menos 10 caracteres.</small>
      </label>
      <label>
        Confirmar contraseña
        <input
          type="password"
          name="confirmacion"
          autoComplete="new-password"
          minLength={10}
          maxLength={128}
          required
        />
      </label>
      {estado?.error && (
        <p className="aviso" role="alert">
          {estado.error}
        </p>
      )}
      <button className="boton" type="submit" disabled={pendiente}>
        {pendiente ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  );
}
