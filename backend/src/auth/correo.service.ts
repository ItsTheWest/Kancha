import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);
  private readonly apiKey = process.env.RESEND_API_KEY;
  private readonly from = process.env.EMAIL_FROM || 'Kancha <onboarding@resend.dev>';

  /**
   * Envía el código de verificación de correo.
   */
  async enviarCodigoVerificacion(
    correo: string,
    codigo: string,
    nombre: string,
  ): Promise<void> {
    const asunto = `${codigo} es tu código de verificación - Kancha`;
    const html = this.plantillaHtml({
      titulo: 'Verifica tu correo electrónico',
      nombre,
      codigo,
      mensaje:
        'Gracias por registrarte en Kancha. Usa el siguiente código de seguridad de 6 dígitos para verificar tu cuenta y comenzar a utilizar la plataforma:',
    });

    await this.despacharCorreo(correo, asunto, html, 'VERIFICACIÓN DE CORREO', codigo, nombre);
  }

  /**
   * Envía el código de recuperación de contraseña.
   */
  async enviarCodigoRecuperacion(
    correo: string,
    codigo: string,
    nombre: string,
  ): Promise<void> {
    const asunto = `${codigo} es tu código de recuperación de contraseña - Kancha`;
    const html = this.plantillaHtml({
      titulo: 'Recuperación de contraseña',
      nombre,
      codigo,
      mensaje:
        'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Kancha. Usa el siguiente código de seguridad de 6 dígitos para continuar:',
    });

    await this.despacharCorreo(correo, asunto, html, 'RECUPERACIÓN DE CONTRASEÑA', codigo, nombre);
  }

  private async despacharCorreo(
    para: string,
    asunto: string,
    html: string,
    tipo: string,
    codigo: string,
    nombre: string,
  ): Promise<void> {
    // Registro informativo en consola siempre disponible para depuración local
    this.logger.log(
      `\n======================================================\n` +
      `[EMAIL - ${tipo}]\n` +
      `Para: ${nombre} <${para}>\n` +
      `Código de 6 dígitos: ${codigo}\n` +
      `Expira en: 15 minutos\n` +
      `======================================================\n`
    );

    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY no configurada. El correo solo se imprimió en consola.');
      return;
    }

    try {
      const respuesta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [para],
          subject: asunto,
          html,
        }),
      });

      if (!respuesta.ok) {
        const error = await respuesta.text();
        this.logger.error(`Error de Resend al enviar correo a ${para}: ${error}`);
      } else {
        const datos = (await respuesta.json()) as { id?: string };
        this.logger.log(`Correo enviado exitosamente vía Resend a ${para} (id: ${datos.id})`);
      }
    } catch (err) {
      this.logger.error(`Excepción al conectar con Resend: ${(err as Error).message}`);
    }
  }

  private plantillaHtml(datos: {
    titulo: string;
    nombre: string;
    codigo: string;
    mensaje: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${datos.titulo}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e8edf3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #141a22; border: 1px solid #243040; border-radius: 12px; overflow: hidden; padding: 32px 28px;">
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #3ecf8e; letter-spacing: -0.5px;">Kancha</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #93a1b3;">Gestión deportiva inteligente</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #ffffff;">Hola, ${datos.nombre}</h2>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #93a1b3;">
                ${datos.mensaje}
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 0;">
              <div style="background-color: #0b0f14; border: 1px dashed #3ecf8e; border-radius: 8px; padding: 18px 24px; display: inline-block;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #3ecf8e; text-transform: uppercase;">
                  ${datos.codigo}
                </span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #93a1b3;">
                Este código expira en <strong>15 minutos</strong> y solo puede utilizarse una vez.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #243040; padding-top: 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #627284;">
                Si tú no solicitaste este código, puedes ignorar este mensaje con total seguridad. Nadie puede acceder a tu cuenta sin él.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
