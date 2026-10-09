# Plan de Desarrollo MVP

## Principio del MVP

El MVP se construye alrededor del registro manual seguro de compras y acumulacion de
puntos. No hay integracion inicial con caja, por lo que el backend debe controlar tienda,
permisos, cliente, factura, monto, puntos y auditoria.

## Orden de fases

1. Proyecto base y modelo de datos. Estado: completado.
2. Autenticacion, usuarios internos, roles y permisos. Estado: base P0 completada.
3. Tiendas, asignacion de usuarios y tienda activa. Estado: base P0 completada.
4. Clientes, registro rapido y validacion de duplicados. Estado: base P0 completada.
5. Configuracion de puntos y catalogos base. Estado: base P0 completada.
6. Registro seguro de compras desde PWA Tienda. Estado: backend P0 completado.
7. Motor de puntos basico e historial. Estado: backend P0 completado.
8. PWA Cliente MVP. Estado: autenticacion y resumen P0 completados.
9. Web Administrador MVP. Estado: login y dashboard P0 completados.
10. Auditoria y reportes basicos.

## Reglas no negociables

- La compra no tendra campo manual de tienda.
- La compra no tendra campo de observaciones.
- El No. de factura sera obligatorio y numerico.
- La duplicidad inicial se valida por `storeId + invoiceNumber`.
- La tienda activa se obtiene desde la sesion del usuario interno.
- Los puntos se calculan siempre en backend.
- Los puntos se guardan como movimientos historicos.
- Las compras no se eliminan fisicamente en operacion normal.
- Toda accion sensible debe validar permisos en backend.
- Toda accion sensible debe generar auditoria.

## Modulos pospuestos

Saldo promocional, premios, canjes, promociones, NFC, push PWA, segmentacion avanzada y
antifraude avanzado se implementaran despues de que compras y puntos esten estables.
