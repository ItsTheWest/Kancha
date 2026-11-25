import Link from 'next/link';
import { BotonGoogle } from '../boton-google';
import { FormularioRegistro } from './formulario';

export const dynamic = 'force-dynamic';

const MENSAJES_ERROR: Record<string, string> = {
  correo_en_uso: 'Ya existe una cuenta con este correo electrónico. Por favor, inicia sesión.',
  cedula_en_uso: 'Ya existe una cuenta con este documento de identidad.',
  google: 'No pudimos conectar con Google. Inténtalo de nuevo.',
  google_vinculado: 'Ese correo ya está vinculado a otra cuenta.',
};

export default async function Registro({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const aviso = error ? MENSAJES_ERROR[error] ?? 'Ocurrió un error. Inténtalo de nuevo.' : null;

  return (
    <main>
      <h1>Kancha</h1>
      <p className="sub">Crea tu cuenta</p>
      {aviso && (
        <p className="aviso" role="alert">
          {aviso}
        </p>
      )}
      <section className="tarjeta">
        <FormularioRegistro />
        <BotonGoogle siguiente="/?origen=registro" />
      </section>
      <p className="pie">
        ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
      </p>
    </main>
  );
}
