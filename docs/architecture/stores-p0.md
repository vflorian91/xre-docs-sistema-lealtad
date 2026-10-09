# Tiendas y Tienda Activa P0

## Alcance construido

- CRUD basico de tiendas.
- Asignacion de usuarios internos a tiendas.
- Consulta de tiendas asignadas al usuario autenticado.
- Seleccion de tienda activa por sesion.
- Auto seleccion de tienda activa al login cuando el usuario tiene exactamente una tienda activa asignada.
- Validacion backend para impedir activar tiendas no asignadas o inactivas.
- Limpieza de tienda activa en sesiones cuando una tienda pasa a inactiva.
- Auditoria de creacion, edicion, asignacion y cambio de tienda activa.

## Endpoints de tiendas

```txt
GET   /api/stores
POST  /api/stores
GET   /api/stores/my
GET   /api/stores/active
POST  /api/stores/active
GET   /api/stores/:id
PATCH /api/stores/:id
POST  /api/stores/:id/users
```

## Endpoints de usuarios internos

```txt
GET  /api/internal-users
POST /api/internal-users
GET  /api/internal-users/roles
```

## Regla de tienda activa

La tienda activa vive en `InternalSession.activeStoreId`, no en el formulario de compra.

- Usuario con una sola tienda activa asignada: el backend la marca automaticamente al login.
- Usuario con varias tiendas activas asignadas: el backend deja `activeStoreId` vacio y `GET /api/stores/my` devuelve `requiresSelection: true`.
- El usuario solo puede activar tiendas asignadas a el.
- Tiendas inactivas no pueden activarse para operacion.

## Impacto en compras

Cuando se construya el registro de compras, el backend debera tomar `storeId` desde la
sesion autenticada. El request de compra no debera aceptar tienda manual.
