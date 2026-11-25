import { redirect } from 'next/navigation';
import { requerirSesion } from '../../../lib/sesion';
import { FormularioVerificarCorreo } from './formulario';

export const dynamic = 'force-dynamic';

export default async function VerificarCorreoPage() {
  const perfil = await requerirSesion();

  if (perfil.correoVerificadoEn) {
    redirect('/');
  }

  return (
    <main>
      <h1>Kancha</h1>
      <p className="sub">Verificación de seguridad</p>
      <section className="tarjeta">
        <h2>Verifica tu correo electrónico</h2>
        <FormularioVerificarCorreo correo={perfil.correo} />
      </section>
    </main>
  );
}
