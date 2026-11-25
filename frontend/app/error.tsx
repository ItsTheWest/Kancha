'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error no controlado en la aplicación:', error);
  }, [error]);

  return (
    <main style={{ textAlign: 'center' }}>
      <h1>Algo salió mal</h1>
      <p className="sub">Ocurrió un error inesperado</p>
      <section className="tarjeta" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--texto-suave)', fontSize: '0.9rem', margin: '0 0 1.25rem' }}>
          Hemos detectado un problema al procesar la solicitud. Puedes intentar recargar la sección.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="boton"
          style={{ width: 'auto', display: 'inline-block', padding: '0.65rem 1.5rem' }}
        >
          Reintentar
        </button>
      </section>
    </main>
  );
}
