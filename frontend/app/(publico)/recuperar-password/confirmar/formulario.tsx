'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { restablecerPasswordAction } from '../../../acciones/auth';

export function FormularioConfirmarRecuperacion({ correoInicial }: { correoInicial: string }) {
  const [estado, accion, pendiente] = useActionState(restablecerPasswordAction, undefined);

  return (
    <form action={accion} className="formulario" noValidate>
      <input type="hidden" name="correo" value={correoInicial} />

      <p style={{ fontSize: '0.85rem', color: 'var(--texto-suave)' }}>
        Hemos enviado un código a <strong>{correoInicial}</strong>. Ingrésalo a continuación para definir tu nueva contraseña.
      </p>

      <label>
        Código de 6 dígitos
        <input
          type="text"
          name="codigo"
          maxLength={6}
          placeholder="Ej: 936WG4"
          autoComplete="one-time-code"
          style={{ letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center', fontSize: '1.2rem', fontWeight: 600 }}
          defaultValue={estado?.campos?.codigo}
          required
          className={estado?.errores?.codigo ? 'con-error' : undefined}
        />
        {estado?.errores?.codigo && (
          <span className="error-campo" role="alert">{estado.errores.codigo}</span>
        )}
      </label>

      <label>
        Nueva contraseña
        <input
          type="password"
          name="nuevaContrasena"
          autoComplete="new-password"
          minLength={10}
          maxLength={128}
          required
          className={estado?.errores?.nuevaContrasena ? 'con-error' : undefined}
        />
        <small>Al menos 10 caracteres.</small>
        {estado?.errores?.nuevaContrasena && (
          <span className="error-campo" role="alert">{estado.errores.nuevaContrasena}</span>
        )}
      </label>

      <label>
        Confirmar nueva contraseña
        <input
          type="password"
          name="confirmacion"
          autoComplete="new-password"
          minLength={10}
          maxLength={128}
          required
          className={estado?.errores?.confirmacion ? 'con-error' : undefined}
        />
        {estado?.errores?.confirmacion && (
          <span className="error-campo" role="alert">{estado.errores.confirmacion}</span>
        )}
      </label>

      {estado?.error && (
        <p className="aviso" role="alert">
          {estado.error}
        </p>
      )}

      <button className="boton" type="submit" disabled={pendiente}>
        {pendiente ? 'Guardando nueva contraseña…' : 'Restablecer contraseña'}
      </button>

      <p className="pie" style={{ marginTop: '0.5rem' }}>
        <Link href="/recuperar-password">Reenviar código a otro correo</Link>
      </p>
    </form>
  );
}
