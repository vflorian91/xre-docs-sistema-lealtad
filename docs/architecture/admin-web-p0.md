# Web Administrador P0

## Alcance implementado

La Web Administrador ya inicia sesion con usuarios internos y consume un resumen global del
sistema desde backend. Este resumen no depende de tienda activa y requiere permiso
`reports.read`.

Tambien incluye navegacion administrativa inicial para consultar, crear y editar datos P0
basicos: tiendas, clientes, usuarios internos y reglas de puntos.

Tambien incluye una vista P1 inicial de premios para consultar y crear premios basicos desde
backend. La experiencia visual final de premios y permisos queda para una fase posterior.

Incluye una vista P1 de canjes para listar, filtrar por estado/codigo, cancelar canjes
pendientes y ejecutar vencimiento administrativo por lote.

Tambien permite subir imagenes de premios usando el modulo de media; los archivos no se guardan
en carpetas del codigo.

Incluye una vista P1 de banners publicitarios para crear contenido visual, subir imagen y
activar/desactivar publicaciones visibles en PWA Cliente.

Incluye una vista P1 de notificaciones internas para crear mensajes dirigidos a clientes,
usuarios internos o roles.

## Endpoints usados

- `POST /api/auth/internal/login`
- `POST /api/auth/internal/logout`
- `GET /api/admin/summary`
- `GET /api/admin/reports`
- `GET /api/audit`
- `GET /api/customers`
- `GET /api/stores`
- `POST /api/stores`
- `PATCH /api/stores/:id`
- `PATCH /api/customers/:id`
- `GET /api/internal-users`
- `POST /api/internal-users`
- `PATCH /api/internal-users/:id`
- `GET /api/internal-users/roles`
- `GET /api/catalogs`
- `GET /api/points/rules`
- `POST /api/points/rules`
- `POST /api/purchases/:id/reverse`
- `GET /api/rewards`
- `POST /api/rewards`
- `GET /api/redemptions`
- `POST /api/redemptions/:id/cancel`
- `POST /api/redemptions/expire`
- `POST /api/media/rewards/image`
- `GET /api/marketing-banners`
- `POST /api/marketing-banners`
- `PATCH /api/marketing-banners/:id`
- `POST /api/media/assets`
- `GET /api/notifications`
- `POST /api/notifications`
- `PATCH /api/notifications/:id`

## Metricas P0

- Clientes totales.
- Tiendas activas.
- Usuarios internos activos.
- Compras aprobadas.
- Monto total vendido registrado manualmente.
- Puntos emitidos.
- Puntos disponibles.
- Catalogos activos.
- Regla de puntos activa.
- Compras recientes.
- Reporte basico de ultimos 30 dias.
- Ventas por tienda.
- Clientes destacados por puntos emitidos.
- Actividad diaria.
- Desglose de movimientos de puntos.
- Auditoria visual de eventos recientes.
- Resumen de auditoria por modulo y acciones frecuentes.
- Vista de roles y permisos por modulo.
- Matriz de permisos por rol.
- Reversa operativa de compras aprobadas.
- Catalogo basico de premios P1.
- Gestion basica de canjes P1.
- Subida de imagenes para premios P1.
- Gestion basica de banners publicitarios P1.
- Gestion basica de notificaciones internas P1.

## Seguridad

- El dashboard requiere sesion interna.
- El backend valida permiso `reports.read`.
- El reporte administrativo basico tambien requiere `reports.read` y solo expone datos
  agregados o listados operativos del periodo.
- La edicion de usuarios internos requiere `users.manage`.
- La vista de roles y permisos usa `roles.read` y `GET /api/internal-users/roles`.
- Si un usuario interno se desactiva o bloquea, el backend revoca sus sesiones abiertas.
- Si cambia la asignacion de tiendas, el backend limpia cualquier tienda activa que ya no este
  permitida para ese usuario.
- La lectura de auditoria requiere `audit.read`.
- La reversa de compras requiere `purchases.reverse` y siempre se valida desde backend.
- La administracion basica de premios usa permisos `catalogs.read` y `catalogs.manage` mientras
  se consolida la matriz final de permisos.
- La gestion de canjes usa `redemptions.read` y `redemptions.manage`; los puntos y stock se
  liberan desde backend por transaccion.
- La gestion de banners usa `marketing.read` y `marketing.manage`; los cambios quedan auditados.
- La gestion de notificaciones usa `notifications.read` y `notifications.manage`; los cambios
  quedan auditados.
- Las PWAs de tienda siguen usando tienda activa; el resumen administrativo usa endpoint
  separado para evitar mezclar reglas operativas de tienda con reporteria global.

## Pendiente

- Edicion controlada de roles/permisos.
- Exportacion de reportes.
- Filtros avanzados de auditoria por fecha, entidad y usuario.
- Edicion avanzada de premios, imagenes y storage externo.
- Redisenar experiencia final de canjes junto con permisos y usuarios.
- Edicion avanzada de banners publicitarios.
