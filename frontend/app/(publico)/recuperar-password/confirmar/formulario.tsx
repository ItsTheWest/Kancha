'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import {
  restablecerPasswordAction,
  validarCodigoRecuperacionAction,
} from '../../../acciones/auth';
import { CampoPassword } from '../../../componentes/campo-password';

export function FormularioConfirmarRecuperacion({ correoInicial }: { correoInicial: string }) {
  const [estadoValidar, accionValidar, pendienteValidar] = useActionState(
    validarCodigoRecuperacionAction,
    undefined,
  );
  const [estadoRestablecer, accionRestablecer, pendienteRestablecer] = useActionState(
    restablecerPasswordAction,
    undefined,
  );

  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [paso, setPaso] = useState<1 | 2>(1);

  useEffect(() => {
    if (estadoValidar?.exito === 'codigo_valido') {
      setPaso(2);
      if (estadoValidar.campos?.codigo) {
        setCodigoIngresado(estadoValidar.campos.codigo);
      }
    }
  }, [estadoValidar]);

  return (
    <div>
      {paso === 1 ? (
        <form action={accionValidar} className="formulario" noValidate>
          <input type="hidden" name="correo" value={correoInicial} />

          <p style={{ fontSize: '0.85rem', color: 'var(--texto-suave)', margin: '0 0 1rem' }}>
            Paso 1 de 2: Hemos enviado un código a <strong>{correoInicial}</strong>. Ingrésalo a continuación para verificar tu solicitud.
          </p>

          <label>
            Código de 6 caracteres
            <input
              type="text"
              name="codigo"
              maxLength={6}
              placeholder="Ej: 936WG4"
              autoComplete="one-time-code"
              style={{
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                textAlign: 'center',
                fontSize: '1.2rem',
                fontWeight: 600,
              }}
              defaultValue={estadoValidar?.campos?.codigo || codigoIngresado}
              required
              className={estadoValidar?.errores?.codigo ? 'con-error' : undefined}
            />
            {estadoValidar?.errores?.codigo && (
              <span className="error-campo" role="alert">{estadoValidar.errores.codigo}</span>
            )}
          </label>

          {estadoValidar?.error && (
            <p className="aviso" role="alert">
              {estadoValidar.error}
            </p>
          )}

          <button className="boton" type="submit" disabled={pendienteValidar}>
            {pendienteValidar ? 'Verificando código…' : 'Verificar código'}
          </button>

          <p className="pie" style={{ marginTop: '0.5rem' }}>
            <Link href="/recuperar-password">Reenviar código a otro correo</Link>
          </p>
        </form>
      ) : (
        <form action={accionRestablecer} className="formulario" noValidate>
          <input type="hidden" name="correo" value={correoInicial} />
          <input type="hidden" name="codigo" value={codigoIngresado} />

          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '0.5rem',
              background: 'rgba(62, 207, 142, 0.1)',
              border: '1px solid var(--ok)',
              color: 'var(--ok)',
              fontSize: '0.85rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <span>Código <strong>{codigoIngresado}</strong> validado</span>
            <button
              type="button"
              onClick={() => setPaso(1)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--texto-suave)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.78rem',
              }}
            >
              Cambiar código
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--texto-suave)', margin: '0 0 0.5rem' }}>
            Paso 2 de 2: Ingresa tu nueva contraseña para completar el restablecimiento.
          </p>

          <CampoPassword
            label="Nueva contraseña"
            name="nuevaContrasena"
            autoComplete="new-password"
            minLength={8}
            small="Al menos 8 caracteres."
            error={estadoRestablecer?.errores?.nuevaContrasena}
          />

          <CampoPassword
            label="Confirmar nueva contraseña"
            name="confirmacion"
            autoComplete="new-password"
            minLength={8}
            error={estadoRestablecer?.errores?.confirmacion}
          />

          {estadoRestablecer?.error && (
            <p className="aviso" role="alert">
              {estadoRestablecer.error}
            </p>
          )}

          <button className="boton" type="submit" disabled={pendienteRestablecer}>
            {pendienteRestablecer ? 'Guardando nueva contraseña…' : 'Restablecer contraseña'}
          </button>
        </form>
      )}
    </div>
  );
}
