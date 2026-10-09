# Notificaciones Internas P1

## Alcance implementado

El sistema ya tiene un centro de notificaciones internas para clientes y usuarios internos.
No usa push PWA todavia; push queda preparado para P2.

## Modelo

`Notification`

- `title`: titulo visible.
- `body`: mensaje corto.
- `type`: `INFO`, `SUCCESS`, `WARNING`, `PROMOTION` o `SYSTEM`.
- `channel`: actualmente `INTERNAL`.
- `audience`: publico objetivo.
- `customerId`, `internalUserId`, `roleId`: destinatario especifico cuando aplica.
- `startsAt`, `expiresAt`: vigencia.
- `isActive`: control administrativo.
- `createdByInternalUserId`: usuario que creo la notificacion.

`NotificationRecipient`

- Guarda estado de lectura por cliente o usuario interno.
- Permite marcar como leida una notificacion global sin duplicarla para todos.

## Audiencias

- `GLOBAL_CUSTOMERS`: todos los clientes.
- `GLOBAL_INTERNAL`: todos los usuarios internos.
- `CUSTOMER`: cliente especifico.
- `INTERNAL_USER`: usuario interno especifico.
- `ROLE`: usuarios internos con rol especifico.

## Endpoints

- `GET /api/notifications`: listado administrativo.
- `POST /api/notifications`: crear notificacion.
- `PATCH /api/notifications/:id`: activar/desactivar o editar datos basicos.
- `GET /api/notifications/internal`: notificaciones del usuario interno autenticado.
- `GET /api/notifications/customer`: notificaciones del cliente autenticado.
- `POST /api/notifications/:id/internal/read`: marcar leida como usuario interno.
- `POST /api/notifications/:id/customer/read`: marcar leida como cliente.

## Seguridad

- Crear y editar requiere `notifications.manage`.
- Listado administrativo e interno requiere `notifications.read`.
- Cliente solo usa token de cliente y no envia `customerId`.
- Usuario interno solo ve mensajes globales internos, directos o de sus roles.
- Cliente solo ve mensajes globales de clientes o directos a su `customerId`.
- Creacion y actualizacion quedan auditadas.

## Frontend

- Web Administrador: vista para crear, listar y activar/desactivar notificaciones.
- PWA Cliente: contador real y lista corta de notificaciones.
- PWA Tienda: contador real y lista corta de notificaciones internas.

## Fuera de alcance P1

- Push PWA.
- Programacion avanzada por segmento.
- Plantillas reutilizables.
- Adjuntos o imagenes en notificaciones.
