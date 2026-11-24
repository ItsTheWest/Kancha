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
