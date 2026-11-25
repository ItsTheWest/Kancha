import { Injectable, OnModuleInit } from '@nestjs/common';
import { Algorithm, hash, verify } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';

// Parámetros mínimos recomendados por OWASP para argon2id.
const OPCIONES = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class ContrasenasService implements OnModuleInit {
  private hashSenuelo = '';

  // Hash de una contraseña aleatoria que nadie conoce: se verifica contra él cuando
  // el correo no existe, para que ambas ramas del login tarden lo mismo.
  async onModuleInit() {
    this.hashSenuelo = await hash(randomBytes(24).toString('base64url'), OPCIONES);
  }

  hashear(contrasena: string): Promise<string> {
    return hash(contrasena, OPCIONES);
  }

  async verificar(hashGuardado: string, contrasena: string): Promise<boolean> {
    try {
      return await verify(hashGuardado, contrasena);
    } catch {
      return false;
    }
  }

  async verificarSenuelo(contrasena: string): Promise<void> {
    await this.verificar(this.hashSenuelo, contrasena);
  }
}
