# Autenticacion P0

## Alcance construido

- Login de usuarios internos.
- Sesiones internas persistidas.
- Access token JWT.
- Refresh token JWT con hash en base de datos.
- Rotacion de refresh token.
- Logout con revocacion de sesion.
- Guard JWT para rutas protegidas.
- Guard de permisos por metadata.
- Auditoria de login exitoso, login fallido, logout y reutilizacion sospechosa de refresh token.
- Seed de permisos, roles base, regla inicial de puntos y primer Super Admin.

## Endpoints

```txt
GET  /api/health
POST /api/auth/internal/login
POST /api/auth/internal/refresh
GET  /api/auth/internal/me
POST /api/auth/internal/logout
GET  /api/auth/internal/permissions-check
```

## Desarrollo local

La API lee variables desde:

```txt
apps/api/.env.local
apps/api/.env
.env
```

Prisma lee `DATABASE_URL` desde:

```txt
packages/database/.env
```

Comandos usados para preparar la base local:

```bash
createdb sistema_lealtad
npm run db:migrate -w @lealtad/database -- --name init_p0_auth
set -a && source .env && set +a && npm run db:seed
```

Credenciales de desarrollo creadas por seed:

```txt
admin@example.com
REPLACE_WITH_SECURE_LOCAL_VALUE
```

Estas credenciales deben cambiarse antes de cualquier ambiente compartido o productivo.
