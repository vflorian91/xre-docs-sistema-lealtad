# Canjes Basicos P1

## Alcance implementado

El cliente puede solicitar un canje desde PWA Cliente y la tienda puede validarlo desde PWA
Tienda usando un codigo corto `CNJ-######`.

## Flujo

1. Cliente selecciona premio activo.
2. Backend valida cliente activo, puntos disponibles y stock.
3. Backend crea `Redemption` con estado `REQUESTED`.
4. Backend crea movimiento de puntos negativo `REDEMPTION_RESERVED`.
5. Backend descuenta stock si el premio tiene stock limitado.
6. Cliente entrega el codigo `CNJ-######` en tienda.
7. Tienda valida el codigo desde su sesion con tienda activa.
8. Backend cambia el canje a `VALIDATED` y el movimiento a `REDEMPTION_USED`.

## Cancelacion y vencimiento

- Cliente puede cancelar sus propios canjes pendientes.
- Usuario interno con permiso puede cancelar canjes pendientes.
- Usuario interno con permiso puede ejecutar vencimiento por lote.
- Cancelacion y vencimiento crean movimiento positivo `REDEMPTION_RELEASED`.
- Si el premio tenia stock limitado, el stock se repone en la misma transaccion.
- Canjes validados no se pueden cancelar ni vencer por estos endpoints.

## Endpoints

- `GET /api/redemptions/customer`: canjes del cliente autenticado.
- `POST /api/redemptions/customer/request`: solicitud de canje del cliente.
- `POST /api/redemptions/customer/:id/cancel`: cancelacion del cliente.
- `GET /api/redemptions`: consulta interna protegida.
- `POST /api/redemptions/validate`: validacion operativa desde tienda.
- `POST /api/redemptions/:id/cancel`: cancelacion interna protegida.
- `POST /api/redemptions/expire`: vencimiento por lote protegido.

## Seguridad

- Cliente no envia `customerId`; se toma del token.
- Tienda no envia `storeId`; se toma de la tienda activa de sesion.
- Backend valida permisos `redemptions.read` y `redemptions.validate`.
- Backend bloquea cliente inactivo, premio inactivo, puntos insuficientes y stock agotado.
- Backend bloquea doble validacion de un mismo codigo.
- Solicitud, validacion, cancelacion y vencimiento quedan auditados.

## Pendiente

- Pantalla administrativa avanzada de canjes.
- Control operativo de entrega fisica con firma/foto opcional.
- Reglas de aprobacion para premios de alto valor.
- Automatizar vencimiento con job programado.
