# Parametros Operativos P1

## Alcance

Este bloque usa la tabla `Setting` como fuente editable de parametros operativos sensibles. Los valores se leen desde backend y no dependen del frontend.

## Parametros incluidos

- `POINTS_TO_BALANCE_CONVERSION`: define cuantos puntos equivalen a saldo promocional, el minimo de puntos y si la conversion esta habilitada.
- `REDEMPTIONS`: define los dias de vencimiento para solicitudes de canje.
- `PROMOTIONAL_BALANCE`: define el limite maximo de saldo promocional que puede usarse por compra, o sin limite cuando es `null`.

## Endpoints

- `GET /api/settings`: lista parametros operativos.
- `GET /api/settings/:key`: consulta un parametro soportado.
- `PATCH /api/settings/:key`: actualiza un parametro soportado.

Todos requieren autenticacion interna. La lectura usa `settings.read` y la escritura usa `settings.manage`.

## Seguridad

- El backend valida tipos, rangos y llaves permitidas.
- Toda actualizacion queda en auditoria con accion `settings.update`.
- La conversion de puntos a saldo y el vencimiento de canjes leen los parametros desde backend.
- El frontend solo edita parametros permitidos; no decide reglas economicas por su cuenta.

## Fuera de alcance de este bloque

- Parametros por tienda.
- Historial versionado completo de configuracion.
- Flujos de aprobacion para cambios de alto impacto.
