import { FormularioSolicitarRecuperacion } from './formulario';

export const dynamic = 'force-dynamic';

export default function RecuperarPasswordPage() {
  return (
    <main>
      <h1>Kancha</h1>
      <p className="sub">Recuperar acceso a tu cuenta</p>
      <section className="tarjeta">
        <h2>Recuperar contraseña</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--texto-suave)', marginBottom: '1rem' }}>
          Ingresa tu correo y te enviaremos un código de seguridad de 6 dígitos para restablecer tu contraseña.
        </p>
        <FormularioSolicitarRecuperacion />
      </section>
    </main>
  );
}
