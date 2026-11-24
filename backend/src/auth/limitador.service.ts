import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';

@Injectable()
export class LimitadorService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  // Contador de ventana fija: INCR + EXPIRE NX en una sola transacción, así la clave
  // nunca queda sin caducidad aunque el proceso muera entre los dos comandos.
  async consumir(clave: string, maximo: number, ventanaSeg: number): Promise<void> {
    const resultado = await this.redis
      .multi()
      .incr(clave)
      .expire(clave, ventanaSeg, 'NX')
      .exec();
    const cuenta = Number(resultado?.[0]?.[1] ?? 0);
    if (cuenta > maximo) {
      // Mensaje idéntico exista o no la cuenta: el bloqueo no debe servir de oráculo.
      throw new HttpException('demasiados_intentos', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  reiniciar(clave: string): Promise<number> {
    return this.redis.del(clave);
  }

  // El correo se hashea para no dejar datos personales visibles en Redis.
  huella(valor: string): string {
    return createHash('sha256').update(valor.trim().toLowerCase()).digest('hex');
  }
}
