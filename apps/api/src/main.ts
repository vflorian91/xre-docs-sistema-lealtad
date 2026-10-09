import 'reflect-metadata';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './modules/app.module';
import { applySpanishZodErrors } from './modules/common/zod-es';

applySpanishZodErrors();

const DEFAULT_SECRET_VALUES = new Set([
  'change-me-access',
  'change-me-refresh',
  'changeme',
  'secret',
]);

function assertProductionSecrets() {
  if (process.env.APP_ENV !== 'production') return;

  const requiredSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const problems: string[] = [];

  for (const key of requiredSecrets) {
    const value = process.env[key];
    if (!value) {
      problems.push(`${key} no esta definido.`);
    } else if (value.length < 32) {
      problems.push(`${key} es demasiado corto (minimo 32 caracteres).`);
    } else if (DEFAULT_SECRET_VALUES.has(value)) {
      problems.push(`${key} usa un valor de ejemplo/por defecto.`);
    }
  }

  if (process.env.JWT_ACCESS_SECRET && process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    problems.push('JWT_ACCESS_SECRET y JWT_REFRESH_SECRET no pueden ser iguales.');
  }

  if (problems.length > 0) {
    throw new Error(`Configuracion insegura para produccion:\n - ${problems.join('\n - ')}`);
  }
}

function corsOrigins() {
  const explicitOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (explicitOrigins?.length) {
    return explicitOrigins;
  }

  return [
    process.env.ADMIN_WEB_URL ?? 'http://localhost:3000',
    process.env.CLIENT_PWA_URL ?? 'http://localhost:3002',
  ];
}

async function bootstrap() {
  assertProductionSecrets();

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({
    bodyLimit: 16 * 1024 * 1024,
    trustProxy: true,
  }));

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await app.register(cookie as never);

  app.enableCors({
    origin: corsOrigins(),
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'authorization', 'x-csrf-token'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
