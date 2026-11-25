'use client';

import { useActionState } from 'react';
import {
  confirmarVerificacionAction,
  solicitarVerificacionAction,
} from '../../acciones/auth';

export function FormularioVerificarCorreo({ correo }: { correo: string }) {
  const [estadoConf, accionConf, pendienteConf] = useActionState(
    confirmarVerificacionAction,
    undefined,
  );
  const [estadoSol, accionSol, pendienteSol] = useActionState(
    solicitarVerificacionAction,
    undefined,
  );

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <form action={accionConf} className="formulario" noValidate>
        <input type="hidden" name="correo" value={correo} />

        <p style={{ fontSize: '0.85rem', color: 'var(--texto-suave)' }}>
          Te hemos enviado un código de 6 caracteres a <strong>{correo}</strong>. Confírmalo para activar todas las funciones de tu cuenta.
        </p>

        <label>
          Código de verificación
          <input
            type="text"
            name="codigo"
            maxLength={6}
            placeholder="Ej: ABC123"
            autoComplete="one-time-code"
            style={{
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              textAlign: 'center',
              fontSize: '1.2rem',
              fontWeight: 600,
            }}
            defaultValue={estadoConf?.campos?.codigo}
            required
            className={estadoConf?.errores?.codigo ? 'con-error' : undefined}
          />
          {estadoConf?.errores?.codigo && (
            <span className="error-campo" role="alert">
              {estadoConf.errores.codigo}
            </span>
          )}
        </label>

        {estadoConf?.error && (
          <p className="aviso" role="alert">
            {estadoConf.error}
          </p>
        )}

        <button className="boton" type="submit" disabled={pendienteConf}>
          {pendienteConf ? 'Verificando…' : 'Confirmar correo'}
        </button>
      </form>

      <form action={accionSol} style={{ textAlign: 'center' }}>
        <input type="hidden" name="correo" value={correo} />
        {estadoSol?.exito && (
          <p style={{ color: 'var(--ok)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            {estadoSol.exito}
          </p>
        )}
        <button
          type="submit"
          disabled={pendienteSol}
          className="boton boton-secundario boton-chico"
          style={{ width: '100%' }}
        >
          {pendienteSol ? 'Reenviando…' : '¿No recibiste el código? Reenviar'}
        </button>
      </form>
    </div>
  );
}
