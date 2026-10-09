# FRD 05 — Agenda de Entregas

## 1. Información general del requerimiento

### Nombre del módulo

Agenda de Entregas

### Plataforma

Web Administrador

### Tipo de módulo

Módulo administrativo operativo para programación, control, consulta, reprogramación y seguimiento de entregas asociadas a pedidos de la tienda.

### Objetivo general

Permitir que la empresa pueda organizar las entregas de pedidos solicitados por clientes desde la PWA Cliente, asignando fechas confirmadas, rangos horarios, disponibilidad logística y control operativo de visitas.

La agenda debe permitir visualizar qué pedidos están pendientes de programación, cuáles ya tienen entrega confirmada, cuáles fueron reprogramados, cuáles están asignados a motorista y cuáles ya fueron entregados, no entregados o cancelados.

---

## 2. Contexto funcional

La tienda de la PWA Cliente permite solicitar pedidos con pago en efectivo contra entrega. El cliente puede sugerir una fecha de entrega, pero esa fecha no representa una confirmación definitiva.

La empresa se encarga directamente de las entregas y puede operar varias marcas y varios motoristas. Por lo tanto, necesita una agenda que permita organizar las visitas, evitar entregas el mismo día de solicitud, validar disponibilidad y controlar los estados logísticos.

No se usará ubicación en tiempo real. El seguimiento de la entrega se hará por estados, similar a la lógica de canjes.

---

## 3. Alcance del FRD

Este FRD contempla:

* Vista de agenda de entregas.
* Consulta por día, semana y listado.
* Pedidos pendientes de programación.
* Pedidos programados.
* Pedidos reprogramados.
* Pedidos asignados a motorista.
* Pedidos en ruta.
* Pedidos entregados.
* Pedidos no entregados.
* Pedidos cancelados.
* Confirmación de fecha de entrega.
* Definición de rango horario.
* Reprogramación de entrega.
* Validación de que la entrega no sea el mismo día de solicitud.
* Control de capacidad operativa por fecha.
* Visualización de motoristas asignados.
* Visualización de pagos a motorista por pedido.
* Registro de historial de programación.
* Registro de duración por etapa.
* Notificaciones al cliente por programación o reprogramación.

---

## 4. Fuera de alcance

Este FRD no contempla:

* Creación de productos.
* Carrito de compra.
* Solicitud inicial del pedido desde cliente.
* Liquidación final de motoristas.
* PWA Motorista.
* Geolocalización en tiempo real.
* Mapa de rutas.
* Optimización automática de rutas.
* Integración con GPS.
* Cálculo automático de distancia.
* Cobro con tarjeta o pasarela de pago.

---

## 5. Ubicación en menú

La agenda debe estar dentro del módulo principal:

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
/admin/tienda/agenda-entregas
```

---

## 6. Rutas sugeridas

```txt
/admin/tienda/agenda-entregas
/admin/tienda/agenda-entregas/dia/[fecha]
/admin/tienda/agenda-entregas/pedido/[pedidoId]
```

La programación y reprogramación pueden manejarse con modales desde la agenda o desde el detalle del pedido.

---

## 7. Permisos del módulo

El módulo debe respetar roles y permisos del sistema.

### Permisos sugeridos

* Ver agenda de entregas.
* Ver pedidos en agenda.
* Programar entrega.
* Reprogramar entrega.
* Asignar motorista desde agenda.
* Cambiar rango horario.
* Cancelar programación.
* Ver historial logístico.
* Ver pagos a motorista.
* Exportar agenda.

### Reglas

1. Un usuario sin permiso de ver agenda no debe acceder a la ruta.
2. Un usuario sin permiso de programar no debe confirmar fechas de entrega.
3. Un usuario sin permiso de reprogramar no debe cambiar fechas.
4. Un usuario sin permiso de asignar motorista no debe modificar motorista asignado.
5. Todas las acciones deben validarse en frontend y backend.
6. Todo cambio debe registrar usuario, fecha y comentario.

---

# SECCIÓN A — CONCEPTO OPERATIVO

## 8. Definición de agenda de entregas

La agenda de entregas representa la planificación operativa de pedidos que deben ser llevados al cliente.

Cada entrega debe estar asociada a un pedido. No debe existir una entrega sin pedido.

### Una entrega debe contener:

* Pedido.
* Cliente.
* Dirección.
* Fecha sugerida por cliente.
* Fecha confirmada por admin.
* Rango horario.
* Estado de entrega.
* Motorista asignado.
* Pago definido para motorista.
* Historial de programación.
* Motivos de reprogramación.
* Comentarios internos.

---

## 9. Diferencia entre pedido y entrega

El sistema debe separar claramente:

### Pedido

Representa la compra solicitada por el cliente.

Incluye:

* Productos.
* Total.
* Cliente.
* Método de pago.
* Estado comercial del pedido.

### Entrega

Representa la visita logística para llevar el pedido.

Incluye:

* Fecha.
* Horario.
* Dirección.
* Motorista.
* Estado logístico.
* Pago al motorista.
* Resultado de entrega.

---

## 10. Regla principal de fecha

La entrega no puede programarse para el mismo día en que el cliente solicitó el pedido.

### Ejemplo

```txt
Fecha de solicitud: 26/06/2026
Primera fecha permitida de entrega: 27/06/2026
```

### Regla técnica

```txt
fecha_confirmada_entrega > fecha_solicitud
```

No debe permitirse:

```txt
fecha_confirmada_entrega = fecha_solicitud
```

---

## 11. Fecha sugerida vs fecha confirmada

### Fecha sugerida

Es la fecha que el cliente selecciona desde la PWA Cliente.

### Fecha confirmada

Es la fecha final definida por el administrador según disponibilidad.

### Reglas

1. La fecha sugerida no es obligatoria para la empresa.
2. La fecha sugerida debe guardarse para referencia.
3. La fecha confirmada debe ser definida por el admin.
4. La fecha confirmada puede ser igual a la sugerida si hay disponibilidad.
5. La fecha confirmada puede ser distinta si se reprograma.
6. Todo cambio debe quedar en historial.
7. El cliente debe ser notificado cuando su entrega sea confirmada o reprogramada.

---

# SECCIÓN B — PANTALLA PRINCIPAL DE AGENDA

## 12. Pantalla: Agenda de entregas

### Ruta

```txt
/admin/tienda/agenda-entregas
```

### Objetivo

Permitir al administrador visualizar, organizar y gestionar las entregas de pedidos.

### Estructura sugerida

La pantalla debe incluir:

1. Encabezado.
2. Cards de resumen.
3. Filtros.
4. Selector de vista.
5. Vista de agenda.
6. Tabla/listado de entregas.
7. Acciones rápidas.
8. Modales de programación y reprogramación.

---

## 13. Encabezado de pantalla

### Título

```txt
Agenda de entregas
```

### Subtítulo sugerido

```txt
Programa y controla las entregas de pedidos según disponibilidad operativa.
```

### Acciones superiores

* Exportar agenda.
* Ver pendientes de programación.
* Limpiar filtros.

No debe existir botón de **Nueva entrega** independiente, porque toda entrega debe originarse desde un pedido.

---

## 14. Cards de resumen

La pantalla debe mostrar cards compactas.

### Cards sugeridas

1. **Pendientes de programación**
2. **Programadas hoy**
3. **Programadas mañana**
4. **Reprogramadas**
5. **Asignadas a motorista**
6. **En ruta**
7. **Entregadas**
8. **No entregadas**
9. **Canceladas**

### Reglas

1. Las cards deben ser compactas.
2. Deben poder funcionar como filtros rápidos.
3. Si son muchas, usar scroll horizontal.
4. No deben saturar la pantalla.
5. Los títulos deben ir en negrita.
6. El número debe ser visible.
7. Deben respetar el diseño administrativo actual.

---

## 15. Filtros de agenda

### Filtros requeridos

* Fecha de entrega.
* Rango de fechas.
* Estado de entrega.
* Estado del pedido.
* Motorista.
* Marca.
* Cliente.
* Pedido.
* Zona.
* Municipio.
* Pedidos sin motorista.
* Pedidos pendientes de programación.
* Pedidos reprogramados.

### Búsqueda general

Debe buscar por:

* Número de pedido.
* Nombre de cliente.
* Teléfono.
* Marca.
* Producto.
* Motorista.
* Dirección.
* Zona.

### Reglas

1. Los filtros deben ser compactos.
2. Deben poder combinarse.
3. Debe existir opción de limpiar filtros.
4. La búsqueda debe funcionar por coincidencia parcial.
5. La agenda debe actualizarse sin recargar toda la pantalla.
6. En desktop puede usar filtros horizontales.
7. En móvil o pantallas pequeñas puede agruparse en botón de filtros.

---

## 16. Selector de vista

La agenda debe permitir cambiar entre diferentes formas de visualización.

### Vistas sugeridas

1. **Listado**
2. **Día**
3. **Semana**
4. **Calendario**, opcional para fase posterior.

### Vista recomendada para primera fase

Usar:

* Listado.
* Día.
* Semana.

El calendario completo puede dejarse para una fase posterior si complica el desarrollo.

---

# SECCIÓN C — VISTA LISTADO

## 17. Vista listado

### Objetivo

Mostrar entregas en formato de tabla compacta para operación diaria.

### Columnas sugeridas

* Número de pedido.
* Cliente.
* Teléfono.
* Dirección resumida.
* Zona.
* Fecha sugerida.
* Fecha confirmada.
* Rango horario.
* Estado de entrega.
* Motorista.
* Pago motorista.
* Total pedido.
* Acciones.

### Reglas

1. La tabla debe tener paginación.
2. La paginación sugerida es de 10 registros por página.
3. Los estados deben mostrarse como badges.
4. El total del pedido debe mostrarse en quetzales.
5. El pago al motorista debe mostrarse en quetzales.
6. Si no hay motorista, mostrar **Sin asignar**.
7. Si no hay fecha confirmada, mostrar **Pendiente de programación**.
8. Las acciones deben ser compactas.

---

## 18. Acciones desde listado

### Acciones sugeridas

* Ver pedido.
* Programar entrega.
* Reprogramar.
* Asignar motorista.
* Cambiar motorista.
* Marcar incidencia.
* Cancelar programación.
* Ver historial.

### Reglas

1. **Programar entrega** solo debe estar disponible si el pedido no tiene fecha confirmada.
2. **Reprogramar** solo debe estar disponible si no está entregado, cancelado o finalizado.
3. **Asignar motorista** solo debe estar disponible si el pedido está confirmado o en preparación.
4. **Cambiar motorista** debe bloquearse si la entrega ya fue entregada.
5. **Cancelar programación** no debe cancelar necesariamente el pedido completo; solo debe quitar la programación, si la política lo permite.
6. **Ver pedido** debe redirigir al detalle del pedido.

---

# SECCIÓN D — VISTA DÍA

## 19. Vista día

### Objetivo

Permitir al administrador ver todas las entregas programadas para una fecha específica.

### Información a mostrar

* Fecha seleccionada.
* Total entregas del día.
* Entregas por rango horario.
* Motoristas asignados.
* Entregas sin motorista.
* Entregas en ruta.
* Entregas entregadas.
* Entregas no entregadas.

### Agrupación sugerida

```txt
Fecha: 27/06/2026

09:00 a 12:00
  - PED-2026-000001 | Cliente | Zona 10 | Motorista A

12:00 a 15:00
  - PED-2026-000002 | Cliente | Zona 15 | Sin asignar

15:00 a 18:00
  - PED-2026-000003 | Cliente | Zona 1 | Motorista B
```

---

## 20. Reglas de vista día

1. Debe permitir cambiar de fecha.
2. Debe mostrar entregas programadas para esa fecha.
3. Debe resaltar entregas sin motorista.
4. Debe resaltar entregas en ruta.
5. Debe resaltar entregas no entregadas.
6. Debe mostrar resumen del día.
7. Debe permitir acciones rápidas por pedido.
8. No debe mostrar entregas canceladas por defecto, salvo que el filtro lo indique.

---

# SECCIÓN E — VISTA SEMANA

## 21. Vista semana

### Objetivo

Permitir visualizar carga operativa por semana.

### Información a mostrar

Por día:

* Total de entregas.
* Entregas pendientes de motorista.
* Entregas confirmadas.
* Entregas en ruta.
* Entregas completadas.
* Entregas con incidencia.

### Ejemplo visual

```txt
Lunes 29/06
8 entregas | 2 sin motorista | 5 programadas | 1 entregada

Martes 30/06
12 entregas | 4 sin motorista | 8 programadas

Miércoles 01/07
6 entregas | 1 reprogramada
```

### Reglas

1. Debe permitir avanzar y retroceder semanas.
2. Debe permitir seleccionar un día para ver detalle.
3. Debe mostrar carga operativa de forma compacta.
4. Debe ayudar a decidir disponibilidad antes de reprogramar.
5. No requiere arrastrar y soltar en primera fase.

---

# SECCIÓN F — PROGRAMAR ENTREGA

## 22. Acción: Programar entrega

### Objetivo

Permitir al administrador confirmar una fecha de entrega para un pedido pendiente de programación.

### Disponible cuando

El pedido está en estados:

```txt
PEDIDO_SOLICITADO
EN_REVISION
CONFIRMADO_ADMIN
REPROGRAMADO
PREPARANDO_PEDIDO
```

Y la entrega está en estado:

```txt
PENDIENTE_PROGRAMACION
REPROGRAMADA
```

### No disponible cuando

```txt
EN_RUTA
ENTREGADO
NO_ENTREGADO
CANCELADO
```

---

## 23. Modal: Programar entrega

### Campos requeridos

* Fecha confirmada de entrega.
* Rango horario.
* Comentario interno, opcional.

### Campos opcionales

* Motorista.
* Pago al motorista.
* Comentario visible para cliente.

### Recomendación

La programación puede permitir fecha y rango horario sin motorista. Sin embargo, si se asigna motorista desde el mismo modal, debe exigirse el monto a pagar al motorista.

---

## 24. Información visible en el modal

El modal debe mostrar:

* Número de pedido.
* Cliente.
* Teléfono.
* Dirección.
* Fecha sugerida por cliente.
* Total del pedido.
* Estado actual.
* Productos resumidos.
* Alerta si la fecha seleccionada no coincide con la sugerida.

### Texto sugerido

```txt
Programar entrega

Confirma la fecha y rango horario en que se realizará la visita de entrega. La entrega no puede programarse para el mismo día de solicitud del pedido.
```

---

## 25. Reglas para programar entrega

1. La fecha confirmada debe ser obligatoria.
2. El rango horario debe ser obligatorio.
3. La fecha confirmada no puede ser el mismo día de solicitud.
4. La fecha confirmada no puede ser anterior a la fecha actual.
5. El pedido no debe estar cancelado.
6. El pedido no debe estar entregado.
7. El pedido debe estar confirmado o en proceso de revisión, según política.
8. Si el pedido aún no está confirmado, programar puede cambiarlo a **En revisión** o requerir confirmación previa.
9. El sistema debe registrar timeline.
10. El sistema debe notificar al cliente.
11. El sistema debe guardar usuario que programó.
12. La fecha sugerida original no debe sobrescribirse.
13. La fecha confirmada debe guardarse en campo separado.

---

## 26. Rango horario

### Rangos sugeridos

```txt
09:00 a 12:00
12:00 a 15:00
15:00 a 18:00
```

### Reglas

1. Los rangos deben ser configurables en fase futura.
2. En primera fase pueden manejarse como catálogo fijo.
3. El rango debe mostrarse al cliente.
4. El rango debe mostrarse al motorista.
5. El rango debe mostrarse en la agenda.
6. Debe guardarse como snapshot en el pedido.

---

## 27. Estado posterior a programación

Al programar una entrega, el sistema debe actualizar:

```txt
estado_entrega = PROGRAMADA
```

Si el pedido ya estaba confirmado:

```txt
estado_pedido = CONFIRMADO_ADMIN
```

Si el pedido estaba en revisión:

```txt
estado_pedido = EN_REVISION
```

### Recomendación operativa

Lo más ordenado es que la programación formal ocurra después de confirmar el pedido. Sin embargo, el sistema puede permitir reservar fecha mientras está en revisión si la empresa lo necesita.

---

## 28. Notificación al cliente por programación

Mensaje sugerido:

```txt
Tu entrega fue programada para el [fecha] en el horario [rango horario].
```

Si la fecha confirmada es igual a la sugerida:

```txt
Tu entrega fue confirmada para la fecha que seleccionaste.
```

Si la fecha confirmada es diferente:

```txt
Tu entrega fue programada para una fecha distinta según disponibilidad. Revisa el detalle de tu pedido.
```

---

# SECCIÓN G — REPROGRAMAR ENTREGA

## 29. Acción: Reprogramar entrega

### Objetivo

Permitir cambiar una fecha de entrega ya programada.

### Disponible cuando

```txt
PROGRAMADA
REPROGRAMADA
ASIGNADA
```

### No disponible cuando

```txt
EN_RUTA
ENTREGADA
NO_ENTREGADA
CANCELADA
```

Si se desea permitir reprogramar cuando está **En ruta**, debe requerir permiso especial y motivo obligatorio.

---

## 30. Modal: Reprogramar entrega

### Campos requeridos

* Nueva fecha.
* Nuevo rango horario.
* Motivo de reprogramación.

### Campos opcionales

* Comentario interno.
* Comentario visible para cliente.
* Mantener motorista asignado.
* Quitar motorista asignado.
* Cambiar motorista.

### Texto sugerido

```txt
Reprogramar entrega

La entrega será movida a una nueva fecha. El cliente será notificado del cambio.
```

---

## 31. Motivos de reprogramación

Valores sugeridos:

```txt
No hay disponibilidad de motorista
Agenda llena
Producto pendiente de preparación
Cliente solicitó cambio
Cliente no disponible
Dirección requiere validación
Problema operativo
Clima o situación externa
Otro
```

### Reglas

1. El motivo debe ser obligatorio.
2. Si el motivo es **Otro**, el comentario debe ser obligatorio.
3. El motivo puede mostrarse al cliente solo si se marca como visible.
4. Siempre debe guardarse en historial interno.

---

## 32. Reglas para reprogramar

1. La nueva fecha debe ser obligatoria.
2. La nueva fecha no puede ser el mismo día de solicitud original.
3. La nueva fecha no puede ser anterior a la fecha actual.
4. El nuevo rango horario debe ser obligatorio.
5. Debe guardarse fecha anterior.
6. Debe guardarse rango anterior.
7. Debe guardarse nueva fecha.
8. Debe guardarse nuevo rango.
9. Debe guardarse motivo.
10. Debe guardarse usuario que reprogramó.
11. Debe registrarse timeline.
12. Debe notificar al cliente.
13. Si ya existe motorista asignado, el admin debe decidir si lo mantiene o lo quita.
14. Si se quita motorista, el pedido debe volver a estado logístico pendiente de asignación.

---

## 33. Manejo de motorista al reprogramar

Cuando se reprograma una entrega con motorista asignado, el sistema debe mostrar tres opciones:

```txt
Mantener motorista asignado
Cambiar motorista
Quitar motorista y dejar pendiente de asignación
```

### Reglas

1. Si se mantiene motorista, debe seguir asignado a la nueva fecha.
2. Si se cambia motorista, debe registrarse historial.
3. Si se quita motorista, el pedido debe quedar sin motorista asignado.
4. Si se quita motorista, el pago al motorista debe pasar a **No asignado** o recalcularse al asignar otro.
5. Si el motorista ya había iniciado ruta, no debe permitirse reprogramación normal.

---

## 34. Estado posterior a reprogramación

Al reprogramar, el sistema debe actualizar:

```txt
estado_entrega = REPROGRAMADA
estado_pedido = REPROGRAMADO
```

Si mantiene motorista:

```txt
estado_entrega = ASIGNADA
```

según la política del sistema.

### Recomendación

Aunque mantenga motorista, debe conservarse el estado **Reprogramado** en el pedido para claridad histórica, pero en la entrega puede volver a **Asignada** cuando ya tiene motorista confirmado.

---

## 35. Notificación al cliente por reprogramación

Mensaje sugerido:

```txt
Tu entrega fue reprogramada para el [fecha] en el horario [rango horario].
```

Mensaje con motivo visible:

```txt
Tu entrega fue reprogramada por el siguiente motivo: [motivo visible].
```

---

# SECCIÓN H — CANCELAR PROGRAMACIÓN

## 36. Acción: Cancelar programación de entrega

### Objetivo

Permitir quitar una programación de entrega sin necesariamente cancelar el pedido completo.

### Casos donde aplica

* Se programó una fecha incorrecta.
* Se requiere validar dirección.
* Se debe esperar stock.
* Se debe asignar nueva fecha posteriormente.
* El cliente pidió pausar la entrega.

### Importante

Cancelar programación no significa cancelar pedido, salvo que el admin elija cancelar pedido desde el flujo correspondiente.

---

## 37. Modal: Cancelar programación

### Campos requeridos

* Motivo.
* Comentario interno.

### Opcional

* Comentario visible para cliente.

### Botones

```txt
No cancelar
Cancelar programación
```

---

## 38. Reglas de cancelación de programación

1. Solo debe permitirse si el pedido no está entregado.
2. No debe eliminar el pedido.
3. No debe cambiar el estado de pago del cliente.
4. Debe quitar fecha confirmada si la política lo permite.
5. Debe conservar historial de la fecha anterior.
6. Debe cambiar estado de entrega a **Pendiente de programación**.
7. Debe registrar timeline.
8. Debe notificar al cliente si aplica.
9. Si tenía motorista asignado, debe quitar asignación o pedir confirmación.
10. Si se quita motorista, debe actualizar pago al motorista.

---

# SECCIÓN I — CAPACIDAD OPERATIVA

## 39. Capacidad por fecha

### Objetivo

Ayudar al admin a identificar cuántas entregas hay programadas por día.

### Información sugerida

Por fecha:

* Total de entregas programadas.
* Total de motoristas asignados.
* Entregas sin motorista.
* Entregas por rango horario.
* Entregas por zona.
* Entregas completadas.
* Entregas pendientes.

---

## 40. Capacidad máxima por día

### Recomendación

Permitir definir una capacidad máxima de entregas por día en una fase posterior.

### Campos futuros sugeridos

* Fecha.
* Capacidad máxima.
* Capacidad usada.
* Disponible.
* Bloqueado sí/no.
* Comentario.

### Primera fase

En la primera fase puede ser solo informativo, sin bloquear programación.

### Regla opcional

Si se configura capacidad máxima, el sistema debe advertir cuando se supere.

Mensaje sugerido:

```txt
La fecha seleccionada ya alcanzó la capacidad recomendada de entregas.
```

---

## 41. Capacidad por rango horario

### Objetivo

Evitar saturar un mismo rango horario.

### Ejemplo

```txt
09:00 a 12:00 — 8 entregas
12:00 a 15:00 — 5 entregas
15:00 a 18:00 — 3 entregas
```

### Reglas

1. Debe mostrarse conteo por rango.
2. No necesariamente debe bloquear.
3. Puede generar advertencia.
4. Debe ayudar al admin a reprogramar según carga.

---

# SECCIÓN J — ASIGNACIÓN DESDE AGENDA

## 42. Asignar motorista desde agenda

### Objetivo

Permitir que el admin asigne motorista a una entrega directamente desde la agenda.

### Campos requeridos

* Motorista.
* Pago al motorista.
* Comentario interno, opcional.

### Campos visibles de referencia

* Fecha confirmada.
* Rango horario.
* Dirección.
* Zona.
* Total del pedido.

### Reglas

1. El pedido debe tener fecha confirmada.
2. El pedido no debe estar cancelado.
3. El pedido no debe estar entregado.
4. El motorista debe estar activo.
5. El pago al motorista debe ser obligatorio.
6. El pago al motorista debe ser mayor o igual a cero.
7. Al asignar motorista, el estado de entrega debe pasar a **Asignada**.
8. El pedido debe pasar a **Asignado a motorista** si corresponde.
9. El estado de pago al motorista debe pasar a **Pendiente de liquidar**.
10. Debe registrarse timeline.
11. El pedido debe aparecer en la PWA Motorista.

---

## 43. Cambiar motorista desde agenda

### Objetivo

Permitir cambiar el motorista asignado antes de que el pedido esté en ruta.

### Campos requeridos

* Nuevo motorista.
* Motivo del cambio.
* Pago al nuevo motorista.

### Reglas

1. No permitir cambiar motorista si el pedido está entregado.
2. No permitir cambiar motorista si está en ruta, salvo permiso especial.
3. Registrar motorista anterior.
4. Registrar motorista nuevo.
5. Registrar motivo.
6. Actualizar pago al motorista si cambia.
7. Registrar timeline.
8. Notificar al motorista nuevo, si existe notificación interna.
9. Quitar el pedido de la PWA del motorista anterior.

---

# SECCIÓN K — ESTADOS LOGÍSTICOS

## 44. Estados de entrega

Estados sugeridos:

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

### Visualización

```txt
Pendiente de programación
Programada
Reprogramada
Asignada
En ruta
Entregada
No entregada
Cancelada
```

---

## 45. Transiciones permitidas

### Flujo normal

```txt
PENDIENTE_PROGRAMACION
→ PROGRAMADA
→ ASIGNADA
→ EN_RUTA
→ ENTREGADA
```

### Flujo con reprogramación

```txt
PROGRAMADA
→ REPROGRAMADA
→ PROGRAMADA
→ ASIGNADA
```

### Flujo con incidencia

```txt
EN_RUTA
→ NO_ENTREGADA
```

### Flujo cancelado

```txt
PENDIENTE_PROGRAMACION
→ CANCELADA

PROGRAMADA
→ CANCELADA

ASIGNADA
→ CANCELADA
```

---

## 46. Reglas por estado

### Pendiente de programación

Permite:

* Programar entrega.
* Cancelar pedido.
* Ver detalle.

No permite:

* Marcar en ruta.
* Marcar entregado.
* Liquidar motorista.

---

### Programada

Permite:

* Reprogramar.
* Asignar motorista.
* Cancelar programación.
* Cancelar pedido.

No permite:

* Marcar entregado.
* Liquidar motorista.

---

### Asignada

Permite:

* Cambiar motorista.
* Reprogramar.
* Marcar en ruta desde PWA Motorista.
* Cancelar con control.

No permite:

* Liquidar antes de entrega.
* Cambiar fecha sin historial.

---

### En ruta

Permite:

* Marcar entregado desde PWA Motorista.
* Marcar no entregado desde PWA Motorista.
* Ver seguimiento por estado.

No permite:

* Reprogramación normal.
* Cambio normal de motorista.
* Cancelación normal sin incidencia.

---

### Entregada

Permite:

* Ver detalle.
* Ver cobro.
* Liquidar motorista.

No permite:

* Reprogramar.
* Cancelar.
* Cambiar motorista.
* Cambiar fecha.

---

### No entregada

Permite:

* Ver motivo.
* Reprogramar nueva visita, si la empresa lo permite.
* Marcar pago cliente como no cobrado.
* Retener o ajustar pago al motorista según política.

No permite:

* Marcar cobrado si no se recibió efectivo.
* Liquidar normalmente sin revisión, si así se define.

---

# SECCIÓN L — HISTORIAL DE PROGRAMACIÓN

## 47. Historial logístico

Toda programación o cambio de entrega debe guardarse.

### Eventos que deben registrarse

* Fecha programada.
* Fecha reprogramada.
* Programación cancelada.
* Motorista asignado.
* Motorista cambiado.
* Entrega marcada en ruta.
* Entrega marcada entregada.
* Entrega marcada no entregada.
* Comentario interno agregado.
* Incidencia registrada.

---

## 48. Datos del historial

Cada evento debe guardar:

* ID del pedido.
* Tipo de evento.
* Estado anterior.
* Estado nuevo.
* Fecha anterior.
* Fecha nueva.
* Rango anterior.
* Rango nuevo.
* Motorista anterior.
* Motorista nuevo.
* Motivo.
* Comentario.
* Usuario que realizó la acción.
* Rol del usuario.
* Fecha y hora del evento.

---

## 49. Duración por etapa logística

El sistema debe calcular duración entre estados.

### Ejemplo

```txt
Pendiente de programación → Programada: 2 horas
Programada → Asignada: 1 hora
Asignada → En ruta: 18 horas
En ruta → Entregada: 1 hora 20 minutos
```

### Reglas

1. Debe calcularse con base en timeline.
2. Debe verse en admin.
3. Puede alimentar reportes futuros.
4. No debe mostrarse toda la información interna al cliente.
5. Debe conservarse aunque el pedido sea cancelado.

---

# SECCIÓN M — NOTIFICACIONES

## 50. Notificaciones al cliente

El cliente debe ser notificado cuando haya cambios importantes.

### Eventos de notificación

* Entrega programada.
* Entrega reprogramada.
* Motorista asignado, opcional.
* Pedido en ruta.
* Pedido entregado.
* Pedido no entregado.
* Programación cancelada.
* Pedido cancelado.

### Reglas

1. Las notificaciones deben integrarse con el módulo actual de notificaciones de PWA Cliente.
2. No usar WhatsApp.
3. No usar SMS.
4. No usar email obligatorio en esta fase.
5. La notificación debe quedar visible en el centro de notificaciones.
6. Si hay push PWA activo, debe enviarse push.

---

## 51. Mensajes sugeridos

### Entrega programada

```txt
Tu entrega fue programada para el [fecha] en el horario [rango].
```

### Entrega reprogramada

```txt
Tu entrega fue reprogramada para el [fecha] en el horario [rango].
```

### En ruta

```txt
Tu pedido ya salió a entrega.
```

### Entregado

```txt
Tu pedido fue entregado correctamente.
```

### No entregado

```txt
No pudimos completar la entrega de tu pedido. Revisa el detalle para más información.
```

---

# SECCIÓN N — MODELO DE DATOS SUGERIDO

## 52. Tabla: store_delivery_schedule

```txt
id
order_id
suggested_delivery_date
confirmed_delivery_date
delivery_time_range
delivery_status
assigned_driver_id
driver_payment_amount
driver_payment_status
scheduled_by
scheduled_at
rescheduled_by
rescheduled_at
cancelled_by
cancelled_at
cancel_reason
internal_comment
client_visible_comment
created_at
updated_at
```

---

## 53. Tabla: store_delivery_schedule_history

```txt
id
delivery_schedule_id
order_id
event_type
previous_delivery_status
new_delivery_status
previous_delivery_date
new_delivery_date
previous_time_range
new_time_range
previous_driver_id
new_driver_id
previous_driver_payment_amount
new_driver_payment_amount
reason
internal_comment
client_visible_comment
created_by
created_by_role
created_at
```

---

## 54. Tabla: store_delivery_capacity

Opcional para fase futura.

```txt
id
delivery_date
time_range
max_deliveries
is_blocked
comment
created_by
updated_by
created_at
updated_at
```

---

## 55. Campos adicionales en store_orders

La tabla de pedidos debe mantener campos resumidos para consulta rápida.

```txt
confirmed_delivery_date
delivery_time_range
delivery_status
assigned_driver_id
driver_payment_amount
driver_payment_status
```

### Regla

Aunque exista tabla de agenda, el pedido puede guardar datos resumidos para facilitar consultas, siempre que se mantenga consistencia transaccional.

---

# SECCIÓN O — SERVICIOS SUGERIDOS

## 56. Servicios backend

```txt
StoreDeliveryScheduleService
StoreDeliveryProgrammingService
StoreDeliveryRescheduleService
StoreDeliveryAssignmentService
StoreDeliveryCapacityService
StoreDeliveryHistoryService
StoreNotificationService
```

---

## 57. StoreDeliveryScheduleService

Responsabilidades:

* Listar agenda.
* Consultar entregas por fecha.
* Consultar entregas por semana.
* Consultar entregas pendientes.
* Consultar entregas por motorista.
* Consultar detalle logístico del pedido.

---

## 58. StoreDeliveryProgrammingService

Responsabilidades:

* Programar entrega.
* Validar fecha.
* Validar rango horario.
* Actualizar pedido.
* Actualizar estado de entrega.
* Registrar historial.
* Notificar cliente.

---

## 59. StoreDeliveryRescheduleService

Responsabilidades:

* Reprogramar entrega.
* Validar motivo.
* Guardar fecha anterior y nueva.
* Manejar motorista existente.
* Registrar historial.
* Notificar cliente.

---

## 60. StoreDeliveryAssignmentService

Responsabilidades:

* Asignar motorista.
* Cambiar motorista.
* Validar motorista activo.
* Validar pago al motorista.
* Actualizar estados.
* Registrar historial.

---

## 61. StoreDeliveryCapacityService

Responsabilidades:

* Calcular cantidad de entregas por fecha.
* Calcular cantidad por rango horario.
* Alertar sobre saturación.
* Consultar capacidad futura, si se configura.

---

# SECCIÓN P — ENDPOINTS SUGERIDOS

## 62. Listar agenda

```txt
GET /api/admin/store/delivery-schedule
```

### Query params sugeridos

```txt
date
dateFrom
dateTo
view
deliveryStatus
orderStatus
driverId
brandId
clientId
zoneId
municipalityId
withoutDriver
pendingProgramming
search
page
limit
```

---

## 63. Ver detalle logístico

```txt
GET /api/admin/store/delivery-schedule/orders/:orderId
```

---

## 64. Programar entrega

```txt
POST /api/admin/store/delivery-schedule/orders/:orderId/program
```

### Request

```json
{
  "confirmedDeliveryDate": "2026-06-27",
  "deliveryTimeRange": "09:00 a 12:00",
  "internalComment": "Entrega programada según disponibilidad.",
  "clientVisibleComment": "Entrega confirmada."
}
```

---

## 65. Reprogramar entrega

```txt
POST /api/admin/store/delivery-schedule/orders/:orderId/reschedule
```

### Request

```json
{
  "newDeliveryDate": "2026-06-28",
  "newTimeRange": "12:00 a 15:00",
  "reason": "No hay disponibilidad de motorista",
  "internalComment": "Se mueve por agenda llena.",
  "clientVisibleComment": "La entrega fue movida por disponibilidad.",
  "driverAction": "REMOVE_DRIVER"
}
```

### driverAction sugeridos

```txt
KEEP_DRIVER
CHANGE_DRIVER
REMOVE_DRIVER
```

---

## 66. Cancelar programación

```txt
POST /api/admin/store/delivery-schedule/orders/:orderId/cancel-schedule
```

### Request

```json
{
  "reason": "Dirección requiere validación",
  "internalComment": "Pendiente confirmar referencia exacta.",
  "clientVisibleComment": "Estamos validando los datos de entrega."
}
```

---

## 67. Asignar motorista desde agenda

```txt
POST /api/admin/store/delivery-schedule/orders/:orderId/assign-driver
```

### Request

```json
{
  "driverId": "driver_123",
  "driverPaymentAmount": 25.00,
  "internalComment": "Asignado por disponibilidad de zona."
}
```

---

## 68. Cambiar motorista desde agenda

```txt
POST /api/admin/store/delivery-schedule/orders/:orderId/change-driver
```

### Request

```json
{
  "newDriverId": "driver_456",
  "driverPaymentAmount": 30.00,
  "reason": "Motorista anterior no disponible",
  "internalComment": "Cambio realizado antes de iniciar ruta."
}
```

---

## 69. Consultar capacidad por fecha

```txt
GET /api/admin/store/delivery-schedule/capacity
```

### Query params

```txt
date
dateFrom
dateTo
timeRange
```

---

# SECCIÓN Q — COMPONENTES FRONTEND

## 70. Componentes sugeridos

```txt
DeliverySchedulePage.tsx
DeliverySummaryCards.tsx
DeliveryFilters.tsx
DeliveryViewSelector.tsx
DeliveryListView.tsx
DeliveryDayView.tsx
DeliveryWeekView.tsx
DeliveryOrderCard.tsx
DeliveryStatusBadge.tsx
DeliveryDriverBadge.tsx
DeliveryCapacityIndicator.tsx
ProgramDeliveryModal.tsx
RescheduleDeliveryModal.tsx
CancelDeliveryScheduleModal.tsx
AssignDriverFromScheduleModal.tsx
ChangeDriverModal.tsx
DeliveryHistoryModal.tsx
```

---

## 71. Estructura sugerida de archivos

```txt
app/
  admin/
    tienda/
      agenda-entregas/
        page.tsx
        dia/
          [fecha]/
            page.tsx
        pedido/
          [pedidoId]/
            page.tsx
        components/
          DeliverySummaryCards.tsx
          DeliveryFilters.tsx
          DeliveryViewSelector.tsx
          DeliveryListView.tsx
          DeliveryDayView.tsx
          DeliveryWeekView.tsx
          DeliveryOrderCard.tsx
          DeliveryStatusBadge.tsx
          DeliveryDriverBadge.tsx
          DeliveryCapacityIndicator.tsx
          ProgramDeliveryModal.tsx
          RescheduleDeliveryModal.tsx
          CancelDeliveryScheduleModal.tsx
          AssignDriverFromScheduleModal.tsx
          ChangeDriverModal.tsx
          DeliveryHistoryModal.tsx

lib/
  services/
    store/
      storeDeliveryScheduleService.ts
      storeDeliveryProgrammingService.ts
      storeDeliveryRescheduleService.ts
      storeDeliveryAssignmentService.ts
      storeDeliveryCapacityService.ts
      storeDeliveryHistoryService.ts

types/
  store/
    deliverySchedule.ts
    deliveryHistory.ts
    deliveryCapacity.ts
```

---

# SECCIÓN R — DISEÑO VISUAL

## 72. Consideraciones de diseño

1. La agenda debe ser compacta.
2. Los filtros no deben ser robustos.
3. Los botones deben ser pequeños y claros.
4. Las entregas deben usar badges de estado.
5. Las entregas sin motorista deben resaltarse visualmente.
6. Las entregas vencidas o atrasadas deben resaltarse.
7. La vista día debe ser fácil de leer.
8. La vista semana debe mostrar carga operativa sin saturar.
9. Los modales deben aparecer centrados.
10. El fondo debe quedar bloqueado cuando haya modal.
11. Las acciones críticas deben pedir confirmación.
12. Los títulos deben ir en negrita.
13. El pago al motorista debe ser visible solo para admin.
14. El diseño debe mantener la línea gráfica del sistema.

---

## 73. Badges sugeridos

### Estados de entrega

```txt
Pendiente de programación
Programada
Reprogramada
Asignada
En ruta
Entregada
No entregada
Cancelada
```

### Estados adicionales visuales

```txt
Sin motorista
Con motorista
Agenda llena
Fecha vencida
Requiere atención
```

---

# SECCIÓN S — CASOS DE USO

## 74. Caso de uso 1: Admin consulta agenda del día

1. Admin ingresa a Tienda > Agenda de entregas.
2. Selecciona vista Día.
3. Elige una fecha.
4. El sistema muestra entregas programadas para esa fecha.

### Resultado esperado

El admin puede ver la carga operativa del día.

---

## 75. Caso de uso 2: Admin programa entrega

1. Admin abre pedido pendiente de programación.
2. Presiona **Programar entrega**.
3. Selecciona fecha y rango horario.
4. Guarda programación.
5. El sistema actualiza estados.
6. El sistema notifica al cliente.

### Resultado esperado

La entrega queda programada con fecha confirmada.

---

## 76. Caso de uso 3: Admin reprograma entrega

1. Admin selecciona entrega programada.
2. Presiona **Reprogramar**.
3. Ingresa nueva fecha, rango y motivo.
4. Guarda cambios.
5. El sistema registra historial.
6. El cliente recibe notificación.

### Resultado esperado

La entrega cambia de fecha y conserva historial.

---

## 77. Caso de uso 4: Admin asigna motorista desde agenda

1. Admin identifica una entrega programada sin motorista.
2. Presiona **Asignar motorista**.
3. Selecciona motorista.
4. Ingresa pago al motorista.
5. Guarda.
6. El sistema actualiza el pedido y la entrega.

### Resultado esperado

La entrega queda asignada a motorista y aparece en la PWA Motorista.

---

## 78. Caso de uso 5: Admin cambia motorista

1. Admin abre una entrega asignada.
2. Presiona **Cambiar motorista**.
3. Selecciona nuevo motorista.
4. Ingresa motivo.
5. Confirma cambio.
6. El sistema registra historial.

### Resultado esperado

El nuevo motorista queda asignado y el anterior deja de ver el pedido.

---

## 79. Caso de uso 6: Admin cancela programación sin cancelar pedido

1. Admin abre entrega programada.
2. Presiona **Cancelar programación**.
3. Ingresa motivo.
4. Confirma acción.
5. El pedido queda pendiente de programación.

### Resultado esperado

El pedido sigue activo, pero sin fecha confirmada de entrega.

---

# SECCIÓN T — CRITERIOS DE ACEPTACIÓN

## 80. Criterios funcionales

1. Debe existir opción **Agenda de entregas** dentro del menú Tienda.
2. La agenda debe mostrar pedidos pendientes de programación.
3. La agenda debe mostrar pedidos programados.
4. La agenda debe mostrar pedidos reprogramados.
5. La agenda debe mostrar pedidos asignados a motorista.
6. La agenda debe mostrar pedidos en ruta.
7. La agenda debe mostrar pedidos entregados.
8. La agenda debe mostrar pedidos no entregados.
9. La agenda debe permitir filtrar por fecha.
10. La agenda debe permitir filtrar por rango de fechas.
11. La agenda debe permitir filtrar por estado de entrega.
12. La agenda debe permitir filtrar por motorista.
13. La agenda debe permitir filtrar por marca.
14. La agenda debe permitir búsqueda general.
15. La agenda debe tener vista listado.
16. La agenda debe tener vista día.
17. La agenda debe tener vista semana.
18. El admin debe poder programar una entrega.
19. La programación debe exigir fecha confirmada.
20. La programación debe exigir rango horario.
21. La fecha confirmada no puede ser el mismo día de solicitud.
22. La fecha confirmada no puede ser anterior a la fecha actual.
23. El sistema debe conservar la fecha sugerida por el cliente.
24. El sistema debe guardar la fecha confirmada separada de la sugerida.
25. El admin debe poder reprogramar entrega.
26. La reprogramación debe exigir motivo.
27. La reprogramación debe guardar fecha anterior y nueva.
28. La reprogramación debe guardar rango anterior y nuevo.
29. El admin debe decidir qué hacer con el motorista asignado al reprogramar.
30. El sistema debe notificar al cliente al programar.
31. El sistema debe notificar al cliente al reprogramar.
32. El admin debe poder cancelar una programación sin cancelar el pedido.
33. Cancelar programación debe registrar motivo.
34. Cancelar programación debe cambiar estado a pendiente de programación.
35. La agenda debe permitir asignar motorista.
36. Asignar motorista debe exigir pago al motorista.
37. El pago al motorista debe ser definido manualmente por admin.
38. El pago al motorista debe mostrarse solo en admin.
39. La agenda debe permitir cambiar motorista antes de ruta.
40. Cambiar motorista debe exigir motivo.
41. El sistema debe registrar historial de cada cambio logístico.
42. El sistema debe calcular duración por etapa.
43. El sistema no debe usar ubicación en tiempo real.
44. El seguimiento debe ser por estados.
45. Los permisos deben validarse en frontend y backend.
46. Los modales deben estar centrados y bloquear fondo.
47. El diseño debe ser compacto.
48. Cada pantalla debe tener ruta propia.
49. Cada componente debe estar separado por responsabilidad.
50. El pedido entregado no debe permitir reprogramación normal.
51. El pedido cancelado no debe permitir programación.
52. El pedido sin fecha confirmada debe mostrarse como pendiente de programación.
53. El pedido sin motorista debe resaltarse visualmente.
54. El pedido en ruta no debe permitir cambio normal de motorista.
55. El sistema debe conservar auditoría completa.

---

## 81. Resultado esperado del FRD

Al finalizar este desarrollo, la plataforma administrativa contará con una **Agenda de Entregas** que permitirá organizar las visitas de entrega de pedidos, confirmar fechas, manejar rangos horarios, reprogramar por disponibilidad, asignar motoristas y consultar la carga operativa diaria o semanal.

El módulo permitirá operar entregas sin ubicación en tiempo real, usando estados, trazabilidad, historial y control administrativo. Además, dejará lista la integración con los siguientes módulos: **Motoristas**, **PWA Motorista** y **Liquidación de Motoristas**.
