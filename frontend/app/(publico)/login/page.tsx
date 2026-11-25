import Link from 'next/link';
import { rutaSegura } from '../../../lib/cookies';
import { BotonGoogle } from '../boton-google';
import { FormularioLogin } from './formulario';

export const dynamic = 'force-dynamic';

const ERRORES: Record<string, string> = {
  google: 'No pudimos iniciar sesión con Google. Inténtalo de nuevo.',
  google_vinculado: 'Ese correo ya está vinculado a otra cuenta de Google.',
  correo_en_uso: 'Ya existe una cuenta con este correo. Inicia sesión con tus credenciales.',
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string; error?: string }>;
}) {
  const { siguiente, error } = await searchParams;
  const destino = rutaSegura(siguiente);

  return (
    <main>
      <h1>Kancha</h1>
      <p className="sub">Inicia sesión para continuar</p>
      <section className="tarjeta">
        {error && ERRORES[error] && (
          <p className="aviso" role="alert">
            {ERRORES[error]}
          </p>
        )}
        <FormularioLogin siguiente={destino} />
        <BotonGoogle siguiente={destino === '/' ? undefined : destino} />
      </section>
      <p className="pie">
        ¿No tienes cuenta? <Link href="/registro">Regístrate</Link>
      </p>
    </main>
  );
}
