import { llamarApi } from '../../lib/api';

// Se oculta solo si el backend no tiene credenciales de Google configuradas.
export async function BotonGoogle({ siguiente }: { siguiente?: string }) {
  const proveedores = await llamarApi<{ google: boolean }>('/auth/proveedores');
  if (!proveedores.datos?.google) return null;

  const destino = siguiente
    ? `/api/auth/google?siguiente=${encodeURIComponent(siguiente)}`
    : '/api/auth/google';
  return (
    <>
      <div className="separador">o</div>
      {/* Enlace normal y no <Link>: es una navegación completa hacia fuera del sitio. */}
      <a className="boton boton-secundario" href={destino}>
        Continuar con Google
      </a>
    </>
  );
}
