import Link from 'next/link';
import { cookies } from 'next/headers';
import { requerirSesion } from '../../lib/sesion';
import { COOKIE_CLUB_ACTIVO } from '../../lib/cookies';
import { obtenerMisClubes } from '../acciones/clubes';

// Se evalúa en cada petición para mostrar el estado real del backend.
export const dynamic = 'force-dynamic';

type Salud = { db: 'up' | 'down'; redis: 'up' | 'down' };

async function obtenerSalud(): Promise<Salud | null> {
  const base = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3001';
  try {
    const respuesta = await fetch(`${base}/health`, { cache: 'no-store' });
    // El backend responde 503 con el detalle cuando algún servicio falla.
    const cuerpo = await respuesta.json();
    const detalle = cuerpo?.message ?? cuerpo;
    if (detalle?.db && detalle?.redis) return { db: detalle.db, redis: detalle.redis };
    return null;
  } catch {
    return null;
  }
}

export default async function Inicio() {
  const perfil = await requerirSesion();
  const salud = await obtenerSalud();
  const misClubes = await obtenerMisClubes();

  const cookieStore = await cookies();
  const idGuardado = cookieStore.get(COOKIE_CLUB_ACTIVO)?.value;
  const clubActivo = misClubes.find((c) => c.id === idGuardado) || misClubes[0] || null;

  const filas: { nombre: string; estado: 'up' | 'down' }[] = [
    { nombre: 'API', estado: salud ? 'up' : 'down' },
    { nombre: 'Base de datos', estado: salud?.db ?? 'down' },
    { nombre: 'Redis', estado: salud?.redis ?? 'down' },
  ];

  return (
    <main>
      <h1>Kancha</h1>
      <p className="sub">Gestión deportiva institucional</p>

      {/* Tarjeta del Club Activo */}
      {clubActivo ? (
        <section
          className="tarjeta"
          style={{
            marginBottom: '1.25rem',
            borderLeft: `4px solid ${clubActivo.colorPrimario ?? 'var(--ok)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1rem' }}>
            {clubActivo.logoUrl ? (
              <img
                src={clubActivo.logoUrl}
                alt={clubActivo.nombre}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '0.5rem',
                  objectFit: 'contain',
                  background: 'var(--fondo)',
                  border: '1px solid var(--borde)',
                  padding: '2px',
                }}
              />
            ) : (
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '0.5rem',
                  background: clubActivo.colorPrimario ?? 'var(--ok)',
                  color: '#04130c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                }}
              >
                {clubActivo.nombre.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--texto)', textTransform: 'none' }}>
                {clubActivo.nombre}
              </h2>
              <p className="suave" style={{ margin: '0.2rem 0 0', fontSize: '0.8rem' }}>
                {clubActivo.deporte.toUpperCase()} {clubActivo.ciudad ? `· ${clubActivo.ciudad}` : ''}
              </p>
            </div>
          </div>

          <div className="fila">
            <span className="suave">Mi membresía</span>
            <span style={{ fontWeight: 600, color: clubActivo.esPropietario ? 'var(--color-club-acento)' : 'var(--texto)' }}>
              {clubActivo.esPropietario ? 'Propietario (Owner)' : 'Miembro activo'}
            </span>
          </div>

          <div className="fila">
            <span className="suave">Colores del club</span>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span
                title={`Primario: ${clubActivo.colorPrimario}`}
                style={{ width: '18px', height: '18px', borderRadius: '50%', background: clubActivo.colorPrimario ?? '#3ecf8e', border: '1px solid rgba(255,255,255,0.2)' }}
              />
              <span
                title={`Secundario: ${clubActivo.colorSecundario}`}
                style={{ width: '18px', height: '18px', borderRadius: '50%', background: clubActivo.colorSecundario ?? '#1f7a52', border: '1px solid rgba(255,255,255,0.2)' }}
              />
              <span
                title={`Acento: ${clubActivo.colorAcento}`}
                style={{ width: '18px', height: '18px', borderRadius: '50%', background: clubActivo.colorAcento ?? '#6ef0b0', border: '1px solid rgba(255,255,255,0.2)' }}
              />
            </div>
          </div>
        </section>
      ) : (
        <section
          className="tarjeta"
          style={{
            marginBottom: '1.25rem',
            background: 'linear-gradient(180deg, rgba(62, 207, 142, 0.08) 0%, var(--superficie) 100%)',
            border: '1px dashed var(--borde)',
            textAlign: 'center',
            padding: '1.5rem 1rem',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚽</div>
          <h2 style={{ textTransform: 'none', fontSize: '1.1rem', color: 'var(--texto)', margin: '0 0 0.5rem' }}>
            Aún no tienes un club deportivo
          </h2>
          <p className="suave" style={{ fontSize: '0.85rem', margin: '0 0 1rem' }}>
            Crea tu institución para organizar categorías, invitar a tu cuerpo técnico, gestionar atletas y pagos.
          </p>
          <Link href="/clubes/nuevo" className="boton" style={{ maxWidth: '14rem', margin: '0 auto' }}>
            + Crear mi club
          </Link>
        </section>
      )}

      {/* Contenedor con los datos del usuario autenticado */}
      <section className="tarjeta" style={{ marginBottom: '1.25rem' }}>
        <h2>Perfil de usuario</h2>
        <div className="fila">
          <span className="suave">Nombre completo</span>
          <span style={{ fontWeight: 500 }}>
            {perfil.nombres} {perfil.apellidos}
          </span>
        </div>
        <div className="fila">
          <span className="suave">Correo electrónico</span>
          <span style={{ fontWeight: 500 }}>{perfil.correo}</span>
        </div>
        <div className="fila">
          <span className="suave">Rol global</span>
          <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
            {perfil.rol ?? 'Sin rol asignado'}
          </span>
        </div>
        <div className="fila">
          <span className="suave">Documento (Cédula/RIF)</span>
          <span style={{ fontWeight: 500 }}>{perfil.cedula ?? 'No especificado'}</span>
        </div>
        <div className="fila">
          <span className="suave">Teléfono</span>
          <span style={{ fontWeight: 500 }}>{perfil.telefono ?? 'No especificado'}</span>
        </div>
        <div className="fila">
          <span className="suave">Código público</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{perfil.codigoPublico}</span>
        </div>
        <div className="fila">
          <span className="suave">Estado</span>
          <span className="estado" data-estado={perfil.estado === 'activo' ? 'up' : 'down'}>
            {perfil.estado === 'activo' ? 'Activo' : 'Suspendido'}
          </span>
        </div>
      </section>

      <section className="tarjeta">
        <h2>Estado del sistema</h2>
        {filas.map((fila) => (
          <div className="fila" key={fila.nombre}>
            <span>{fila.nombre}</span>
            <span className="estado" data-estado={fila.estado}>
              {fila.estado === 'up' ? 'En línea' : 'Sin conexión'}
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
