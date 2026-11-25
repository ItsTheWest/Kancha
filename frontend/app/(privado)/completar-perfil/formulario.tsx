'use client';

import { useActionState } from 'react';
import { completarPerfilAction } from '../../acciones/auth';

export function FormularioCompletarPerfil() {
  const [estado, accion, pendiente] = useActionState(completarPerfilAction, undefined);

  return (
    <form action={accion} className="formulario" noValidate>
      <label>
        Rol en la plataforma
        <select
          name="rol"
          defaultValue={estado?.campos?.rol ?? 'jugador'}
          required
          className={estado?.errores?.rol ? 'con-error' : undefined}
        >
          <option value="jugador">Jugador</option>
          <option value="propietario">Propietario</option>
        </select>
        {estado?.errores?.rol && (
          <span className="error-campo" role="alert">{estado.errores.rol}</span>
        )}
      </label>

      <label>
        Documento de Identidad (Cédula / RIF)
        <div className="grupo-documento">
          <select name="tipoDocumento" defaultValue={estado?.campos?.tipoDocumento ?? 'V'} required>
            <option value="V">V</option>
            <option value="E">E</option>
            <option value="J">J</option>
            <option value="G">G</option>
            <option value="C">C</option>
          </select>
          <input
            type="text"
            name="numeroDocumento"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            placeholder="12345678"
            defaultValue={estado?.campos?.numeroDocumento}
            required
            className={estado?.errores?.cedula ? 'con-error' : undefined}
          />
        </div>
        <small>Escribe solo los números a mano; la letra se selecciona al inicio.</small>
        {estado?.errores?.cedula && (
          <span className="error-campo" role="alert">{estado.errores.cedula}</span>
        )}
      </label>

      <label>
        Teléfono móvil (opcional)
        <div className="grupo-telefono">
          <select name="codigoTelefono" defaultValue={estado?.campos?.codigoTelefono ?? '0412'}>
            <option value="0412">0412</option>
            <option value="0414">0414</option>
            <option value="0424">0424</option>
            <option value="0416">0416</option>
            <option value="0426">0426</option>
            <option value="0212">0212</option>
          </select>
          <input
            type="text"
            name="numeroTelefono"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={7}
            placeholder="1234567"
            defaultValue={estado?.campos?.numeroTelefono}
            className={estado?.errores?.telefono ? 'con-error' : undefined}
          />
        </div>
        <small>Selecciona el prefijo e ingresa los 7 dígitos restantes.</small>
        {estado?.errores?.telefono && (
          <span className="error-campo" role="alert">{estado.errores.telefono}</span>
        )}
      </label>

      {estado?.error && (
        <p className="aviso" role="alert">
          {estado.error}
        </p>
      )}

      <button className="boton" type="submit" disabled={pendiente}>
        {pendiente ? 'Guardando…' : 'Completar perfil y continuar'}
      </button>
    </form>
  );
}
