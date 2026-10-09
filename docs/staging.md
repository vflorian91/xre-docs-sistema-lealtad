# Ambiente de staging

Staging usa la misma aplicacion y migraciones de produccion, pero mantiene base de datos, storage, backups y puertos completamente separados del ambiente local principal.

## Iniciar

1. Copia `.env.staging.example` como `.env.staging` y reemplaza todos los secretos de ejemplo.
2. Ejecuta:

```sh
npm run staging:up
```

Servicios locales:

- Admin: `http://localhost:3100`
- PWA: `http://localhost:3102`
- API: `http://localhost:4100/api`
- Health: `http://localhost:4100/api/health`
- MinIO: `http://localhost:9101`

## Operacion

```sh
npm run staging:status
npm run staging:logs
npm run staging:backup:test
npm run staging:down
```

`staging:down` conserva los volúmenes y los datos. Para un servidor remoto, cambia las URLs por dominios HTTPS y establece `STAGING_COOKIE_SECURE=true`.
