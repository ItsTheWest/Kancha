import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ textAlign: 'center' }}>
      <h1>404</h1>
      <p className="sub">Página no encontrada</p>
      <section className="tarjeta" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--texto-suave)', fontSize: '0.9rem', margin: '0 0 1.25rem' }}>
          La página que buscas no existe o ha sido movida.
        </p>
        <Link href="/" className="boton" style={{ width: 'auto', display: 'inline-block', padding: '0.65rem 1.5rem' }}>
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
