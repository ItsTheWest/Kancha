'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cerrarSesion } from '../acciones/auth';

export function NavegacionInferior() {
  const rutaActual = usePathname();

  return (
    <nav className="barra-inferior" aria-label="Navegación móvil principal">
      <Link
        href="/"
        className={`boton-nav ${rutaActual === '/' ? 'activo' : ''}`}
        aria-current={rutaActual === '/' ? 'page' : undefined}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Inicio</span>
      </Link>

      <Link
        href="/clubes"
        className={`boton-nav ${rutaActual.startsWith('/club') ? 'activo' : ''}`}
        aria-current={rutaActual.startsWith('/club') ? 'page' : undefined}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
        <span>Club</span>
      </Link>

      <Link
        href="/#perfil"
        className="boton-nav"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>Perfil</span>
      </Link>

      <form action={cerrarSesion} style={{ display: 'contents' }}>
        <button type="submit" className="boton-nav" title="Cerrar sesión" aria-label="Cerrar sesión">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Salir</span>
        </button>
      </form>
    </nav>
  );
}
