# Zapateria XDOC — Sistema de lealtad y tienda online

Aplicación de fidelización comercial con validación automatizada en Azure DevOps.

La actualización de octubre incorpora la identidad XDOC y el estilo vintage en administración, tienda y mensajeros, logos de marcas y correcciones de los reportes mensuales. La guía [XDOC-ACTUALIZACION](docs/XDOC-ACTUALIZACION.md) explica los cambios y la carga opcional del catálogo de 70 productos y la actividad de septiembre y octubre, sin publicar credenciales de la instalación local.

- Código público: https://github.com/vflorian91/xre-docs-sistema-lealtad
- Proyecto Azure DevOps: https://dev.azure.com/victoreflorian/XRE%20Docs%20Lealtad
- Pruebas: 107 comprobaciones: 37 de API, 27 de reglas y 43 de conexión y sesiones.
- Última validación: [107/107 pruebas aprobadas en Azure, ejecución 19](https://dev.azure.com/victoreflorian/XRE%20Docs%20Lealtad/_build/results?buildId=19&view=ms.vss-test-web.build-test-results-tab), el 28 de octubre de 2026 en Guatemala.
- Pipeline: azure-pipelines.yml. Resultados publicados en tres ejecuciones JUnit y un artefacto.
- Guía de ejecución: docs/AZURE-DEVOPS.md.
- Catálogo de los 107 casos: tests/test-cases.json.
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
