import type { Metadata } from 'next';
import Link from 'next/link';
import { requerirSesion } from '../../../../lib/sesion';
import { FormularioCrearClub } from './formulario';

export const metadata: Metadata = {
  title: 'Crear nuevo club | Kancha',
  description: 'Registra tu club deportivo, define su logo y personaliza los colores institucionales.',
};

export const dynamic = 'force-dynamic';

export default async function PaginaCrearClub() {
  await requerirSesion();

  return (
    <main style={{ width: 'min(36rem, 100%)', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/"
          className="suave"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          ← Volver al inicio
        </Link>
        <h1 style={{ marginTop: '0.75rem', fontSize: '1.75rem' }}>Crear mi club</h1>
        <p className="sub" style={{ marginBottom: '1rem' }}>
          Configura la identidad deportiva de tu institución. Sube el escudo o logo y Kancha extraerá los colores automáticamente.
        </p>
      </div>

      <section className="tarjeta" style={{ padding: '1.5rem' }}>
        <FormularioCrearClub />
      </section>
    </main>
  );
}
