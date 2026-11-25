import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Un salto de proxy de confianza (el BFF de Next): `req.ip` sale de X-Forwarded-For.
  app.set('trust proxy', 1);
  // whitelist + forbidNonWhitelisted evitan el mass-assignment (campos no declarados).
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`[api] escuchando en el puerto ${port}`);
}

bootstrap();
