# Registro de Compras y Puntos P0

## Alcance implementado

El backend permite registrar compras manuales desde PWA Tienda usando siempre la tienda activa
de la sesion del usuario interno. El contrato de API no acepta `storeId` ni observaciones.

## Endpoints

- `POST /api/purchases/preview`: calcula una vista previa de puntos antes de confirmar.
- `POST /api/purchases`: registra la compra y genera movimiento de puntos si corresponde.
- `GET /api/purchases`: consulta compras de la tienda activa o de tiendas asignadas.
- `POST /api/purchases/:id/reverse`: reversa una compra aprobada.

## Datos permitidos al registrar

- `customerId`
- `invoiceNumber`
- `amount`
- `shoeTypeId`
- `categoryId`
- `brandId` opcional

## Validaciones de seguridad

- Usuario autenticado con permiso `purchases.create`.
- Sesion con tienda activa.
- Tienda activa asignada al usuario autenticado.
- Tienda activa en estado `ACTIVE`.
- Cliente existente y en estado `ACTIVE`.
- No. de factura numerico, entre 6 y 15 digitos.
- Factura unica por tienda: `storeId + invoiceNumber`.
- Catalogos activos para tipo, categoria y marca opcional.
- Regla de puntos activa.

## Calculo de puntos

El backend aplica la regla activa de puntos:

- Si el monto es menor al minimo de la regla, la compra queda con `0` puntos.
- El redondeo inicial soporta `FLOOR` y `CEIL`.
- Si existe maximo por compra, el resultado se limita a ese valor.
- Cuando el resultado es mayor a `0`, se crea un `PointMovement` tipo `PURCHASE_EARNED`.

## Auditoria

Se audita:

- Compra registrada.
- Intento de registrar factura duplicada.
- Compra reversada.

## Reversas P1

La reversa de compras ya esta implementada desde backend y requiere `purchases.reverse`.

- Solo se pueden reversar compras en estado `APPROVED`.
- El usuario interno debe tener la tienda de la compra asignada.
- La compra cambia a estado `REVERSED`.
- Los movimientos `PURCHASE_EARNED` disponibles de esa compra pasan a `REVERSED`.
- Se crea un movimiento `PURCHASE_REVERSED` con puntos negativos para trazabilidad.
- La operacion queda auditada con razon, factura, monto y puntos reversados.

## Decisiones P0

- No se integran promociones todavia.
- No se permite editar puntos desde PWA Tienda.
- El numero usado para factura es el campo `No.` numerico visible en la factura fisica.
