# Despliegue de produccion con HTTPS

La configuracion de produccion publica solamente Caddy en los puertos 80 y 443. PostgreSQL, MinIO, API, Admin y PWA permanecen dentro de la red privada de Docker.

## Requisitos

- Un servidor con Docker Compose.
- Tres dominios apuntando a la IP del servidor: Admin, PWA y API.
- Puertos 80 y 443 abiertos.
- Un volumen externo y cifrado para `/backups`.

## Secretos

1. Copia `.env.production.example` como `.env.production`.
2. Reemplaza todas las contrasenas y secretos de ejemplo.
3. Protege el archivo:

```sh
chmod 600 .env.production
```

`.env.production` esta ignorado por Git y nunca debe subirse al repositorio.

## Despliegue

```sh
npm run production:config
npm run production:up
npm run production:status
```

Caddy obtiene y renueva automaticamente los certificados TLS cuando los dominios publicos resuelven al servidor. En dominios `.localhost` utiliza certificados locales para pruebas.

Despues de desplegar:

```sh
npm run production:backup:test
```

No utilices `docker compose down -v` en produccion: `-v` elimina los volumenes de base de datos, objetos y certificados.
