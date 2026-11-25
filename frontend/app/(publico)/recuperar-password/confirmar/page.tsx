import { redirect } from 'next/navigation';
import { FormularioConfirmarRecuperacion } from './formulario';

export const dynamic = 'force-dynamic';

export default async function ConfirmarRecuperacionPage({
  searchParams,
}: {
  searchParams: Promise<{ correo?: string }>;
}) {
  const { correo } = await searchParams;
  if (!correo) {
    redirect('/recuperar-password');
  }

  return (
    <main>
      <h1>Kancha</h1>
      <p className="sub">Nueva contraseña</p>
      <section className="tarjeta">
        <h2>Ingresa tu código</h2>
        <FormularioConfirmarRecuperacion correoInicial={correo} />
      </section>
    </main>
  );
}
