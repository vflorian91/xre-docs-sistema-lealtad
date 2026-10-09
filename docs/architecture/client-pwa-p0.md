# PWA Cliente P0

## Alcance implementado

La PWA Cliente permite acceso de cliente y consulta de informacion propia desde backend.
El frontend no envia `customerId` para consultar puntos, compras o movimientos; el backend lo
toma del token de cliente.

## Endpoints

- `POST /api/auth/customer/login`: acceso de cliente con codigo y telefono registrado.
- `POST /api/auth/customer/refresh`: renovacion de sesion de cliente.
- `GET /api/auth/customer/me`: perfil del cliente autenticado.
- `POST /api/auth/customer/logout`: cierre de sesion.
- `GET /api/client/summary`: puntos disponibles, nivel, compras recientes y movimientos.
- `GET /api/client/purchases`: compras del cliente autenticado.
- `GET /api/client/points`: movimientos de puntos del cliente autenticado.
- `GET /api/rewards/public`: premios activos visibles para clientes.
- `GET /api/marketing-banners/public`: banners activos y vigentes para cliente.
- `GET /api/redemptions/customer`: canjes del cliente autenticado.
- `POST /api/redemptions/customer/request`: solicitud de canje.
- `POST /api/redemptions/customer/:id/cancel`: cancelacion de canje pendiente propio.
- `POST /api/media/customer/profile-photo`: subida de foto de perfil propia.
- `GET /api/notifications/customer`: notificaciones propias y globales de clientes.
- `POST /api/notifications/:id/customer/read`: marcar notificacion propia como leida.

## Validaciones P0

- Cliente debe existir.
- Cliente debe estar `ACTIVE`.
- Codigo y telefono deben coincidir.
- Las consultas protegidas usan `CustomerJwtAuthGuard`.
- El cliente solo puede ver datos asociados al `customerId` del token.

## Decisiones P0

- El acceso inicial usa codigo de cliente y telefono registrado.
- El modelo ya conserva `pinHash` para evolucionar a PIN o activacion mas robusta.
- Saldo promocional ya se lee desde backend como balance real P1.
- Premios destacados ya se leen desde catalogo real P1.
- Canjes basicos ya se solicitan desde backend P1.
- Canjes pendientes propios ya se pueden cancelar desde backend P1.
- Foto de perfil ya se sube al modulo de media P1.
- Banners publicitarios ya se leen desde backend P1.
- Notificaciones internas de cliente ya se leen y marcan como leidas desde backend P1.
- Cupones quedan para P1/P2.
