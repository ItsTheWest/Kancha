'use client';

import { useActionState } from 'react';
import { registrarse } from '../../acciones/auth';

export function FormularioRegistro() {
  const [estado, accion, pendiente] = useActionState(registrarse, undefined);

  return (
    <form action={accion} className="formulario" noValidate>
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
            className={estado?.errores?.nombres ? 'con-error' : undefined}
          />
          {estado?.errores?.nombres && (
            <span className="error-campo" role="alert">{estado.errores.nombres}</span>
          )}
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
            className={estado?.errores?.apellidos ? 'con-error' : undefined}
          />
          {estado?.errores?.apellidos && (
            <span className="error-campo" role="alert">{estado.errores.apellidos}</span>
          )}
        </label>
      </div>

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
        Contraseña
        <input
          type="password"
          name="contrasena"
          autoComplete="new-password"
          minLength={10}
          maxLength={128}
          required
          className={estado?.errores?.contrasena ? 'con-error' : undefined}
        />
        <small>Al menos 10 caracteres.</small>
        {estado?.errores?.contrasena && (
          <span className="error-campo" role="alert">{estado.errores.contrasena}</span>
        )}
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
        {pendiente ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  );
}
