import Link from 'next/link';
import { BotonGoogle } from '../boton-google';
import { FormularioRegistro } from './formulario';

export const dynamic = 'force-dynamic';

export default function Registro() {
  return (
    <main>
      <h1>Kancha</h1>
      <p className="sub">Crea tu cuenta</p>
      <section className="tarjeta">
        <FormularioRegistro />
        <BotonGoogle />
      </section>
      <p className="pie">
        ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
      </p>
    </main>
  );
}
