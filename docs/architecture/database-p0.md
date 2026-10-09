# Modelo de Datos P0

## Entidades iniciales

- `InternalUser`: usuarios internos para Admin y Tienda.
- `Role`, `Permission`, `InternalUserRole`, `RolePermission`: RBAC.
- `Store`, `UserStore`: tiendas y asignaciones.
- `Customer`: clientes finales.
- `Catalog`, `CatalogItem`: catalogos operativos.
- `PointRule`: regla activa de puntos.
- `Purchase`: compra manual registrada desde tienda.
- `PointMovement`: libro mayor de puntos.
- `PromotionalBalanceMovement`: libro mayor de saldo promocional.
- `Reward`: catalogo de premios.
- `Redemption`: solicitud y validacion de canjes.
- `Setting`: parametros globales.
- `AuditLog`: trazabilidad de acciones sensibles.

## Factura

El campo operativo sera `invoiceNumber`, equivalente al campo `No.` de la factura fisica.
El valor se valida como numerico y se controla con indice unico:

```txt
storeId + invoiceNumber
```

## Puntos

`PointMovement` es la fuente historica. Cualquier balance visible debe calcularse desde
movimientos o mantenerse como cache transaccional, pero nunca como saldo editable manualmente.

## Saldo Promocional P1

`PromotionalBalanceMovement` es la fuente historica del saldo promocional. El saldo visible
se calcula sumando movimientos `AVAILABLE`; no se guarda como campo editable en `Customer`.

La conversion de puntos a saldo crea un movimiento `POINT_CONVERTED_TO_BALANCE` en puntos y
un movimiento `POINT_CONVERSION` en saldo promocional dentro de la misma transaccion.

El uso de saldo en tienda crea un movimiento `PURCHASE_USE` negativo. La tienda se toma de la
sesion interna activa y queda registrada en auditoria, no en un campo manual enviado por UI.

## Canjes P1

`Redemption` registra la solicitud del cliente, su vencimiento esperado y su validacion
operativa en tienda. El codigo visible usa formato corto `CNJ-######`.

Al solicitar un canje, el backend crea un movimiento de puntos negativo
`REDEMPTION_RESERVED` en la misma transaccion y descuenta stock del premio si aplica. Al validar
en tienda, el canje pasa a `VALIDATED` y el movimiento cambia a `REDEMPTION_USED`, conservando el
impacto negativo en el saldo disponible.

Si el canje pendiente se cancela o vence, se crea un movimiento positivo `REDEMPTION_RELEASED`
que compensa la reserva negativa. Si el premio tenia stock limitado, el stock se repone dentro
de la misma transaccion.
