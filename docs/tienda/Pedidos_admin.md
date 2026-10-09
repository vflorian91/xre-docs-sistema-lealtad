# FRD 04 — Pedidos Admin

## 1. Información general del requerimiento

### Nombre del módulo

Pedidos Admin

### Plataforma

Web Administrador

### Tipo de módulo

Módulo administrativo transaccional para revisión, confirmación, reprogramación, cancelación y seguimiento de pedidos generados desde la tienda de la PWA Cliente.

### Objetivo general

Permitir que el administrador gestione los pedidos solicitados por los clientes desde la tienda, validando productos, disponibilidad, dirección de entrega, fecha sugerida y condiciones logísticas antes de confirmar o reprogramar la entrega.

Este módulo debe funcionar como el centro de control de pedidos. Desde aquí el administrador podrá confirmar pedidos, cambiar estados, reprogramar entregas, cancelar solicitudes y preparar el pedido para asignación de motorista.

---

## 2. Contexto funcional

El cliente realiza una solicitud de pedido desde la PWA Cliente. Esa solicitud no debe convertirse automáticamente en entrega confirmada, ya que la empresa debe revisar disponibilidad, agenda, capacidad logística y motoristas disponibles.

La entrega no puede realizarse el mismo día de la solicitud. El cliente solo sugiere una fecha de entrega, pero el administrador debe confirmarla o reprogramarla según disponibilidad.

El pago del cliente será únicamente **efectivo contra entrega**. Por lo tanto, el pedido nace con estado de pago **Pendiente de cobro**.

---

## 3. Alcance del FRD

Este FRD contempla:

* Tabla administrativa de pedidos.
* Filtros por estado, fecha, cliente, marca, motorista y pago.
* Cards de resumen.
* Detalle completo del pedido.
* Confirmación administrativa del pedido.
* Reprogramación de entrega.
* Cancelación de pedido.
* Cambio de estado del pedido.
* Visualización de productos solicitados.
* Visualización de datos del cliente.
* Visualización de dirección de entrega.
* Visualización de fecha sugerida.
* Definición de fecha confirmada de entrega.
* Definición de rango horario.
* Registro de historial y trazabilidad.
* Registro de duración por etapa.
* Preparación para asignación de motorista.
* Preparación para pago del motorista.

---

## 4. Fuera de alcance

Este FRD no contempla:

* Creación de productos.
* Administración de marcas.
* Carrito de compra.
* PWA Motorista.
* Liquidación de motoristas.
* Reportes avanzados.
* Geolocalización en tiempo real.
* Pasarela de pago.
* Pago con tarjeta.
* Pago por transferencia.
* Confirmación de cobro por parte del cliente.

---

## 5. Ubicación en menú

### Menú principal

Debe existir dentro de la plataforma administrativa:

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
/admin/tienda/pedidos
```

---

## 6. Rutas sugeridas

```txt
/admin/tienda/pedidos
/admin/tienda/pedidos/[pedidoId]
/admin/tienda/pedidos/[pedidoId]/confirmar
/admin/tienda/pedidos/[pedidoId]/reprogramar
/admin/tienda/pedidos/[pedidoId]/cancelar
```

También puede manejarse con modales desde el detalle del pedido, evitando rutas adicionales para confirmar, reprogramar o cancelar. Sin embargo, la ruta principal y el detalle sí deben existir separados.

---

## 7. Permisos del módulo

El módulo debe respetar la lógica de roles y permisos del sistema.

### Permisos sugeridos

* Ver pedidos.
* Ver detalle de pedido.
* Confirmar pedido.
* Reprogramar pedido.
* Cancelar pedido.
* Cambiar estado de pedido.
* Ver historial de pedido.
* Asignar entrega.
* Ver datos de cliente.
* Ver datos de pago.
* Exportar pedidos.

### Reglas

1. Un usuario sin permiso de ver pedidos no debe acceder al listado.
2. Un usuario sin permiso de confirmar no debe ver el botón **Confirmar pedido**.
3. Un usuario sin permiso de cancelar no debe ver el botón **Cancelar pedido**.
4. Un usuario sin permiso de reprogramar no debe ver la acción **Reprogramar**.
5. Las validaciones de permisos deben aplicarse en frontend y backend.
6. Toda acción debe registrar el usuario que la ejecutó.

---

# SECCIÓN A — TABLA DE PEDIDOS

## 8. Pantalla: Tabla de pedidos

### Ruta

```txt
/admin/tienda/pedidos
```

### Objetivo

Permitir que el administrador consulte, filtre y gestione los pedidos realizados por clientes desde la tienda.

### Encabezado de pantalla

Título:

```txt
Pedidos
```

Subtítulo sugerido:

```txt
Gestiona las solicitudes de compra, programación de entrega y estado de pedidos.
```

### Botón principal

En este módulo no necesariamente debe existir botón de **Nuevo pedido**, porque los pedidos nacen desde la PWA Cliente.

Opcionalmente puede existir un botón:

```txt
Exportar
```

---

## 9. Cards de resumen

La pantalla debe mostrar cards compactas con métricas principales.

### Cards sugeridas

1. **Pedidos solicitados**
2. **En revisión**
3. **Confirmados**
4. **Reprogramados**
5. **Asignados a motorista**
6. **En ruta**
7. **Entregados**
8. **Cancelados**
9. **Pendientes de cobro**
10. **Cobrado en efectivo**

### Reglas

1. Las cards deben ser compactas.
2. Pueden funcionar como filtros rápidos.
3. No deben saturar la pantalla.
4. Deben respetar el diseño del admin.
5. Los títulos deben ir en negrita.
6. El número debe ser claro y visible.
7. Si hay demasiadas cards, deben organizarse en una sola fila con scroll horizontal o en dos filas compactas.

---

## 10. Filtros de pedidos

### Filtros requeridos

* Búsqueda general.
* Estado del pedido.
* Estado de entrega.
* Estado de pago del cliente.
* Fecha de solicitud.
* Fecha sugerida de entrega.
* Fecha confirmada de entrega.
* Marca.
* Cliente.
* Motorista.
* Pedidos sin motorista.
* Pedidos pendientes de programación.

### Búsqueda general

Debe permitir buscar por:

* Número de pedido.
* Nombre del cliente.
* Teléfono del cliente.
* Correo del cliente.
* NIT del cliente.
* Producto.
* Marca.

### Reglas

1. Los filtros deben ser compactos.
2. La búsqueda debe funcionar por coincidencia parcial.
3. Los filtros deben poder combinarse.
4. Debe existir opción para limpiar filtros.
5. La tabla debe actualizarse sin recargar toda la pantalla.
6. Debe existir paginación.
7. La paginación sugerida es de 10 registros por página.

---

## 11. Columnas de tabla de pedidos

La tabla debe mostrar:

* Número de pedido.
* Cliente.
* Teléfono.
* Total.
* Marcas.
* Fecha de solicitud.
* Fecha sugerida.
* Fecha confirmada.
* Estado del pedido.
* Estado de pago.
* Motorista.
* Acciones.

### Reglas de visualización

1. Si el pedido tiene productos de una sola marca, mostrar el nombre de la marca.
2. Si el pedido tiene productos de varias marcas, mostrar **Varias marcas**.
3. Si no tiene motorista asignado, mostrar **Sin asignar**.
4. El total debe mostrarse en quetzales.
5. Los estados deben mostrarse como badges.
6. Los botones de acción deben ser compactos.

---

## 12. Acciones desde tabla

### Acciones sugeridas

* Ver.
* Confirmar.
* Reprogramar.
* Cancelar.
* Asignar motorista.
* Ver historial.

### Reglas

1. La acción **Confirmar** solo debe estar disponible si el pedido está en estado válido.
2. La acción **Reprogramar** debe estar disponible antes de entrega final.
3. La acción **Cancelar** debe estar disponible antes de que el pedido esté entregado.
4. La acción **Asignar motorista** debe estar disponible cuando el pedido esté confirmado o en preparación.
5. Si el pedido está entregado, no debe permitirse cancelación normal.
6. Si el pedido está cancelado, no debe permitirse asignación de motorista.

---

# SECCIÓN B — ESTADOS DEL PEDIDO

## 13. Estado comercial del pedido

### Estados sugeridos

```txt
PEDIDO_SOLICITADO
EN_REVISION
CONFIRMADO_ADMIN
REPROGRAMADO
PREPARANDO_PEDIDO
ASIGNADO_MOTORISTA
EN_RUTA
ENTREGADO
NO_ENTREGADO
CANCELADO
```

### Visualización para admin

```txt
Pedido solicitado
En revisión
Confirmado por admin
Reprogramado
Preparando pedido
Asignado a motorista
En ruta
Entregado
No entregado
Cancelado
```

---

## 14. Estado de entrega

### Estados sugeridos

```txt
PENDIENTE_PROGRAMACION
PROGRAMADA
REPROGRAMADA
ASIGNADA
EN_RUTA
ENTREGADA
NO_ENTREGADA
CANCELADA
```

### Reglas

1. El estado de entrega debe iniciar como **Pendiente de programación**.
2. Cuando el admin confirma fecha, debe cambiar a **Programada**.
3. Cuando se asigna motorista, debe cambiar a **Asignada**.
4. Cuando el motorista sale, debe cambiar a **En ruta**.
5. Cuando se entrega, debe cambiar a **Entregada**.
6. Si no se entrega, debe cambiar a **No entregada**.

---

## 15. Estado de pago del cliente

### Estados sugeridos

```txt
PENDIENTE_COBRO
COBRADO_EFECTIVO
NO_COBRADO
ANULADO
```

### Reglas

1. Todo pedido nace como **Pendiente de cobro**.
2. Solo puede cambiar a **Cobrado efectivo** cuando el motorista o admin confirme cobro.
3. Si el pedido se cancela antes de entregar, el estado puede pasar a **Anulado**.
4. Si no se logró entregar y no se cobró, el estado debe quedar como **No cobrado** o **Pendiente de cobro**, según política interna.
5. El pago del cliente no debe confundirse con el pago al motorista.

---

## 16. Estado de pago al motorista

Aunque la liquidación se documentará en otro FRD, el pedido debe preparar estos estados.

### Estados sugeridos

```txt
NO_ASIGNADO
PENDIENTE_LIQUIDAR
LIQUIDADO
RETENIDO
NO_APLICA
```

### Reglas

1. Al crear pedido desde cliente, debe nacer como **No asignado**.
2. Al asignar motorista y definir pago, debe pasar a **Pendiente liquidar**.
3. Al liquidar desde el módulo correspondiente, debe pasar a **Liquidado**.
4. Si existe incidencia, puede pasar a **Retenido**.

---

# SECCIÓN C — DETALLE DEL PEDIDO ADMIN

## 17. Pantalla: Detalle del pedido

### Ruta

```txt
/admin/tienda/pedidos/[pedidoId]
```

### Objetivo

Mostrar al administrador toda la información necesaria para decidir si confirma, reprograma, cancela o asigna motorista al pedido.

### Estructura sugerida

La pantalla debe dividirse en secciones:

1. Encabezado del pedido.
2. Información del cliente.
3. Productos solicitados.
4. Información de pago del cliente.
5. Información de entrega.
6. Asignación logística.
7. Pago al motorista.
8. Línea de tiempo.
9. Historial de cambios.
10. Acciones administrativas.

---

## 18. Encabezado del pedido

Debe mostrar:

* Número de pedido.
* Estado actual del pedido.
* Estado de entrega.
* Estado de pago del cliente.
* Fecha de solicitud.
* Total del pedido.
* Botones de acción.

### Botones sugeridos

* Confirmar pedido.
* Reprogramar.
* Asignar motorista.
* Cancelar.
* Volver a tabla.

### Reglas

1. Los botones deben mostrarse según estado y permisos.
2. Los estados deben mostrarse como badges.
3. El total debe estar visible en quetzales.
4. La pantalla debe ser compacta y ordenada.

---

## 19. Información del cliente

Debe mostrar:

* Nombre del cliente.
* Apellido, si aplica.
* Teléfono.
* Correo.
* NIT.
* Canal de origen, si existe.
* Estado del cliente.
* Botón o enlace para ver perfil del cliente, si el usuario tiene permiso.

### Reglas

1. El admin debe poder identificar claramente al cliente.
2. Si el cliente está inactivo, debe mostrarse alerta.
3. El pedido histórico no debe eliminarse aunque el cliente cambie de estado.
4. El pedido debe conservar snapshot de dirección aunque el cliente actualice su perfil.

---

## 20. Dirección de entrega

Debe mostrar:

* Dirección.
* Departamento.
* Municipio.
* Zona.
* Referencia.
* Teléfono de contacto.
* Nombre de quien recibe, si existe.
* Comentarios para entrega, si existen.

### Reglas

1. Esta información debe provenir del pedido.
2. No debe depender únicamente del perfil actual del cliente.
3. Si el cliente cambia su dirección de perfil después, no debe modificar automáticamente el pedido.
4. El admin debe poder revisar si la dirección está completa.
5. La referencia debe mostrarse de forma clara para logística.

---

## 21. Productos solicitados

Debe mostrar una tabla o cards compactas con:

* Imagen del producto.
* Marca.
* Producto.
* Cantidad.
* Precio unitario.
* Subtotal.
* Stock actual, visible solo para admin.
* Estado actual del producto, visible solo para admin.

### Reglas

1. El nombre, marca y precio del pedido deben venir del snapshot.
2. El stock actual debe consultarse del producto vigente.
3. Si un producto ya no tiene stock suficiente, mostrar alerta.
4. Si un producto fue inactivado después de la solicitud, mostrar alerta.
5. El admin debe poder decidir si confirma o cancela según disponibilidad.
6. Los precios del pedido no deben cambiar si el producto actual cambia de precio.

---

## 22. Información de pago del cliente

Debe mostrar:

* Método de pago.
* Estado de pago.
* Total a cobrar.
* Monto cobrado, si aplica.
* Fecha de cobro, si aplica.
* Usuario o motorista que confirmó cobro, si aplica.

### Método de pago

Siempre debe ser:

```txt
Efectivo contra entrega
```

### Reglas

1. El pedido no debe mostrar opción de pago digital.
2. El admin debe ver que el pedido está pendiente de cobro.
3. El estado de pago solo debe cambiarse por flujo autorizado.
4. El pago no debe marcarse cobrado al confirmar pedido.
5. El pago se marca cobrado al entregar y confirmar efectivo.

---

## 23. Información de entrega

Debe mostrar:

* Fecha sugerida por cliente.
* Fecha confirmada por admin.
* Rango horario confirmado.
* Estado de entrega.
* Motivo de reprogramación, si aplica.
* Fecha anterior, si fue reprogramado.
* Historial de reprogramaciones.

### Reglas

1. La fecha sugerida no es definitiva.
2. El admin debe definir fecha confirmada.
3. La fecha confirmada no puede ser el mismo día de solicitud.
4. La fecha confirmada puede ser diferente a la sugerida.
5. Si se cambia la fecha, debe registrarse motivo.
6. El cliente debe ser notificado si la fecha se confirma o reprograma.

---

## 24. Asignación logística

Debe mostrar:

* Motorista asignado.
* Teléfono del motorista.
* Fecha de asignación.
* Estado de asignación.
* Usuario que asignó.
* Botón para asignar o cambiar motorista.

### Reglas

1. El pedido puede estar confirmado sin motorista asignado.
2. El motorista solo debe asignarse a pedidos confirmados o en preparación.
3. No debe asignarse motorista a pedido cancelado.
4. No debe cambiarse motorista si el pedido ya está entregado.
5. Si el pedido está en ruta, cambiar motorista debe requerir permiso especial o estar bloqueado.
6. Todo cambio de motorista debe registrarse en historial.

---

## 25. Pago al motorista dentro del pedido

Debe existir una sección visible para admin:

```txt
Pago al motorista
```

Debe mostrar:

* Monto definido para el motorista.
* Estado de pago al motorista.
* Fecha de liquidación, si aplica.
* Usuario que liquidó, si aplica.

### Reglas

1. El pago al motorista lo define el admin.
2. El monto puede variar por pedido.
3. El monto puede depender de zona, dificultad, acuerdo interno o criterio manual.
4. El pago al motorista no debe mostrarse al cliente.
5. El pago al motorista no debe confundirse con el total del pedido.
6. Al asignar motorista, el pago debe quedar como **Pendiente de liquidar**.
7. La liquidación final se documentará en el FRD correspondiente.

---

# SECCIÓN D — CONFIRMAR PEDIDO

## 26. Acción: Confirmar pedido

### Objetivo

Permitir que el administrador confirme que el pedido es válido, que los productos tienen disponibilidad y que se continuará con la programación de entrega.

### Disponible cuando

El pedido está en estado:

```txt
PEDIDO_SOLICITADO
EN_REVISION
REPROGRAMADO
```

### No disponible cuando

El pedido está en estado:

```txt
CANCELADO
ENTREGADO
NO_ENTREGADO
EN_RUTA
```

---

## 27. Modal de confirmación de pedido

Al presionar **Confirmar pedido**, debe aparecer un modal.

### Información a mostrar

* Número de pedido.
* Cliente.
* Total.
* Productos.
* Fecha sugerida.
* Fecha confirmada a registrar.
* Rango horario, si aplica.
* Mensaje de confirmación.

### Campos del modal

* Fecha confirmada de entrega.
* Rango horario.
* Comentario interno opcional.

### Texto sugerido

```txt
Confirmar pedido

Este pedido será confirmado y quedará listo para preparación y asignación de motorista.

La entrega no puede ser programada para el mismo día de la solicitud.
```

### Botones

```txt
Cancelar
Confirmar pedido
```

---

## 28. Reglas para confirmar pedido

1. Validar que el pedido tenga productos.
2. Validar que los productos tengan stock suficiente.
3. Validar que el pedido no esté cancelado.
4. Validar que el pedido no esté entregado.
5. Validar que la fecha confirmada no sea el mismo día de solicitud.
6. Validar que la fecha confirmada no sea anterior a la fecha actual.
7. Validar permisos del usuario.
8. Descontar stock al confirmar pedido.
9. Registrar movimiento de stock.
10. Cambiar estado del pedido a **Confirmado por admin**.
11. Cambiar estado de entrega a **Programada**.
12. Registrar timeline.
13. Notificar al cliente.
14. Mantener estado de pago como **Pendiente de cobro**.

---

## 29. Movimiento de stock al confirmar

### Regla recomendada

El stock debe descontarse al confirmar pedido.

### Movimiento sugerido

```txt
Tipo: ORDER_CONFIRMED
Referencia: ID del pedido
Cantidad: cantidad confirmada
Comentario: Stock descontado por confirmación de pedido.
```

### Reglas

1. Debe validarse stock antes de descontar.
2. No debe permitirse stock negativo.
3. Si un producto no tiene stock suficiente, bloquear confirmación.
4. Debe mostrar detalle del producto con problema.
5. El movimiento debe quedar en auditoría.

---

## 30. Notificación al cliente por confirmación

Al confirmar el pedido, el cliente debe recibir notificación.

### Mensaje sugerido

```txt
Tu pedido fue confirmado. La entrega fue programada para el día indicado por nuestro equipo.
```

Si se confirma en la misma fecha sugerida:

```txt
Tu pedido fue confirmado para la fecha sugerida.
```

Si se confirma en otra fecha:

```txt
Tu pedido fue confirmado con una nueva fecha de entrega.
```

---

# SECCIÓN E — REPROGRAMAR PEDIDO

## 31. Acción: Reprogramar entrega

### Objetivo

Permitir que el administrador cambie la fecha de entrega por disponibilidad operativa, falta de motorista, agenda llena, problemas de inventario u otra razón.

### Disponible cuando

El pedido no está finalizado.

Estados permitidos:

```txt
PEDIDO_SOLICITADO
EN_REVISION
CONFIRMADO_ADMIN
REPROGRAMADO
PREPARANDO_PEDIDO
ASIGNADO_MOTORISTA
```

### No disponible cuando

```txt
EN_RUTA
ENTREGADO
CANCELADO
```

---

## 32. Modal de reprogramación

### Campos requeridos

* Nueva fecha de entrega.
* Nuevo rango horario, si aplica.
* Motivo de reprogramación.

### Campos opcionales

* Comentario interno.
* Comentario visible para cliente.

### Texto sugerido

```txt
Reprogramar entrega

La nueva fecha será notificada al cliente. Debe indicar el motivo de la reprogramación.
```

### Botones

```txt
Cancelar
Guardar reprogramación
```

---

## 33. Reglas de reprogramación

1. La nueva fecha no puede ser el mismo día de la solicitud original.
2. La nueva fecha no puede ser anterior a la fecha actual.
3. El motivo de reprogramación debe ser obligatorio.
4. Debe guardarse la fecha anterior.
5. Debe guardarse la nueva fecha.
6. Debe guardarse usuario que reprogramó.
7. Debe registrarse timeline.
8. Debe notificar al cliente.
9. Si ya tenía motorista asignado, el sistema debe permitir mantenerlo o quitarlo.
10. Si la nueva fecha cambia mucho, se recomienda solicitar confirmación de disponibilidad del motorista.

---

## 34. Motivos de reprogramación sugeridos

```txt
No hay disponibilidad de motorista.
Agenda de entregas llena.
Producto pendiente de preparación.
Cliente solicitó cambio.
Dirección requiere validación.
Problema operativo.
Otro.
```

Si selecciona **Otro**, debe solicitar comentario obligatorio.

---

## 35. Notificación al cliente por reprogramación

Mensaje sugerido:

```txt
Tu entrega fue reprogramada. Revisa la nueva fecha asignada en el detalle de tu pedido.
```

Si se usa comentario visible:

```txt
Tu entrega fue reprogramada por el siguiente motivo: [motivo visible].
```

---

# SECCIÓN F — CANCELAR PEDIDO

## 36. Acción: Cancelar pedido

### Objetivo

Permitir cancelar un pedido cuando no se puede completar o cuando el cliente/empresa decide no continuar.

### Disponible cuando

El pedido no esté finalizado como entregado.

Estados permitidos:

```txt
PEDIDO_SOLICITADO
EN_REVISION
CONFIRMADO_ADMIN
REPROGRAMADO
PREPARANDO_PEDIDO
ASIGNADO_MOTORISTA
```

### No disponible cuando

```txt
ENTREGADO
```

Si el pedido está **En ruta**, cancelar debe requerir permiso especial o registrarse como **No entregado**, según la política operativa.

---

## 37. Modal de cancelación

### Campos requeridos

* Motivo de cancelación.
* Comentario.

### Motivos sugeridos

```txt
Cliente solicitó cancelación.
Producto sin disponibilidad.
Dirección fuera de cobertura.
No se logró contactar al cliente.
Error en el pedido.
Problema operativo.
Otro.
```

### Botones

```txt
No cancelar
Confirmar cancelación
```

---

## 38. Reglas de cancelación

1. El motivo debe ser obligatorio.
2. Si el pedido ya había descontado stock, debe devolver stock.
3. Debe registrar movimiento de stock de reversa.
4. Debe cambiar estado del pedido a **Cancelado**.
5. Debe cambiar estado de entrega a **Cancelada**.
6. Debe cambiar estado de pago del cliente a **Anulado** si no fue cobrado.
7. Debe registrar timeline.
8. Debe notificar al cliente.
9. Debe guardar usuario que canceló.
10. No debe eliminar el pedido.

---

## 39. Devolución de stock por cancelación

Si el pedido ya estaba confirmado y el stock fue descontado, al cancelar se debe devolver.

### Movimiento sugerido

```txt
Tipo: ORDER_CANCELLED
Referencia: ID del pedido
Cantidad: cantidad devuelta
Comentario: Stock devuelto por cancelación de pedido.
```

### Reglas

1. Solo devolver stock si ya había sido descontado.
2. No duplicar devolución.
3. Registrar auditoría.
4. Mostrar en historial del producto.

---

## 40. Notificación al cliente por cancelación

Mensaje sugerido:

```txt
Tu pedido fue cancelado. Puedes revisar el motivo en el detalle del pedido.
```

Si se permite mostrar motivo:

```txt
Tu pedido fue cancelado por el siguiente motivo: [motivo].
```

---

# SECCIÓN G — PREPARAR PEDIDO

## 41. Acción: Marcar como preparando

### Objetivo

Permitir que el admin indique que el pedido ya está siendo preparado para entrega.

### Disponible cuando

```txt
CONFIRMADO_ADMIN
REPROGRAMADO
```

### Resultado

El pedido cambia a:

```txt
PREPARANDO_PEDIDO
```

### Reglas

1. Solo aplica a pedidos confirmados.
2. Debe registrar timeline.
3. Puede notificar al cliente si se desea.
4. No debe cambiar estado de pago.
5. No debe asignar motorista automáticamente.

---

## 42. Notificación opcional por preparación

Mensaje sugerido:

```txt
Tu pedido está siendo preparado para entrega.
```

---

# SECCIÓN H — ASIGNACIÓN DESDE PEDIDO

## 43. Preparación para asignar motorista

La asignación completa se documentará en el FRD de Motoristas y Agenda de Entregas, pero desde el pedido debe existir acción para iniciar el flujo.

### Botón sugerido

```txt
Asignar motorista
```

### Disponible cuando

```txt
CONFIRMADO_ADMIN
PREPARANDO_PEDIDO
REPROGRAMADO
```

### Debe abrir modal o sección con:

* Motorista.
* Fecha confirmada.
* Rango horario.
* Monto a pagar al motorista.
* Comentario interno.

### Reglas iniciales

1. No se debe asignar motorista a pedido no confirmado.
2. No se debe asignar motorista a pedido cancelado.
3. No se debe asignar motorista a pedido entregado.
4. El pago al motorista debe ser definido por el admin.
5. El motorista asignado verá el pedido en su PWA.
6. El estado de pago al motorista pasará a **Pendiente de liquidar**.

---

# SECCIÓN I — HISTORIAL Y TRAZABILIDAD

## 44. Línea de tiempo del pedido

El detalle del pedido debe mostrar una línea de tiempo.

### Eventos mínimos

* Pedido solicitado.
* En revisión.
* Pedido confirmado.
* Pedido reprogramado.
* Preparando pedido.
* Motorista asignado.
* En ruta.
* Entregado.
* No entregado.
* Cancelado.
* Pago cobrado.
* Pago motorista liquidado.

---

## 45. Datos por evento de timeline

Cada evento debe mostrar:

* Estado anterior.
* Estado nuevo.
* Tipo de estado.
* Fecha y hora.
* Usuario que realizó el cambio.
* Rol del usuario.
* Comentario.
* Duración de etapa anterior, si aplica.

### Ejemplo

```txt
Pedido confirmado
Usuario: Admin General
Fecha: 27/06/2026 10:45
Comentario: Pedido validado con stock disponible.
Duración etapa anterior: 2 horas 15 minutos
```

---

## 46. Duración por etapa

El sistema debe calcular cuánto tiempo permaneció el pedido en cada estado.

### Ejemplo

```txt
Pedido solicitado → En revisión: 35 minutos
En revisión → Confirmado: 1 hora 20 minutos
Confirmado → Preparando pedido: 40 minutos
Preparando → Asignado a motorista: 2 horas
```

### Reglas

1. La duración debe calcularse entre eventos de timeline.
2. Debe mostrarse en el detalle admin.
3. Puede usarse posteriormente para reportes.
4. No debe mostrarse toda la información interna al cliente.

---

# SECCIÓN J — VALIDACIONES GENERALES

## 47. Validaciones antes de confirmar

1. Pedido debe existir.
2. Pedido no debe estar cancelado.
3. Pedido no debe estar entregado.
4. Pedido debe tener productos.
5. Productos deben tener stock suficiente.
6. Fecha confirmada debe ser válida.
7. Fecha confirmada no debe ser la misma fecha de solicitud.
8. Usuario debe tener permiso.
9. Cliente debe existir.
10. Método de pago debe ser efectivo contra entrega.

---

## 48. Validaciones antes de reprogramar

1. Pedido debe existir.
2. Pedido no debe estar entregado.
3. Pedido no debe estar cancelado.
4. Nueva fecha debe ser válida.
5. Nueva fecha no debe ser igual al mismo día de solicitud.
6. Motivo debe ser obligatorio.
7. Usuario debe tener permiso.
8. Si está en ruta, debe bloquearse o pedir permiso especial.

---

## 49. Validaciones antes de cancelar

1. Pedido debe existir.
2. Pedido no debe estar entregado.
3. Motivo debe ser obligatorio.
4. Usuario debe tener permiso.
5. Si stock fue descontado, debe devolverlo.
6. Si ya tiene motorista asignado, debe marcar entrega como cancelada.
7. Si pago al motorista estaba pendiente, debe pasar a **No aplica** o **Retenido**, según regla.
8. Si pago del cliente no fue cobrado, debe pasar a **Anulado**.

---

# SECCIÓN K — MODELO DE DATOS SUGERIDO

## 50. Tabla: store_orders

```txt
id
order_number
client_id
subtotal_amount
shipping_amount
total_amount
payment_method
client_payment_status
order_status
delivery_status
suggested_delivery_date
confirmed_delivery_date
delivery_time_range
delivery_address
delivery_department_id
delivery_municipality_id
delivery_zone_id
delivery_reference
delivery_phone
receiver_name
assigned_driver_id
driver_payment_amount
driver_payment_status
stock_discounted
confirmed_by
confirmed_at
prepared_by
prepared_at
cancelled_by
cancelled_at
cancel_reason
created_at
updated_at
```

---

## 51. Tabla: store_order_items

```txt
id
order_id
product_id
brand_id
product_name_snapshot
brand_name_snapshot
product_image_snapshot
unit_price
quantity
subtotal
created_at
updated_at
```

---

## 52. Tabla: store_order_timeline

```txt
id
order_id
status_type
previous_status
new_status
comment
created_by_user_id
created_by_client_id
created_by_role
duration_from_previous_status_seconds
created_at
```

---

## 53. Tabla: store_order_reschedules

```txt
id
order_id
previous_delivery_date
new_delivery_date
previous_time_range
new_time_range
reason
internal_comment
client_visible_comment
rescheduled_by
created_at
```

---

## 54. Tabla: store_order_cancellations

```txt
id
order_id
reason
comment
cancelled_by
cancelled_by_role
created_at
```

---

# SECCIÓN L — SERVICIOS SUGERIDOS

## 55. Servicios backend

```txt
AdminStoreOrderService
AdminStoreOrderConfirmationService
AdminStoreOrderRescheduleService
AdminStoreOrderCancellationService
StoreOrderTimelineService
StoreStockService
StoreNotificationService
StoreOrderStatusService
```

---

## 56. AdminStoreOrderService

Responsabilidades:

* Listar pedidos.
* Filtrar pedidos.
* Consultar detalle de pedido.
* Validar permisos.
* Consultar resumen de pedidos.
* Preparar datos para tabla y detalle.

---

## 57. AdminStoreOrderConfirmationService

Responsabilidades:

* Validar confirmación.
* Validar stock.
* Confirmar fecha de entrega.
* Descontar stock.
* Cambiar estados.
* Registrar timeline.
* Notificar cliente.

---

## 58. AdminStoreOrderRescheduleService

Responsabilidades:

* Validar nueva fecha.
* Registrar reprogramación.
* Guardar motivo.
* Cambiar estado.
* Registrar timeline.
* Notificar cliente.

---

## 59. AdminStoreOrderCancellationService

Responsabilidades:

* Validar cancelación.
* Registrar motivo.
* Devolver stock si aplica.
* Cambiar estados.
* Registrar timeline.
* Notificar cliente.

---

# SECCIÓN M — ENDPOINTS SUGERIDOS

## 60. Listar pedidos

```txt
GET /api/admin/store/orders
```

### Query params sugeridos

```txt
search
orderStatus
deliveryStatus
paymentStatus
brandId
clientId
driverId
dateFrom
dateTo
suggestedDeliveryDate
confirmedDeliveryDate
page
limit
```

---

## 61. Obtener detalle de pedido

```txt
GET /api/admin/store/orders/:orderId
```

---

## 62. Confirmar pedido

```txt
POST /api/admin/store/orders/:orderId/confirm
```

### Request sugerido

```json
{
  "confirmedDeliveryDate": "2026-06-27",
  "deliveryTimeRange": "09:00 a 12:00",
  "internalComment": "Pedido validado con stock disponible."
}
```

---

## 63. Reprogramar pedido

```txt
POST /api/admin/store/orders/:orderId/reschedule
```

### Request sugerido

```json
{
  "newDeliveryDate": "2026-06-28",
  "newTimeRange": "12:00 a 15:00",
  "reason": "No hay disponibilidad de motorista.",
  "internalComment": "Agenda llena para la fecha solicitada.",
  "clientVisibleComment": "La entrega fue movida por disponibilidad de agenda."
}
```

---

## 64. Cancelar pedido

```txt
POST /api/admin/store/orders/:orderId/cancel
```

### Request sugerido

```json
{
  "reason": "Producto sin disponibilidad.",
  "comment": "No se cuenta con stock suficiente para completar el pedido."
}
```

---

## 65. Marcar como preparando

```txt
POST /api/admin/store/orders/:orderId/prepare
```

### Request sugerido

```json
{
  "internalComment": "Pedido enviado a preparación."
}
```

---

## 66. Obtener timeline

```txt
GET /api/admin/store/orders/:orderId/timeline
```

---

# SECCIÓN N — COMPONENTES FRONTEND

## 67. Componentes sugeridos

```txt
AdminOrdersPage.tsx
OrderSummaryCards.tsx
OrderFilters.tsx
OrderTable.tsx
OrderStatusBadge.tsx
OrderPaymentStatusBadge.tsx
OrderDeliveryStatusBadge.tsx
OrderDetailHeader.tsx
OrderClientInfo.tsx
OrderDeliveryInfo.tsx
OrderProductsTable.tsx
OrderPaymentInfo.tsx
OrderDriverInfo.tsx
OrderDriverPaymentInfo.tsx
OrderTimeline.tsx
ConfirmOrderModal.tsx
RescheduleOrderModal.tsx
CancelOrderModal.tsx
PrepareOrderModal.tsx
```

---

## 68. Estructura sugerida de archivos

```txt
app/
  admin/
    tienda/
      pedidos/
        page.tsx
        [pedidoId]/
          page.tsx
        components/
          OrderSummaryCards.tsx
          OrderFilters.tsx
          OrderTable.tsx
          OrderStatusBadge.tsx
          OrderPaymentStatusBadge.tsx
          OrderDeliveryStatusBadge.tsx
          OrderDetailHeader.tsx
          OrderClientInfo.tsx
          OrderDeliveryInfo.tsx
          OrderProductsTable.tsx
          OrderPaymentInfo.tsx
          OrderDriverInfo.tsx
          OrderDriverPaymentInfo.tsx
          OrderTimeline.tsx
          ConfirmOrderModal.tsx
          RescheduleOrderModal.tsx
          CancelOrderModal.tsx
          PrepareOrderModal.tsx

lib/
  services/
    store/
      adminStoreOrderService.ts
      adminStoreOrderConfirmationService.ts
      adminStoreOrderRescheduleService.ts
      adminStoreOrderCancellationService.ts
      storeOrderTimelineService.ts
      storeOrderStatusService.ts
```

---

# SECCIÓN O — DISEÑO VISUAL

## 69. Consideraciones de diseño

1. La tabla debe ser compacta.
2. Los filtros no deben ser robustos.
3. Los botones deben ser pequeños y claros.
4. Los estados deben mostrarse como badges.
5. El detalle debe dividirse en cards por sección.
6. Los títulos deben ir en negrita.
7. Evitar saturación visual.
8. La línea de tiempo debe ser clara y fácil de leer.
9. Los modales deben aparecer centrados.
10. El fondo debe quedar bloqueado cuando aparezca un modal.
11. Las acciones críticas deben solicitar confirmación.
12. Cancelar pedido debe tener color o estilo de advertencia.
13. Confirmar pedido debe verse como acción principal.

---

# SECCIÓN P — CASOS DE USO

## 70. Caso de uso 1: Admin revisa pedidos solicitados

1. Admin ingresa a Tienda > Pedidos.
2. El sistema muestra tabla de pedidos.
3. Admin filtra por **Pedido solicitado**.
4. Admin selecciona un pedido.
5. Sistema muestra detalle.

### Resultado esperado

El admin puede revisar toda la información necesaria antes de confirmar.

---

## 71. Caso de uso 2: Admin confirma pedido

1. Admin abre detalle del pedido.
2. Revisa productos y stock.
3. Presiona **Confirmar pedido**.
4. Ingresa fecha confirmada y rango horario.
5. Confirma acción.
6. Sistema descuenta stock.
7. Sistema cambia estados.
8. Sistema notifica al cliente.

### Resultado esperado

El pedido queda confirmado y listo para preparación o asignación de motorista.

---

## 72. Caso de uso 3: Admin reprograma entrega

1. Admin abre pedido.
2. Presiona **Reprogramar**.
3. Ingresa nueva fecha.
4. Selecciona motivo.
5. Guarda.
6. Sistema registra cambio y notifica cliente.

### Resultado esperado

El pedido queda reprogramado con historial completo.

---

## 73. Caso de uso 4: Admin cancela pedido

1. Admin abre pedido.
2. Presiona **Cancelar pedido**.
3. Ingresa motivo.
4. Confirma cancelación.
5. Sistema devuelve stock si aplica.
6. Sistema cambia estado.
7. Sistema notifica cliente.

### Resultado esperado

El pedido queda cancelado sin eliminarse.

---

## 74. Caso de uso 5: Admin marca pedido en preparación

1. Admin abre pedido confirmado.
2. Presiona **Marcar como preparando**.
3. Confirma acción.
4. Sistema cambia estado.
5. Sistema registra timeline.

### Resultado esperado

El pedido queda en preparación.

---

# SECCIÓN Q — CRITERIOS DE ACEPTACIÓN

## 75. Criterios funcionales

1. Debe existir módulo **Pedidos** dentro de Tienda.
2. La tabla debe mostrar pedidos generados desde la PWA Cliente.
3. La tabla debe mostrar número de pedido, cliente, total, fechas, estados y acciones.
4. La tabla debe tener filtros por estado de pedido.
5. La tabla debe tener filtros por estado de pago.
6. La tabla debe tener filtros por fecha.
7. La tabla debe tener búsqueda general.
8. La tabla debe tener paginación.
9. El admin debe poder abrir detalle del pedido.
10. El detalle debe mostrar información del cliente.
11. El detalle debe mostrar dirección de entrega.
12. El detalle debe mostrar productos solicitados.
13. El detalle debe mostrar total en quetzales.
14. El detalle debe mostrar método de pago efectivo contra entrega.
15. El detalle debe mostrar estado de pago del cliente.
16. El detalle debe mostrar fecha sugerida por cliente.
17. El detalle debe permitir definir fecha confirmada.
18. La fecha confirmada no puede ser el mismo día de solicitud.
19. El admin debe poder confirmar pedido.
20. Confirmar pedido debe validar stock.
21. Confirmar pedido debe descontar stock.
22. Confirmar pedido debe cambiar estado a **Confirmado por admin**.
23. Confirmar pedido debe cambiar entrega a **Programada**.
24. Confirmar pedido no debe cambiar pago a cobrado.
25. El admin debe poder reprogramar entrega.
26. Reprogramar debe exigir motivo.
27. Reprogramar debe registrar fecha anterior y nueva.
28. Reprogramar debe notificar al cliente.
29. El admin debe poder cancelar pedido.
30. Cancelar debe exigir motivo.
31. Cancelar debe devolver stock si ya fue descontado.
32. Cancelar debe cambiar pago a **Anulado** si no fue cobrado.
33. El pedido cancelado no debe eliminarse.
34. El admin debe poder marcar pedido como preparando.
35. El detalle debe mostrar línea de tiempo.
36. La línea de tiempo debe mostrar usuario, fecha y comentario.
37. La línea de tiempo debe calcular duración por etapa.
38. El sistema debe guardar auditoría de cada acción.
39. Las acciones deben respetar permisos.
40. Las validaciones deben aplicarse en frontend y backend.
41. El cliente debe ser notificado en cambios relevantes.
42. El pago al motorista debe mostrarse solo al admin.
43. El cliente no debe ver información interna del motorista.
44. El diseño debe ser compacto.
45. Cada pantalla debe tener ruta y archivo separado.
46. Cada componente debe estar separado por responsabilidad.

---

## 76. Resultado esperado del FRD

Al finalizar este desarrollo, la plataforma administrativa contará con un módulo completo de gestión de pedidos de tienda.

El administrador podrá revisar solicitudes generadas desde la PWA Cliente, confirmar pedidos, reprogramar entregas, cancelar solicitudes, validar stock, preparar pedidos y dejar la orden lista para asignación de motorista.

Este módulo será la base operativa para los siguientes FRD: **Agenda de Entregas**, **Motoristas**, **PWA Motorista** y **Liquidación de Motoristas**.
