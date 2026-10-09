# PWA Tienda P0/P1

## Alcance implementado

La PWA Tienda permite operar con usuario interno autenticado y tienda activa tomada desde la
sesion. La tienda no se captura manualmente en formularios operativos.

## Funciones

- Seleccion automatica de tienda cuando el usuario solo tiene una tienda activa.
- Registro manual de compras sin campo tienda y sin observaciones.
- Busqueda y creacion rapida de clientes.
- Calculo de puntos desde backend.
- Consulta y uso de saldo promocional.
- Validacion basica de canjes por codigo `CNJ-######`.
- Cancelacion operativa de canjes pendientes.
- Consulta de notificaciones internas y marcado como leidas.

## Endpoints principales

- `GET /api/stores/my`
- `POST /api/stores/active`
- `GET /api/catalogs`
- `GET /api/customers`
- `POST /api/customers/quick`
- `POST /api/purchases/preview`
- `POST /api/purchases`
- `GET /api/purchases?scope=ACTIVE_STORE`
- `GET /api/promotional-balance/customers/:customerId`
- `POST /api/promotional-balance/use`
- `GET /api/redemptions`
- `POST /api/redemptions/validate`
- `POST /api/redemptions/:id/cancel`
- `GET /api/notifications/internal`
- `POST /api/notifications/:id/internal/read`

## Seguridad

- La tienda activa se valida en backend.
- El usuario solo opera tiendas asignadas.
- El registro de compra no acepta `storeId` desde frontend.
- El uso de saldo no acepta `storeId` desde frontend.
- La validacion de canjes no acepta `storeId` desde frontend.
- La cancelacion de canjes valida permisos en backend y libera puntos/stock por transaccion.
- Las notificaciones internas se filtran por usuario, rol o audiencia global interna.
- Los permisos se validan en backend.
