'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

interface CampoPasswordProps {
  label: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  error?: string;
  small?: string;
  extraHeader?: ReactNode;
}

export function CampoPassword({
  label,
  name,
  placeholder,
  autoComplete = 'current-password',
  required = true,
  minLength = 8,
  maxLength = 128,
  error,
  small,
  extraHeader,
}: CampoPasswordProps) {
  const [mostrar, setMostrar] = useState(false);

  return (
    <label>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        {extraHeader}
      </div>
      <div className="campo-password-contenedor">
        <input
          type={mostrar ? 'text' : 'password'}
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          className={error ? 'con-error' : undefined}
        />
        <button
          type="button"
          onClick={() => setMostrar((prev) => !prev)}
          className="boton-ojo"
          title={mostrar ? 'Ocultar contraseña' : 'Ver contraseña'}
          aria-label={mostrar ? 'Ocultar contraseña' : 'Ver contraseña'}
        >
          {mostrar ? (
            /* Icono Ojo Tachado (Ocultar) */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            /* Icono Ojo (Ver) */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {small && <small>{small}</small>}
      {error && <span className="error-campo" role="alert">{error}</span>}
    </label>
  );
}
