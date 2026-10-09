# Despliegue Portable y Produccion

## Objetivo

La plataforma debe poder desplegarse en AWS, Render, Railway, DigitalOcean, VPS con Docker
u otro proveedor sin reescribir codigo de negocio.

## Principios

- PostgreSQL estandar como base de datos.
- Prisma migrations como fuente de cambios de esquema.
- Archivos fuera del repositorio, con storage local en desarrollo y S3-compatible en produccion.
- Frontends y API separados por servicio.
- Dominios y CORS controlados por variables de entorno.
- Dockerfiles por servicio para evitar dependencia fuerte de un proveedor.

## Dominios recomendados

- `admin.tudominio.com`: Web Administrador.
- `app.tudominio.com`: PWA Cliente.
- `api.tudominio.com`: API backend.

## Variables criticas

API:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `API_PORT`
- `ADMIN_WEB_URL`
- `CLIENT_PWA_URL`
- `CORS_ORIGINS`
- `MEDIA_STORAGE_DIR`

Frontends:

- `NEXT_PUBLIC_API_URL`

Importante: en Next.js, `NEXT_PUBLIC_API_URL` se fija al momento de build. Si cambia el
dominio de API, se debe reconstruir el frontend.

## Base de datos

Produccion debe usar PostgreSQL administrado o un PostgreSQL operado con backups:

- AWS RDS PostgreSQL.
- DigitalOcean Managed PostgreSQL.
- Render PostgreSQL.
- Railway PostgreSQL.
- Neon, Crunchy Bridge u otro proveedor compatible.

Comando de migracion para produccion:

```bash
npm run db:deploy
```

El comando `db:migrate` queda para desarrollo local.

## Storage

Estado actual:

- Metadata en tabla `MediaAsset`.
- Archivos en `MEDIA_STORAGE_DIR`.

Produccion recomendada:

- S3, Cloudflare R2, MinIO o storage compatible.
- Mantener `publicUrl`, `storageProvider` y `storageKey` para migrar sin tocar clientes,
  premios ni banners.

## Docker

Cada plataforma tiene un Dockerfile propio:

- `docker/api.Dockerfile`
- `docker/admin-web.Dockerfile`
- `docker/client-pwa.Dockerfile`

Compose local de referencia:

```bash
docker compose up --build
```

Luego aplicar migraciones y seed inicial:

```bash
docker compose run --rm api npm run db:deploy
docker compose run --rm api npm run db:seed
```

## Orden recomendado de primer despliegue

1. Crear base de datos PostgreSQL.
2. Crear storage externo o volumen persistente.
3. Configurar secretos JWT.
4. Configurar dominios y HTTPS.
5. Construir y desplegar API.
6. Ejecutar migraciones.
7. Ejecutar seed inicial una sola vez.
8. Construir frontends con `NEXT_PUBLIC_API_URL` definitivo.
9. Configurar CORS con los dominios frontend.
10. Probar login, compras, puntos, canjes, media y banners.

## Estrategia anti-amarramiento

Evitar dependencias directas del proveedor dentro del codigo de negocio.

Permitido:

- Variables de entorno.
- Docker.
- PostgreSQL.
- S3-compatible storage.
- Logs por stdout/stderr.

Evitar:

- SDK propietario dentro de modulos de negocio sin adaptador.
- Rutas de archivos locales no configurables.
- Secretos escritos en codigo.
- URLs fijas dentro de frontend o backend.

## Backups minimos

- Backup diario de PostgreSQL.
- Retencion minima de 7 a 30 dias segun presupuesto.
- Backup o replicacion del bucket/storage de imagenes.
- Prueba periodica de restauracion en staging.

## Ambientes

- `development`: local.
- `staging`: replica de produccion para pruebas.
- `production`: ambiente real.

Cada ambiente debe tener su propia base de datos, storage, secretos y dominios.
