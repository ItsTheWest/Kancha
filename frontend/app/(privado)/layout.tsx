import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { requerirSesion } from '../../lib/sesion';
import { COOKIE_CLUB_ACTIVO } from '../../lib/cookies';
import { cerrarSesion } from '../acciones/auth';
import { obtenerMisClubes } from '../acciones/clubes';
import { NavegacionInferior } from '../componentes/navegacion-inferior';
import { SelectorClub } from '../componentes/selector-club';

export const dynamic = 'force-dynamic';

// Toda página privada cuelga de este layout: sin sesión válida en el backend, no hay render.
export default async function LayoutPrivado({ children }: { children: ReactNode }) {
  const perfil = await requerirSesion();
  const misClubes = await obtenerMisClubes();

  const cookieStore = await cookies();
  const idGuardado = cookieStore.get(COOKIE_CLUB_ACTIVO)?.value;

  const clubActivo = misClubes.find((c) => c.id === idGuardado) || misClubes[0] || null;

  // Inyección de variables CSS según los colores elegidos para el club activo
  const estiloTema = clubActivo
    ? ({
        '--color-club-primario': clubActivo.colorPrimario ?? '#3ecf8e',
        '--color-club-secundario': clubActivo.colorSecundario ?? '#1f7a52',
        '--color-club-acento': clubActivo.colorAcento ?? '#6ef0b0',
        '--ok': clubActivo.colorPrimario ?? '#3ecf8e',
      } as React.CSSProperties)
    : undefined;

  return (
    <div style={{ width: '100%', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', ...estiloTema }}>
      <header className="barra">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <SelectorClub clubes={misClubes} clubActivoId={clubActivo?.id} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="suave" style={{ fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--texto)', fontWeight: 500 }}>{perfil.nombres} {perfil.apellidos}</span> · {perfil.correo}
          </span>
          <form action={cerrarSesion}>
            <button className="boton boton-secundario boton-chico" type="submit">
              Salir
            </button>
          </form>
        </div>
      </header>

      {children}
      <NavegacionInferior />
    </div>
  );
}
