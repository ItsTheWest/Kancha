import { requerirSesion } from '../../lib/sesion';

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
  const filas: { nombre: string; estado: 'up' | 'down' }[] = [
    { nombre: 'API', estado: salud ? 'up' : 'down' },
    { nombre: 'Base de datos', estado: salud?.db ?? 'down' },
    { nombre: 'Redis', estado: salud?.redis ?? 'down' },
  ];

  return (
    <main>
      <h1>Kancha</h1>
      <p className="sub">Gestión para clubes deportivos</p>

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
          <span className="suave">Rol</span>
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
