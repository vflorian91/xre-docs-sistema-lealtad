# FRD 08 — Liquidación de Motoristas

## 1. Información general del requerimiento

### Nombre del módulo

Liquidación de Motoristas

### Plataforma

Web Administrador

### Tipo de módulo

Módulo administrativo financiero-operativo para controlar, revisar, aprobar y marcar como liquidados los pagos pendientes a motoristas por entregas realizadas.

### Objetivo general

Permitir que la empresa controle cuánto debe pagar a cada motorista por las entregas asignadas, entregadas, no entregadas o retenidas, tomando como base el monto definido manualmente por el administrador al momento de asignar el pedido.

Este módulo debe permitir consultar pagos pendientes, pagos retenidos, pagos liquidados, entregas completadas, entregas con incidencia y generar trazabilidad sobre quién liquidó, cuándo liquidó y qué pedidos fueron incluidos en cada liquidación.

---

## 2. Contexto funcional

Dentro del módulo de tienda, los clientes solicitan pedidos y pagan únicamente en efectivo contra entrega. La empresa programa la visita, asigna un motorista y define cuánto se le pagará al motorista por realizar la entrega.

El motorista confirma desde su PWA si el pedido fue entregado y cobrado en efectivo o si no se pudo entregar. Según el resultado, el pago al motorista puede quedar:

* Pendiente de liquidar.
* Retenido por incidencia.
* No aplica.
* Liquidado.

La liquidación debe ser controlada únicamente desde la plataforma administrativa.

---

## 3. Alcance del FRD

Este FRD contempla:

* Tabla de liquidaciones.
* Tabla de pagos pendientes por motorista.
* Agrupación por motorista.
* Agrupación por fecha.
* Visualización de entregas liquidadas.
* Visualización de entregas pendientes de liquidar.
* Visualización de entregas retenidas.
* Visualización de entregas no aplicables.
* Creación de liquidación.
* Selección de pedidos a liquidar.
* Confirmación de liquidación mediante modal.
* Cambio de estado de pago al motorista.
* Registro de fecha de liquidación.
* Registro del usuario que liquida.
* Historial de liquidaciones.
* Detalle de liquidación.
* Exportación de liquidaciones.
* Validaciones.
* Modelo de datos sugerido.
* Endpoints sugeridos.
* Servicios sugeridos.
* Criterios de aceptación.

---

## 4. Fuera de alcance

Este FRD no contempla:

* Pago automático bancario al motorista.
* Integración con nómina.
* Transferencias bancarias.
* Pago con billeteras digitales.
* Cálculo automático por distancia.
* Cálculo automático por kilometraje.
* Geolocalización.
* Facturación contable.
* Retenciones fiscales automáticas.
* Conciliación bancaria.
* Liquidación directa desde PWA Motorista.

---

## 5. Concepto funcional

La liquidación de motoristas representa el proceso mediante el cual la empresa revisa las entregas realizadas por un motorista y confirma que debe pagársele el monto previamente definido por pedido.

Cada pedido asignado a motorista debe tener un monto de pago al motorista.

Ejemplo:

```txt
Pedido: PED-2026-000015
Motorista: Carlos Ramírez
Total cobrado al cliente: Q399.00
Pago al motorista: Q25.00
Estado entrega: Entregada
Estado pago motorista: Pendiente de liquidar
```

Cuando el admin liquida ese pedido, el estado cambia a:

```txt
Estado pago motorista: Liquidado
Fecha liquidación: 28/06/2026
Liquidado por: Admin
```

---

## 6. Ubicación en menú

El módulo debe ubicarse dentro de:

```txt
Tienda
  ├── Productos
  ├── Marcas
  ├── Pedidos
  ├── Agenda de entregas
  ├── Motoristas
  ├── Liquidaciones
  └── Reportes
```

### Ruta principal sugerida

```txt
/admin/tienda/liquidaciones
```

---

## 7. Rutas sugeridas

```txt
/admin/tienda/liquidaciones
/admin/tienda/liquidaciones/nueva
/admin/tienda/liquidaciones/[liquidacionId]
/admin/tienda/liquidaciones/motorista/[motoristaId]
/admin/tienda/liquidaciones/pendientes
/ admin/tienda/liquidaciones/retenidas
```

Corregir la ruta con espacio en implementación:

```txt
/admin/tienda/liquidaciones/retenidas
```

---

## 8. Permisos del módulo

El módulo debe respetar la lógica de roles y permisos.

### Permisos sugeridos

* Ver liquidaciones.
* Ver pagos pendientes.
* Ver pagos retenidos.
* Ver detalle de liquidación.
* Crear liquidación.
* Marcar pago como liquidado.
* Retener pago.
* Liberar pago retenido.
* Anular liquidación, si se permite.
* Exportar liquidaciones.
* Ver montos de pago al motorista.

### Reglas

1. Un usuario sin permiso de ver liquidaciones no debe acceder al módulo.
2. Un usuario sin permiso de ver montos no debe ver pagos al motorista.
3. Un usuario sin permiso de crear liquidación no debe poder liquidar pagos.
4. Un usuario sin permiso de liberar retenidos no debe cambiar pagos retenidos.
5. Toda acción debe validarse en frontend y backend.
6. Toda liquidación debe guardar usuario, fecha y hora.
7. No debe existir liquidación desde PWA Motorista.

---

# SECCIÓN A — ESTADOS DE PAGO AL MOTORISTA

## 9. Estados requeridos

El sistema debe manejar los siguientes estados de pago al motorista:

```txt
NO_ASIGNADO
PENDIENTE_LIQUIDAR
LIQUIDADO
RETENIDO
NO_APLICA
ANULADO
```

---

## 10. Estado: No asignado

### Definición

El pedido aún no tiene motorista asignado.

### Aplica cuando

* El pedido fue solicitado por cliente.
* El pedido aún no tiene motorista.
* El admin no ha definido pago al motorista.

### Reglas

1. No aparece como pago pendiente.
2. No se puede liquidar.
3. Cambia cuando se asigna motorista.
4. No debe mostrarse en la pantalla principal de liquidación, salvo filtro específico.

---

## 11. Estado: Pendiente de liquidar

### Definición

El pedido tiene motorista asignado y monto definido, pero aún no se ha pagado al motorista.

### Aplica cuando

* Admin asigna motorista y define pago.
* Motorista entrega correctamente el pedido.
* Pedido está listo para liquidarse.

### Reglas

1. Debe aparecer en pagos pendientes.
2. Puede incluirse en una liquidación.
3. Debe tener monto definido.
4. Debe tener motorista asignado.
5. Debe tener pedido asociado.
6. No debe estar cancelado.
7. No debe estar anulado.

---

## 12. Estado: Liquidado

### Definición

El pago al motorista ya fue marcado como pagado por admin.

### Aplica cuando

* Admin confirma liquidación.
* El pedido fue incluido en una liquidación.
* El sistema registró fecha y usuario liquidador.

### Reglas

1. No debe volver a aparecer como pendiente.
2. Debe aparecer en historial de liquidaciones.
3. Debe conservar monto liquidado.
4. Debe conservar fecha de liquidación.
5. Debe conservar usuario que liquidó.
6. No debe poder liquidarse nuevamente.
7. Solo puede revertirse si se permite anulación con permiso especial.

---

## 13. Estado: Retenido

### Definición

El pago al motorista queda retenido por una incidencia o porque el admin debe revisar el caso antes de pagar.

### Aplica cuando

* Pedido fue marcado como no entregado.
* Hubo diferencia de efectivo.
* Hubo reclamo del cliente.
* Hubo problema operativo.
* Admin decide retener temporalmente el pago.

### Reglas

1. Debe aparecer en sección de pagos retenidos.
2. No debe poder liquidarse hasta ser liberado.
3. Debe exigir motivo de retención.
4. Debe permitir comentario interno.
5. Debe guardar usuario que retuvo.
6. Debe permitir liberar posteriormente.
7. Debe permitir marcar como no aplica si no corresponde pagar.

---

## 14. Estado: No aplica

### Definición

No corresponde pagar al motorista por ese pedido.

### Aplica cuando

* Pedido fue cancelado antes de ruta.
* Pedido nunca fue entregado.
* Motorista no realizó la entrega.
* Admin determina que no corresponde pago.
* Pedido fue reasignado antes de iniciar.

### Reglas

1. No debe aparecer como pendiente.
2. No debe incluirse en liquidaciones.
3. Debe guardar motivo.
4. Debe conservar historial.
5. Puede originarse desde cancelación o revisión de retenidos.

---

## 15. Estado: Anulado

### Definición

Una liquidación o pago previamente registrado fue anulado por corrección administrativa.

### Reglas

1. Debe requerir permiso especial.
2. Debe exigir motivo.
3. Debe guardar usuario que anuló.
4. Debe conservar historial.
5. No debe eliminar registros previos.
6. Debe usarse solo en casos excepcionales.

---

# SECCIÓN B — PANTALLA PRINCIPAL

## 16. Pantalla: Liquidaciones

### Ruta

```txt
/admin/tienda/liquidaciones
```

### Objetivo

Permitir al administrador visualizar el estado general de pagos a motoristas y acceder a pagos pendientes, retenidos, liquidados e históricos.

### Estructura sugerida

La pantalla debe contener:

1. Encabezado.
2. Cards de resumen.
3. Filtros.
4. Tabla agrupada por motorista.
5. Acciones.
6. Acceso a historial de liquidaciones.

---

## 17. Encabezado

### Título

```txt
Liquidaciones de motoristas
```

### Subtítulo sugerido

```txt
Controla los pagos pendientes, retenidos y liquidados de las entregas asignadas a motoristas.
```

### Botones superiores

* Nueva liquidación.
* Exportar.
* Ver retenidos.
* Ver historial.

---

## 18. Cards de resumen

La pantalla debe mostrar cards compactas.

### Cards sugeridas

1. **Pendiente de liquidar**
2. **Motoristas con saldo pendiente**
3. **Pagos retenidos**
4. **Liquidado hoy**
5. **Liquidado este mes**
6. **Entregas liquidadas**
7. **Entregas no entregadas**
8. **No aplica**

### Reglas

1. Las cards deben ser compactas.
2. Los títulos deben ir en negrita.
3. Los montos deben mostrarse en quetzales.
4. Pueden funcionar como filtros rápidos.
5. No deben saturar visualmente la pantalla.
6. Si hay muchas cards, usar scroll horizontal.

---

## 19. Filtros principales

### Filtros requeridos

* Motorista.
* Estado de pago al motorista.
* Fecha de entrega.
* Fecha de liquidación.
* Estado de entrega.
* Número de pedido.
* Marca.
* Zona.
* Tipo de motorista.
* Pedidos retenidos.
* Pedidos pendientes.

### Búsqueda general

Debe buscar por:

* Número de pedido.
* Nombre del motorista.
* Teléfono del motorista.
* Nombre del cliente.
* Marca.
* Zona.
* Estado.

### Reglas

1. Los filtros deben ser compactos.
2. Deben poder combinarse.
3. Debe existir botón para limpiar filtros.
4. La búsqueda debe funcionar por coincidencia parcial.
5. La tabla debe actualizarse sin recargar toda la pantalla.
6. Debe tener paginación.

---

# SECCIÓN C — TABLA AGRUPADA POR MOTORISTA

## 20. Tabla principal por motorista

### Objetivo

Mostrar cuánto se debe pagar a cada motorista.

### Columnas sugeridas

* Motorista.
* Tipo.
* Entregas pendientes.
* Entregas retenidas.
* Total pendiente.
* Total retenido.
* Última entrega.
* Última liquidación.
* Estado.
* Acciones.

### Acciones

* Ver detalle.
* Crear liquidación.
* Ver retenidos.
* Ver historial.
* Exportar.

---

## 21. Reglas de la tabla por motorista

1. Solo deben mostrarse motoristas con actividad o saldo.
2. Debe permitir filtrar motoristas sin saldo.
3. El total pendiente debe sumar solo pagos pendientes de liquidar.
4. El total retenido debe sumar pagos retenidos.
5. No debe sumar pagos no aplica.
6. No debe sumar pagos ya liquidados.
7. Los montos deben mostrarse en GTQ.
8. La tabla debe tener paginación.
9. Los usuarios sin permiso de ver montos no deben ver valores monetarios.

---

## 22. Ejemplo visual de fila

```txt
Carlos Ramírez | Interno | 5 entregas pendientes | 1 retenida | Q125.00 pendiente | Q25.00 retenido | [Ver] [Liquidar]
```

---

# SECCIÓN D — DETALLE POR MOTORISTA

## 23. Pantalla: Detalle de liquidación por motorista

### Ruta

```txt
/admin/tienda/liquidaciones/motorista/[motoristaId]
```

### Objetivo

Mostrar los pedidos relacionados con un motorista y permitir seleccionar cuáles se liquidarán.

### Secciones sugeridas

1. Encabezado del motorista.
2. Resumen financiero.
3. Pedidos pendientes de liquidar.
4. Pedidos retenidos.
5. Pedidos liquidados.
6. Historial de liquidaciones.
7. Acciones.

---

## 24. Encabezado del motorista

Debe mostrar:

* Nombre.
* Teléfono.
* Tipo.
* Estado.
* Total pendiente.
* Total retenido.
* Total liquidado en el período seleccionado.
* Botón **Nueva liquidación**.
* Botón **Volver**.

---

## 25. Resumen financiero

Cards sugeridas:

* Entregas pendientes.
* Monto pendiente.
* Entregas retenidas.
* Monto retenido.
* Entregas liquidadas.
* Monto liquidado.

### Reglas

1. Deben respetar filtros de fecha.
2. Deben mostrarse en quetzales.
3. Deben ocultarse si el usuario no tiene permiso de ver montos.
4. Deben ser compactas.

---

## 26. Tabla de pedidos pendientes

Debe mostrar:

* Checkbox de selección.
* Número de pedido.
* Fecha de entrega.
* Cliente.
* Zona.
* Total cobrado al cliente.
* Pago al motorista.
* Estado de entrega.
* Estado de pago motorista.
* Acciones.

### Acciones por pedido

* Ver pedido.
* Retener pago.
* Marcar no aplica.
* Ver historial.

---

## 27. Reglas de selección

1. Solo se pueden seleccionar pedidos con estado **Pendiente de liquidar**.
2. No se pueden seleccionar pedidos retenidos.
3. No se pueden seleccionar pedidos no aplica.
4. No se pueden seleccionar pedidos ya liquidados.
5. Debe existir selección individual.
6. Puede existir botón **Seleccionar todos los pendientes visibles**.
7. El total seleccionado debe calcularse automáticamente.
8. Si se cambia filtro, debe mantenerse o limpiarse selección según decisión de diseño.
9. Antes de liquidar debe mostrarse resumen.

---

## 28. Tabla de pedidos retenidos

Debe mostrar:

* Número de pedido.
* Fecha de entrega.
* Cliente.
* Motivo de retención.
* Pago al motorista.
* Usuario que retuvo.
* Fecha de retención.
* Acciones.

### Acciones

* Ver pedido.
* Liberar para liquidación.
* Marcar no aplica.
* Ver historial.

### Reglas

1. Los retenidos no se pueden liquidar directamente.
2. Primero deben liberarse.
3. Liberar cambia estado a **Pendiente de liquidar**.
4. Marcar no aplica requiere motivo.
5. Toda acción debe registrar historial.

---

## 29. Tabla de pedidos liquidados

Debe mostrar:

* Número de pedido.
* Fecha de entrega.
* Pago liquidado.
* Fecha de liquidación.
* Liquidado por.
* ID de liquidación.
* Acciones.

### Acciones

* Ver liquidación.
* Ver pedido.
* Exportar comprobante, si aplica.

---

# SECCIÓN E — CREAR LIQUIDACIÓN

## 30. Pantalla o modal: Nueva liquidación

### Ruta sugerida

```txt
/admin/tienda/liquidaciones/nueva
```

También puede implementarse como modal desde el detalle del motorista.

### Objetivo

Permitir crear una liquidación seleccionando pedidos pendientes de un motorista.

### Flujo recomendado

1. Admin selecciona motorista.
2. Sistema muestra pedidos pendientes de liquidar.
3. Admin selecciona pedidos a incluir.
4. Sistema calcula total a pagar.
5. Admin revisa resumen.
6. Admin confirma liquidación.
7. Sistema actualiza estados.
8. Sistema crea registro de liquidación.
9. Sistema genera historial.

---

## 31. Campos de nueva liquidación

### Campos requeridos

* Motorista.
* Pedidos seleccionados.
* Fecha de liquidación.
* Método interno de pago, opcional según operación.
* Comentario interno.

### Campos calculados

* Cantidad de pedidos seleccionados.
* Total a pagar al motorista.
* Total de pedidos entregados.
* Total de efectivo cobrado al cliente, informativo.

### Campos opcionales

* Referencia interna.
* Número de comprobante.
* Observación.
* Archivo adjunto de comprobante, fase futura.

---

## 32. Método interno de pago al motorista

Aunque no se integrará pago automático, puede registrarse cómo se pagó.

### Valores sugeridos

```txt
Efectivo
Transferencia
Pago interno
Otro
```

### Reglas

1. Es informativo.
2. No genera transacción bancaria.
3. Puede ser obligatorio si la empresa lo requiere.
4. Si se selecciona **Otro**, pedir comentario.
5. No debe confundirse con el método de pago del cliente.

---

## 33. Resumen previo a liquidar

Antes de confirmar, debe aparecer un modal.

### Información a mostrar

* Motorista.
* Cantidad de pedidos.
* Total a pagar.
* Fecha de liquidación.
* Lista resumida de pedidos.
* Comentario.
* Advertencia de confirmación.

### Texto sugerido

```txt
Confirmar liquidación

Se marcarán como liquidados los pedidos seleccionados y se registrará el pago al motorista.

Esta acción quedará registrada en el historial.
```

### Botones

```txt
Cancelar
Confirmar liquidación
```

---

## 34. Reglas para crear liquidación

1. Debe existir motorista.
2. El motorista debe tener pedidos pendientes.
3. Debe seleccionarse al menos un pedido.
4. Todos los pedidos deben pertenecer al mismo motorista.
5. Todos los pedidos deben estar en estado **Pendiente de liquidar**.
6. No se deben incluir pedidos retenidos.
7. No se deben incluir pedidos no aplica.
8. No se deben incluir pedidos ya liquidados.
9. El total debe calcularse desde los pagos definidos por pedido.
10. No se debe permitir modificar el monto individual desde la liquidación, salvo permiso especial.
11. Debe registrar fecha de liquidación.
12. Debe registrar usuario que liquida.
13. Debe registrar comentario.
14. Debe crear número único de liquidación.
15. Debe actualizar estado de cada pedido a **Liquidado**.
16. Debe registrar historial por cada pedido.
17. Debe generar detalle de liquidación.
18. No debe eliminar registros anteriores.

---

## 35. Número de liquidación

El sistema debe generar un número único.

### Formato sugerido

```txt
LIQ-2026-000001
LIQ-2026-000002
```

### Reglas

1. Debe ser único.
2. Debe ser legible.
3. Debe mostrarse en detalle.
4. Debe mostrarse en historial.
5. Debe poder buscarse.

---

# SECCIÓN F — DETALLE DE LIQUIDACIÓN

## 36. Pantalla: Detalle de liquidación

### Ruta

```txt
/admin/tienda/liquidaciones/[liquidacionId]
```

### Objetivo

Mostrar toda la información de una liquidación ya generada.

### Información a mostrar

#### Encabezado

* Número de liquidación.
* Motorista.
* Fecha de liquidación.
* Estado de liquidación.
* Total liquidado.
* Usuario que liquidó.

#### Detalle

* Pedidos incluidos.
* Fecha de entrega de cada pedido.
* Pago al motorista por pedido.
* Total pedido cobrado al cliente.
* Estado de entrega.
* Estado de pago cliente.
* Comentario.

#### Auditoría

* Creado por.
* Fecha de creación.
* Última modificación, si aplica.
* Anulado por, si aplica.
* Motivo de anulación, si aplica.

---

## 37. Tabla de pedidos incluidos

Columnas:

* Número de pedido.
* Cliente.
* Fecha de entrega.
* Estado entrega.
* Total cobrado al cliente.
* Pago liquidado al motorista.
* Acciones.

Acciones:

* Ver pedido.
* Ver timeline.
* Ver detalle de entrega.

---

## 38. Estado de liquidación

Estados sugeridos:

```txt
ACTIVA
ANULADA
```

### Reglas

1. Una liquidación creada correctamente nace como activa.
2. Solo usuarios autorizados pueden anular.
3. Anular debe exigir motivo.
4. Anular no debe eliminar la liquidación.
5. Si se anula, debe definirse si los pedidos vuelven a pendiente o quedan en revisión.
6. La anulación debe ser excepcional.

---

# SECCIÓN G — RETENCIONES

## 39. Retener pago

### Objetivo

Permitir retener el pago al motorista por un pedido específico.

### Casos donde aplica

* Entrega no completada.
* Cliente reporta problema.
* Motorista reporta incidencia.
* Monto cobrado inconsistente.
* Producto entregado con problema.
* Admin requiere revisión.

---

## 40. Acción: Retener pago

### Disponible cuando

```txt
estado_pago_motorista = PENDIENTE_LIQUIDAR
```

### Campos requeridos

* Motivo de retención.
* Comentario interno.

### Motivos sugeridos

```txt
Entrega no completada
Cliente reportó problema
Diferencia en cobro
Producto con incidencia
Revisión administrativa
Motorista reportó problema
Otro
```

### Reglas

1. Debe exigir motivo.
2. Debe exigir comentario.
3. Cambia estado a **Retenido**.
4. Debe registrar usuario.
5. Debe registrar fecha.
6. Debe guardar historial.
7. No debe permitir liquidar mientras esté retenido.

---

## 41. Liberar pago retenido

### Objetivo

Permitir que un pago retenido vuelva a estar disponible para liquidación.

### Disponible cuando

```txt
estado_pago_motorista = RETENIDO
```

### Campos requeridos

* Comentario de liberación.

### Reglas

1. Debe requerir permiso.
2. Debe registrar usuario que libera.
3. Debe cambiar estado a **Pendiente de liquidar**.
4. Debe registrar historial.
5. Luego puede incluirse en una liquidación.

---

## 42. Marcar pago como no aplica

### Objetivo

Indicar que no corresponde pagar al motorista por ese pedido.

### Disponible cuando

```txt
estado_pago_motorista = PENDIENTE_LIQUIDAR
estado_pago_motorista = RETENIDO
```

### Campos requeridos

* Motivo.
* Comentario.

### Reglas

1. Debe exigir motivo.
2. Debe exigir comentario.
3. Cambia estado a **No aplica**.
4. No puede incluirse en liquidaciones.
5. Debe quedar en historial.
6. No debe eliminar el monto original; debe conservarlo para auditoría.

---

# SECCIÓN H — ANULACIÓN DE LIQUIDACIÓN

## 43. Acción: Anular liquidación

### Objetivo

Permitir corregir una liquidación registrada por error.

### Recomendación

Esta acción debe ser restringida y requerir permiso especial.

### Disponible cuando

```txt
estado_liquidacion = ACTIVA
```

### Campos requeridos

* Motivo de anulación.
* Comentario.

---

## 44. Reglas para anular liquidación

1. Debe requerir permiso especial.
2. Debe exigir motivo.
3. Debe exigir comentario.
4. No debe eliminar la liquidación.
5. Debe cambiar estado de liquidación a **Anulada**.
6. Debe registrar usuario que anuló.
7. Debe registrar fecha de anulación.
8. Debe registrar historial.
9. Debe definirse qué ocurre con los pedidos incluidos.

### Recomendación operativa

Al anular una liquidación, los pedidos incluidos deben volver a estado:

```txt
PENDIENTE_LIQUIDAR
```

si no existe otra restricción.

---

# SECCIÓN I — EXPORTACIONES

## 45. Exportación de liquidaciones

El módulo debe permitir exportar información para revisión interna.

### Exportaciones sugeridas

* Pagos pendientes por motorista.
* Pagos retenidos.
* Liquidaciones realizadas.
* Detalle de una liquidación.
* Historial por motorista.
* Entregas liquidadas por rango de fecha.

### Formatos sugeridos

```txt
XLSX
CSV
PDF, opcional
```

### Reglas

1. La exportación debe respetar filtros aplicados.
2. No debe exportar montos si el usuario no tiene permiso.
3. Debe incluir fecha y usuario que generó exportación.
4. Debe incluir totales.
5. Debe tener encabezados claros.

---

# SECCIÓN J — MODELO DE DATOS SUGERIDO

## 46. Tabla: store_driver_liquidations

```txt
id
liquidation_number
driver_id
liquidation_date
total_orders
total_amount
payment_method
reference_number
comment
status
created_by
created_at
annulled_by
annulled_at
annulment_reason
updated_at
```

---

## 47. Tabla: store_driver_liquidation_items

```txt
id
liquidation_id
order_id
driver_id
driver_payment_amount
order_total_amount
delivery_date
delivery_status
client_payment_status
created_at
updated_at
```

---

## 48. Tabla: store_driver_payment_history

```txt
id
order_id
driver_id
previous_payment_status
new_payment_status
amount
event_type
reason
comment
created_by
created_by_role
created_at
```

### event_type sugeridos

```txt
DRIVER_ASSIGNED
PAYMENT_PENDING
PAYMENT_RETAINED
PAYMENT_RELEASED
PAYMENT_NOT_APPLICABLE
PAYMENT_LIQUIDATED
LIQUIDATION_ANNULLED
```

---

## 49. Campos relacionados en store_orders

```txt
assigned_driver_id
driver_payment_amount
driver_payment_status
driver_payment_liquidated_at
driver_payment_liquidated_by
driver_liquidation_id
driver_payment_retained_reason
driver_payment_retained_at
driver_payment_retained_by
```

---

# SECCIÓN K — SERVICIOS SUGERIDOS

## 50. Servicios backend

```txt
StoreDriverLiquidationService
StoreDriverLiquidationQueryService
StoreDriverPaymentStatusService
StoreDriverPaymentRetentionService
StoreDriverLiquidationExportService
StoreDriverLiquidationValidationService
StoreDriverPaymentHistoryService
```

---

## 51. StoreDriverLiquidationService

Responsabilidades:

* Crear liquidación.
* Generar número de liquidación.
* Calcular total.
* Registrar detalle.
* Actualizar pedidos a liquidado.
* Registrar historial.
* Consultar detalle de liquidación.
* Anular liquidación.

---

## 52. StoreDriverLiquidationQueryService

Responsabilidades:

* Listar liquidaciones.
* Consultar pagos pendientes.
* Consultar pagos retenidos.
* Consultar pagos por motorista.
* Consultar resumen por fecha.
* Consultar historial.

---

## 53. StoreDriverPaymentStatusService

Responsabilidades:

* Cambiar estado de pago al motorista.
* Marcar como pendiente.
* Marcar como liquidado.
* Marcar como no aplica.
* Validar transiciones.

---

## 54. StoreDriverPaymentRetentionService

Responsabilidades:

* Retener pago.
* Liberar pago retenido.
* Registrar motivo.
* Validar permisos.
* Registrar historial.

---

## 55. StoreDriverLiquidationValidationService

Responsabilidades:

* Validar que los pedidos pertenezcan al motorista.
* Validar estado pendiente.
* Validar que no estén retenidos.
* Validar que no estén liquidados.
* Validar permisos.
* Validar montos.
* Evitar liquidación duplicada.

---

## 56. StoreDriverLiquidationExportService

Responsabilidades:

* Exportar pendientes.
* Exportar retenidos.
* Exportar liquidaciones.
* Exportar detalle.
* Respetar filtros.
* Respetar permisos.

---

# SECCIÓN L — ENDPOINTS SUGERIDOS

## 57. Listar resumen de liquidaciones

```txt
GET /api/admin/store/driver-liquidations/summary
```

---

## 58. Listar pagos pendientes

```txt
GET /api/admin/store/driver-liquidations/pending
```

### Query params sugeridos

```txt
driverId
dateFrom
dateTo
deliveryStatus
brandId
zoneId
search
page
limit
```

---

## 59. Listar pagos retenidos

```txt
GET /api/admin/store/driver-liquidations/retained
```

---

## 60. Listar liquidaciones realizadas

```txt
GET /api/admin/store/driver-liquidations
```

### Query params sugeridos

```txt
driverId
dateFrom
dateTo
status
search
page
limit
```

---

## 61. Crear liquidación

```txt
POST /api/admin/store/driver-liquidations
```

### Request sugerido

```json
{
  "driverId": "driver_123",
  "orderIds": ["order_1", "order_2", "order_3"],
  "liquidationDate": "2026-06-28",
  "paymentMethod": "EFECTIVO",
  "referenceNumber": "REC-001",
  "comment": "Liquidación de entregas del fin de semana."
}
```

### Respuesta sugerida

```json
{
  "success": true,
  "message": "Liquidación creada correctamente.",
  "liquidation": {
    "id": "liq_123",
    "liquidationNumber": "LIQ-2026-000001",
    "driverId": "driver_123",
    "totalOrders": 3,
    "totalAmount": 75.00,
    "status": "ACTIVA"
  }
}
```

---

## 62. Ver detalle de liquidación

```txt
GET /api/admin/store/driver-liquidations/:liquidationId
```

---

## 63. Retener pago de pedido

```txt
POST /api/admin/store/driver-payments/orders/:orderId/retain
```

### Request

```json
{
  "reason": "Cliente reportó problema",
  "comment": "Se revisará la entrega antes de pagar al motorista."
}
```

---

## 64. Liberar pago retenido

```txt
POST /api/admin/store/driver-payments/orders/:orderId/release
```

### Request

```json
{
  "comment": "Incidencia revisada, pago autorizado."
}
```

---

## 65. Marcar pago como no aplica

```txt
POST /api/admin/store/driver-payments/orders/:orderId/not-applicable
```

### Request

```json
{
  "reason": "Entrega no completada",
  "comment": "No corresponde pago porque el pedido no fue entregado."
}
```

---

## 66. Anular liquidación

```txt
POST /api/admin/store/driver-liquidations/:liquidationId/annul
```

### Request

```json
{
  "reason": "Error administrativo",
  "comment": "Se liquidó un pedido que no correspondía."
}
```

---

## 67. Exportar liquidaciones

```txt
GET /api/admin/store/driver-liquidations/export
```

### Query params

```txt
type
driverId
dateFrom
dateTo
status
format
```

---

# SECCIÓN M — COMPONENTES FRONTEND

## 68. Componentes sugeridos

```txt
DriverLiquidationsPage.tsx
DriverLiquidationSummaryCards.tsx
DriverLiquidationFilters.tsx
DriverLiquidationByDriverTable.tsx
DriverPendingPaymentsTable.tsx
DriverRetainedPaymentsTable.tsx
DriverLiquidatedPaymentsTable.tsx
CreateDriverLiquidationModal.tsx
ConfirmDriverLiquidationModal.tsx
RetainDriverPaymentModal.tsx
ReleaseDriverPaymentModal.tsx
MarkDriverPaymentNotApplicableModal.tsx
AnnulLiquidationModal.tsx
DriverLiquidationDetail.tsx
DriverLiquidationItemsTable.tsx
DriverPaymentStatusBadge.tsx
DriverLiquidationStatusBadge.tsx
```

---

## 69. Estructura sugerida de archivos

```txt
app/
  admin/
    tienda/
      liquidaciones/
        page.tsx
        nueva/
          page.tsx
        pendientes/
          page.tsx
        retenidas/
          page.tsx
        motorista/
          [motoristaId]/
            page.tsx
        [liquidacionId]/
          page.tsx
        components/
          DriverLiquidationSummaryCards.tsx
          DriverLiquidationFilters.tsx
          DriverLiquidationByDriverTable.tsx
          DriverPendingPaymentsTable.tsx
          DriverRetainedPaymentsTable.tsx
          DriverLiquidatedPaymentsTable.tsx
          CreateDriverLiquidationModal.tsx
          ConfirmDriverLiquidationModal.tsx
          RetainDriverPaymentModal.tsx
          ReleaseDriverPaymentModal.tsx
          MarkDriverPaymentNotApplicableModal.tsx
          AnnulLiquidationModal.tsx
          DriverLiquidationDetail.tsx
          DriverLiquidationItemsTable.tsx
          DriverPaymentStatusBadge.tsx
          DriverLiquidationStatusBadge.tsx

lib/
  services/
    store/
      storeDriverLiquidationService.ts
      storeDriverLiquidationQueryService.ts
      storeDriverPaymentStatusService.ts
      storeDriverPaymentRetentionService.ts
      storeDriverLiquidationExportService.ts
      storeDriverLiquidationValidationService.ts
      storeDriverPaymentHistoryService.ts

types/
  store/
    driverLiquidation.ts
    driverPayment.ts
    driverPaymentHistory.ts
```

---

# SECCIÓN N — DISEÑO VISUAL

## 70. Consideraciones visuales

1. El diseño debe ser compacto.
2. Las cards deben ser de baja altura.
3. Los montos deben estar claramente visibles.
4. Los estados deben mostrarse como badges.
5. Las tablas deben usar botones pequeños.
6. Los filtros no deben ser robustos.
7. Los modales deben aparecer centrados.
8. El fondo debe quedar bloqueado al abrir modales.
9. Las acciones críticas deben pedir confirmación.
10. Liquidar debe verse como acción principal.
11. Retener debe verse como acción de advertencia.
12. Anular debe verse como acción crítica.
13. Los títulos deben ir en negrita.
14. No mostrar montos a usuarios sin permiso.
15. Separar visualmente pagos pendientes, retenidos y liquidados.

---

## 71. Badges sugeridos

### Estado pago motorista

```txt
Pendiente de liquidar
Liquidado
Retenido
No aplica
No asignado
Anulado
```

### Estado liquidación

```txt
Activa
Anulada
```

---

# SECCIÓN O — VALIDACIONES

## 72. Validaciones al crear liquidación

1. Usuario debe tener permiso.
2. Motorista debe existir.
3. Debe seleccionarse al menos un pedido.
4. Todos los pedidos deben pertenecer al motorista seleccionado.
5. Todos los pedidos deben tener estado **Pendiente de liquidar**.
6. Ningún pedido debe estar retenido.
7. Ningún pedido debe estar ya liquidado.
8. Ningún pedido debe estar marcado como no aplica.
9. Todos los pedidos deben tener monto de pago al motorista.
10. Los montos no pueden ser negativos.
11. El total debe calcularse automáticamente.
12. La fecha de liquidación debe ser obligatoria.
13. Debe generarse número único de liquidación.
14. Debe evitarse doble liquidación por concurrencia.
15. Debe registrarse historial por cada pedido.

---

## 73. Validaciones al retener pago

1. Pedido debe existir.
2. Pedido debe tener motorista asignado.
3. Estado debe ser **Pendiente de liquidar**.
4. Motivo obligatorio.
5. Comentario obligatorio.
6. Usuario debe tener permiso.
7. Debe registrar historial.
8. No debe permitir liquidación mientras esté retenido.

---

## 74. Validaciones al liberar retenido

1. Pedido debe existir.
2. Estado debe ser **Retenido**.
3. Comentario obligatorio.
4. Usuario debe tener permiso.
5. Debe cambiar a **Pendiente de liquidar**.
6. Debe registrar historial.

---

## 75. Validaciones al marcar no aplica

1. Pedido debe existir.
2. Estado debe ser **Pendiente de liquidar** o **Retenido**.
3. Motivo obligatorio.
4. Comentario obligatorio.
5. Usuario debe tener permiso.
6. Debe cambiar estado a **No aplica**.
7. No debe eliminar monto original.
8. Debe registrar historial.

---

## 76. Validaciones al anular liquidación

1. Liquidación debe existir.
2. Liquidación debe estar activa.
3. Usuario debe tener permiso especial.
4. Motivo obligatorio.
5. Comentario obligatorio.
6. No debe eliminar liquidación.
7. Debe cambiar estado a **Anulada**.
8. Debe actualizar pedidos incluidos según política.
9. Debe registrar historial.
10. Debe evitar inconsistencias.

---

# SECCIÓN P — CASOS DE USO

## 77. Caso de uso 1: Admin consulta pagos pendientes

1. Admin ingresa a Tienda > Liquidaciones.
2. El sistema muestra resumen por motorista.
3. Admin filtra por pagos pendientes.
4. Sistema muestra motoristas con saldo pendiente.

### Resultado esperado

El admin puede identificar cuánto se debe pagar a cada motorista.

---

## 78. Caso de uso 2: Admin crea liquidación

1. Admin abre detalle de un motorista.
2. Selecciona pedidos pendientes.
3. Sistema calcula total.
4. Admin presiona **Liquidar seleccionados**.
5. Sistema muestra modal de confirmación.
6. Admin confirma.
7. Sistema crea liquidación.
8. Sistema cambia pedidos a **Liquidado**.

### Resultado esperado

Los pedidos seleccionados quedan liquidados y registrados en historial.

---

## 79. Caso de uso 3: Admin retiene pago

1. Admin abre pedido pendiente.
2. Presiona **Retener pago**.
3. Ingresa motivo y comentario.
4. Confirma acción.
5. Sistema cambia estado a **Retenido**.

### Resultado esperado

El pedido no puede liquidarse hasta que sea liberado.

---

## 80. Caso de uso 4: Admin libera pago retenido

1. Admin entra a pagos retenidos.
2. Selecciona un pedido.
3. Presiona **Liberar pago**.
4. Ingresa comentario.
5. Sistema cambia estado a **Pendiente de liquidar**.

### Resultado esperado

El pedido queda disponible para liquidación.

---

## 81. Caso de uso 5: Admin marca pago como no aplica

1. Admin revisa un pago retenido.
2. Determina que no corresponde pagar.
3. Presiona **No aplica**.
4. Ingresa motivo.
5. Sistema actualiza estado.

### Resultado esperado

El pedido queda excluido de liquidaciones.

---

## 82. Caso de uso 6: Admin consulta liquidación histórica

1. Admin entra a historial.
2. Busca una liquidación.
3. Abre el detalle.
4. Revisa pedidos incluidos y total.

### Resultado esperado

El admin puede auditar liquidaciones realizadas.

---

# SECCIÓN Q — CRITERIOS DE ACEPTACIÓN

## 83. Criterios funcionales

1. Debe existir opción **Liquidaciones** dentro del menú Tienda.
2. El módulo debe mostrar pagos pendientes por motorista.
3. El módulo debe mostrar pagos retenidos.
4. El módulo debe mostrar pagos liquidados.
5. El módulo debe mostrar pagos no aplicables.
6. Debe mostrar totales en quetzales.
7. Debe existir tabla agrupada por motorista.
8. La tabla debe mostrar total pendiente por motorista.
9. La tabla debe mostrar total retenido por motorista.
10. Debe existir detalle por motorista.
11. El detalle debe mostrar pedidos pendientes.
12. El detalle debe mostrar pedidos retenidos.
13. El detalle debe mostrar pedidos liquidados.
14. El admin debe poder seleccionar pedidos pendientes.
15. El sistema debe calcular total seleccionado.
16. El admin debe poder crear liquidación.
17. Crear liquidación debe exigir al menos un pedido.
18. Crear liquidación debe generar número único.
19. Crear liquidación debe marcar pedidos como liquidados.
20. Crear liquidación debe guardar fecha de liquidación.
21. Crear liquidación debe guardar usuario que liquidó.
22. Crear liquidación debe guardar detalle de pedidos incluidos.
23. No debe permitir liquidar pedidos retenidos.
24. No debe permitir liquidar pedidos ya liquidados.
25. No debe permitir liquidar pedidos no aplica.
26. No debe permitir liquidar pedidos de motoristas diferentes en una misma liquidación.
27. El admin debe poder retener pago.
28. Retener pago debe exigir motivo.
29. Retener pago debe exigir comentario.
30. Un pago retenido no debe poder liquidarse.
31. El admin debe poder liberar pago retenido.
32. Liberar pago retenido debe regresar el estado a pendiente de liquidar.
33. El admin debe poder marcar pago como no aplica.
34. Marcar no aplica debe exigir motivo.
35. Los pagos no aplica no deben incluirse en liquidaciones.
36. Debe existir detalle de liquidación.
37. El detalle debe mostrar motorista, pedidos y total liquidado.
38. Debe existir historial de liquidaciones.
39. Debe permitir exportar liquidaciones.
40. La exportación debe respetar filtros.
41. Los montos deben ocultarse si el usuario no tiene permiso.
42. Todas las acciones deben validarse en backend.
43. El frontend no debe ser la única capa de seguridad.
44. Cada cambio debe registrar historial.
45. Debe registrarse usuario, fecha y comentario en acciones críticas.
46. No debe existir liquidación desde PWA Motorista.
47. No debe existir pago automático bancario.
48. No debe mezclarse pago al motorista con pago del cliente.
49. El cliente nunca debe ver información de liquidación del motorista.
50. El diseño debe ser compacto.
51. Los botones deben ser pequeños y claros.
52. Los modales deben aparecer centrados.
53. El fondo debe bloquearse al abrir modales.
54. Cada pantalla debe tener ruta propia.
55. Cada componente debe estar separado por responsabilidad.

---

## 84. Resultado esperado del FRD

Al finalizar este desarrollo, la plataforma administrativa contará con un módulo de **Liquidación de Motoristas** que permitirá controlar cuánto se debe pagar a cada motorista, revisar entregas pendientes, retener pagos con incidencia, liberar pagos retenidos, marcar pagos como no aplicables y crear liquidaciones con trazabilidad completa.

Este módulo cerrará el flujo operativo de entrega, conectando pedidos, agenda, PWA Motorista, cobro en efectivo y control interno de pagos a motoristas.
