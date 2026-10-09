# XRE Docs — Sistema de lealtad

Aplicación de fidelización comercial con validación automatizada en Azure DevOps.

- Código público: https://github.com/vflorian91/xre-docs-sistema-lealtad
- Proyecto Azure DevOps: https://dev.azure.com/victoreflorian/XRE%20Docs%20Lealtad
- Pruebas: 37 comprobaciones de API y 23 casos automatizados existentes.
- Pipeline: azure-pipelines.yml. Resultados publicados en dos ejecuciones JUnit y un artefacto.
- Guía de ejecución: docs/AZURE-DEVOPS.md.
- Catálogo de los 60 casos: tests/test-cases.json.
- Documentación académica, Word, capturas y presentación: docs/entrega/.

Ejecutar todas las pruebas con Docker activo y Node.js 22:

    node scripts/ci/run.cjs

Cada ejecución utiliza una base efímera y credenciales aleatorias; no usa la base local de la demostración. El código se publica como una copia saneada del árbol de trabajo, con historial nuevo. No contiene archivos .env operativos, contraseñas de demostración, dumps ni dependencias instaladas.

Integrantes: Victor Estuardo Florian, Dino Fiagioli y Jorge Otoniel Castillo Ortega.

## Documentación técnica de la aplicación

# Sistema de Lealtad y Premiacion

Monorepo inicial para el Sistema de Lealtad y Premiacion.

## Apps

- `apps/api`: API central.
- `apps/admin-web`: Web Administrador.
- `apps/client-pwa`: PWA Cliente.

## Paquetes

- `packages/database`: Prisma y modelo de datos.

## Comandos

```bash
npm install
npm run db:generate
npm run build
```

## Docker portable

El proyecto incluye Dockerfiles por servicio y un `docker-compose.yml` de referencia:

```bash
docker compose up --build
```

Migraciones de produccion:

```bash
npm run db:deploy
```

En Docker:

```bash
docker compose run --rm api npm run db:deploy
docker compose run --rm api npm run db:seed
```

## Base de datos local

Crear un archivo `.env` a partir de `.env.example` y configurar `DATABASE_URL`.

La primera fase del MVP usa PostgreSQL y Prisma.

## Despliegue

La estrategia recomendada esta documentada en:

- `docs/architecture/deployment-production.md`

Dominios sugeridos:

- `admin.tudominio.com`
- `app.tudominio.com`
- `api.tudominio.com`
