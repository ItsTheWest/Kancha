import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);

  /**
   * Envía (o simula en desarrollo) el código de verificación de correo.
   */
  async enviarCodigoVerificacion(
    correo: string,
    codigo: string,
    nombre: string,
  ): Promise<void> {
    this.logger.log(
      `\n======================================================\n` +
      `[EMAIL - VERIFICACIÓN DE CORREO]\n` +
      `Para: ${nombre} <${correo}>\n` +
      `Código de 6 dígitos: ${codigo}\n` +
      `Expira en: 15 minutos\n` +
      `======================================================\n`
    );
  }

  /**
   * Envía (o simula en desarrollo) el código de recuperación de contraseña.
   */
  async enviarCodigoRecuperacion(
    correo: string,
    codigo: string,
    nombre: string,
  ): Promise<void> {
    this.logger.log(
      `\n======================================================\n` +
      `[EMAIL - RECUPERACIÓN DE CONTRASEÑA]\n` +
      `Para: ${nombre} <${correo}>\n` +
      `Código de 6 dígitos: ${codigo}\n` +
      `Expira en: 15 minutos\n` +
      `======================================================\n`
    );
  }
}
