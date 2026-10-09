# Saldo Promocional P1

## Alcance implementado

El sistema ya soporta saldo promocional como movimientos auditables. El saldo visible del
cliente se calcula desde backend sumando movimientos disponibles.

## Endpoints

- `GET /api/promotional-balance/customers/:customerId`
- `POST /api/promotional-balance/credits`
- `POST /api/promotional-balance/convert-points`
- `POST /api/promotional-balance/use`
- `GET /api/client/summary`

## Seguridad

- La consulta administrativa requiere `points.read`.
- La acreditacion administrativa requiere `points.manage`.
- El cliente solo ve su propio saldo desde el token de cliente.
- Toda acreditacion queda auditada como `promotional_balance.credit`.
- Toda conversion queda auditada como `promotional_balance.convert_points`.
- Todo uso de saldo en tienda queda auditado como `promotional_balance.use`.

## Conversion de puntos a saldo

La conversion inicial usa una regla backend fija:

```txt
100 puntos = Q1.00
```

La operacion se ejecuta en una sola transaccion:

- Valida cliente activo.
- Valida puntos disponibles.
- Crea movimiento negativo `POINT_CONVERTED_TO_BALANCE`.
- Crea movimiento de saldo `POINT_CONVERSION`.
- Actualiza el saldo visible del cliente por suma de movimientos.

## Uso de saldo en tienda

La tienda puede aplicar saldo promocional usando la tienda activa de la sesion interna.

- No se recibe `storeId` desde frontend.
- Valida usuario autenticado con `purchases.create`.
- Valida tienda activa asignada al usuario.
- Valida cliente activo.
- Valida saldo disponible suficiente.
- Crea movimiento `PURCHASE_USE` con monto negativo.
- El saldo del cliente se recalcula desde movimientos disponibles.

## Pendiente

- Reversas de uso de saldo.
- Expiracion automatica de saldo promocional.
