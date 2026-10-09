# Ejecutar en Windows

Mantén Docker Desktop abierto. Desde esta carpeta, inicia los servicios:

Puedes hacer doble clic en `Iniciar aplicación.cmd` para iniciar o `Detener aplicación.cmd` para detener.

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d api admin-web client-pwa driver-pwa
```

También puedes ejecutar `powershell -ExecutionPolicy Bypass -File .\iniciar-local.ps1`.

Direcciones:

- Administración: http://localhost:3000
- Clientes: http://localhost:3002
- Repartidores: http://localhost:3003
- Estado de API, base de datos y almacenamiento: http://localhost:4000/api/health

El administrador inicial utiliza `SEED_SUPER_ADMIN_EMAIL` y `SEED_SUPER_ADMIN_PASSWORD` del archivo `.env`. Al iniciar sesión se exige cambiar la contraseña.

La base local incluye los catálogos geográficos de Guatemala: 22 departamentos y 340 municipios. En Nuevo cliente, Departamento depende del país seleccionado y Municipio del departamento. La carga inicial se realiza con `npm run db:seed:guatemala-geo` dentro del contenedor API. Ese comando reemplaza los catálogos geográficos; no lo repitas sobre una base con datos personalizados.

Para detener los servicios conservando los datos:

```powershell
powershell -ExecutionPolicy Bypass -File .\detener-local.ps1
```

Para reconstruir después de modificar código:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build api admin-web client-pwa driver-pwa
```

Para consultar errores:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml logs --tail=100 api admin-web client-pwa driver-pwa
```

Este entorno usa PostgreSQL y almacenamiento LOCAL en volúmenes persistentes de Docker. MinIO y el servicio de backups del Compose original no se inician. No uses `down -v` si quieres conservar la información.

La configuración previa de `.env` se conserva en `.env.before-local-setup.bak`.
