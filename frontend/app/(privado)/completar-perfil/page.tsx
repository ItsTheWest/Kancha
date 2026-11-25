import { FormularioCompletarPerfil } from './formulario';

export const dynamic = 'force-dynamic';

export default function CompletarPerfil() {
  return (
    <main>
      <h1>¡Bienvenido a Kancha!</h1>
      <p className="sub">Para finalizar tu registro, completa los datos obligatorios:</p>
      <section className="tarjeta">
        <FormularioCompletarPerfil />
      </section>
    </main>
  );
}
