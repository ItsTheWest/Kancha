import type { ReactNode } from 'react';
import { requerirSesion } from '../../lib/sesion';
import { cerrarSesion } from '../acciones/auth';

export const dynamic = 'force-dynamic';

// Toda página privada cuelga de este layout: sin sesión válida en el backend, no hay render.
export default async function LayoutPrivado({ children }: { children: ReactNode }) {
  const perfil = await requerirSesion();

  return (
    <>
      <header className="barra">
        <span>
          {perfil.nombres} {perfil.apellidos} · <span className="suave">{perfil.correo}</span>
        </span>
        <form action={cerrarSesion}>
          <button className="boton boton-secundario boton-chico" type="submit">
            Salir
          </button>
        </form>
      </header>
      {children}
    </>
  );
}
