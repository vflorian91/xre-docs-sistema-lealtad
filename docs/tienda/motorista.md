# FRD 06 — Motoristas

## 1. Información general del requerimiento

### Nombre del módulo

Motoristas

### Plataforma

Web Administrador

### Tipo de módulo

Módulo administrativo para registrar, consultar, editar, activar, inactivar y gestionar motoristas que serán asignados a entregas de pedidos de la tienda.

### Objetivo general

Permitir que la empresa administre los motoristas responsables de realizar entregas de pedidos solicitados desde la tienda de la PWA Cliente, controlando su información general, estado operativo, disponibilidad, asignaciones y pagos definidos manualmente por el administrador.

El módulo debe permitir que la empresa trabaje con varios motoristas y pueda asignar cada pedido a un motorista específico, indicando cuánto se le pagará por cada entrega.

---

## 2. Contexto funcional

La empresa opera una tienda dentro de la app de clientes y se encarga directamente de las entregas de productos de varias marcas.

Los clientes realizan pedidos desde la PWA Cliente y pagan únicamente en efectivo contra entrega. Luego, desde la plataforma administrativa, la empresa confirma o reprograma la entrega y asigna un motorista para realizarla.

El motorista no tendrá seguimiento por ubicación en tiempo real. Su participación será mediante estados, como:

* Asignado.
* En ruta.
* Entregado.
* No entregado.

Este módulo administra a los motoristas que posteriormente usarán la PWA Motorista.

---

## 3. Alcance del FRD

Este FRD contempla:

* Tabla administrativa de motoristas.
* Creación de motorista.
* Edición de motorista.
* Vista detalle de motorista.
* Activación e inactivación de motorista.
* Datos personales y de contacto.
* Tipo de motorista: interno o externo.
* Estado operativo.
* Cobertura o zona sugerida, si aplica.
* Pago estándar por entrega, opcional.
* Historial de pedidos asignados.
* Resumen de desempeño.
* Validaciones.
* Permisos.
* Modelo de datos sugerido.
* Endpoints.
* Servicios.
* Estructura técnica sugerida.
* Criterios de aceptación.

---

## 4. Fuera de alcance

Este FRD no contempla:

* PWA Motorista.
* Cambio de estados desde motorista.
* Confirmación de cobro por motorista.
* Liquidación final de pagos.
* Reportes avanzados.
* Geolocalización en tiempo real.
* Mapa de rutas.
* Optimización automática de recorridos.
* Integración con GPS.
* Cálculo automático de distancia.
* Nómina formal de empleados.

La PWA Motorista y la liquidación se documentarán en FRD separados.

---

## 5. Ubicación en menú

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
/admin/tienda/motoristas
```

---

## 6. Rutas sugeridas

```txt
/admin/tienda/motoristas
/admin/tienda/motoristas/nuevo
/admin/tienda/motoristas/[motoristaId]
/admin/tienda/motoristas/[motoristaId]/editar
/admin/tienda/motoristas/[motoristaId]/historial
```

Cada pantalla debe tener su propia ruta y archivo independiente.

---

## 7. Permisos del módulo

El módulo debe respetar la lógica de roles y permisos del sistema.

### Permisos sugeridos

* Ver motoristas.
* Ver detalle de motorista.
* Crear motorista.
* Editar motorista.
* Activar/inactivar motorista.
* Ver historial de entregas.
* Ver pagos asociados.
* Asignar pedidos a motorista.
* Cambiar motorista asignado.
* Exportar motoristas.

### Reglas

1. Un usuario sin permiso de ver motoristas no debe acceder al listado.
2. Un usuario sin permiso de crear no debe ver el botón **Nuevo motorista**.
3. Un usuario sin permiso de editar no debe poder modificar datos.
4. Un usuario sin permiso de activar/inactivar no debe ver el switch de estado.
5. Un usuario sin permiso de ver pagos no debe ver montos pagados o pendientes.
6. Todas las validaciones de permisos deben aplicarse en frontend y backend.
7. Toda acción debe registrar usuario, fecha y hora.

---

# SECCIÓN A — TABLA DE MOTORISTAS

## 8. Pantalla: Tabla de motoristas

### Ruta

```txt
/admin/tienda/motoristas
```

### Objetivo

Permitir al administrador consultar y gestionar los motoristas registrados.

### Encabezado

Título:

```txt
Motoristas
```

Subtítulo sugerido:

```txt
Administra los motoristas disponibles para la entrega de pedidos.
```

Botón principal:

```txt
Nuevo motorista
```

El botón debe ubicarse en la parte superior derecha, alineado al encabezado.

---

## 9. Cards de resumen

La pantalla debe mostrar cards compactas.

### Cards sugeridas

1. **Total motoristas**
2. **Activos**
3. **Inactivos**
4. **Con entregas asignadas**
5. **En ruta**
6. **Entregas pendientes**
7. **Entregas completadas**
8. **Pagos pendientes**

### Reglas

1. Las cards deben ser compactas.
2. Pueden funcionar como filtros rápidos.
3. No deben saturar la pantalla.
4. Los títulos deben ir en negrita.
5. Los valores deben ser claros.
6. Si hay muchas cards, usar scroll horizontal o dos filas compactas.

---

## 10. Filtros de motoristas

### Filtros requeridos

* Búsqueda general.
* Estado.
* Tipo de motorista.
* Disponibilidad.
* Zona o cobertura.
* Con entregas pendientes.
* Con pagos pendientes.

### Búsqueda general

Debe buscar por:

* Nombre.
* Teléfono.
* Correo.
* DPI, si existe.
* Código interno.
* Zona o cobertura.

### Valores de estado

```txt
Todos
Activos
Inactivos
```

### Valores de tipo

```txt
Todos
Interno
Externo
```

### Reglas

1. Los filtros deben ser compactos.
2. La búsqueda debe funcionar por coincidencia parcial.
3. Los filtros deben poder combinarse.
4. Debe existir opción para limpiar filtros.
5. La tabla debe actualizarse sin recargar toda la pantalla.
6. La tabla debe tener paginación.

---

## 11. Columnas de tabla

La tabla de motoristas debe mostrar:

* Nombre.
* Teléfono.
* Tipo.
* Estado.
* Zona/cobertura.
* Entregas asignadas.
* Entregas completadas.
* Pagos pendientes.
* Fecha de registro.
* Acciones.

### Acciones por registro

* Ver.
* Editar.
* Activar/inactivar.
* Ver historial.
* Ver entregas asignadas.

### Reglas

1. La tabla debe tener paginación de 10 registros por página.
2. Los estados deben mostrarse con badge o switch.
3. Los botones de acción deben ser compactos.
4. El pago pendiente solo debe verse si el usuario tiene permiso.
5. Si el motorista está inactivo, debe mostrarse visualmente.

---

# SECCIÓN B — CREAR MOTORISTA

## 12. Pantalla: Crear motorista

### Ruta

```txt
/admin/tienda/motoristas/nuevo
```

### Objetivo

Permitir registrar un nuevo motorista para futuras asignaciones de entrega.

### Estructura visual sugerida

La pantalla debe dividirse en secciones:

1. Información general.
2. Contacto.
3. Configuración operativa.
4. Pago referencial.
5. Acceso a PWA Motorista, si aplica.
6. Estado.

---

## 13. Campos de información general

### Campos requeridos

* Nombre completo.
* Teléfono.
* Tipo de motorista.
* Estado.

### Campos opcionales

* Código interno.
* DPI.
* Correo electrónico.
* Dirección.
* Observación interna.

---

## 14. Campo: Nombre completo

Tipo: texto.
Obligatorio: sí.

### Reglas

1. No puede estar vacío.
2. Debe eliminar espacios al inicio y final.
3. Debe permitir nombres y apellidos.
4. Debe mostrarse en admin.
5. Puede mostrarse en PWA Motorista.
6. Puede mostrarse al cliente solo si la empresa lo autoriza.

---

## 15. Campo: Código interno

Tipo: texto.
Obligatorio: opcional.

### Uso

Permite identificar internamente al motorista.

### Reglas

1. Si se usa, debe ser único.
2. Puede generarse automáticamente.
3. No debe ser obligatorio para operar.
4. Debe permitir letras, números y guiones.

### Ejemplo

```txt
MOT-001
MOT-002
```

---

## 16. Campo: Teléfono

Tipo: texto numérico.
Obligatorio: sí.

### Reglas

1. Debe permitir únicamente 8 dígitos para Guatemala.
2. Si el usuario ingresa espacios, deben eliminarse automáticamente.
3. No debe permitir letras.
4. Debe validarse en frontend y backend.
5. Puede usarse para contacto operativo.
6. No debe duplicarse si se decide que cada motorista debe tener teléfono único.

---

## 17. Campo: DPI

Tipo: texto.
Obligatorio: opcional.

### Reglas

1. No debe ser obligatorio en primera fase.
2. Si se ingresa, debe validar longitud razonable.
3. Debe almacenarse como dato interno.
4. No debe mostrarse al cliente.
5. Solo usuarios autorizados deben verlo.

---

## 18. Campo: Correo electrónico

Tipo: email.
Obligatorio: opcional, salvo que se use para login.

### Reglas

1. Si se usa para acceso a PWA Motorista, debe ser obligatorio.
2. Debe validar formato de correo.
3. Debe ser único si funciona como usuario de acceso.
4. Si no habrá login por correo, puede quedar opcional.

---

## 19. Campo: Tipo de motorista

Tipo: selector.
Obligatorio: sí.

### Valores

```txt
Interno
Externo
```

### Definición

#### Interno

Motorista perteneciente o administrado directamente por la empresa.

#### Externo

Motorista contratado o utilizado de forma externa por servicio, ruta o pedido.

### Reglas

1. Debe ser obligatorio.
2. Puede usarse posteriormente para reportes.
3. No debe afectar la posibilidad de asignarle pedidos.
4. Puede influir en el pago estándar, si la empresa lo define.

---

## 20. Campo: Zona o cobertura

Tipo: selector, multiselect o texto.
Obligatorio: opcional.

### Objetivo

Permitir identificar zonas donde el motorista suele operar.

### Reglas

1. Puede asociarse a zonas del catálogo existente.
2. Debe permitir una o varias zonas, si se implementa multiselect.
3. No debe bloquear asignación en primera fase.
4. Puede funcionar como referencia para el admin.
5. En fase futura puede validar disponibilidad o cobertura.

### Ejemplo

```txt
Zona 10
Zona 11
Mixco
Carretera a El Salvador
```

---

## 21. Campo: Pago estándar por entrega

Tipo: moneda.
Obligatorio: opcional.

### Objetivo

Registrar un valor referencial de pago para el motorista.

### Reglas

1. El pago estándar no debe aplicarse obligatoriamente.
2. El admin debe poder modificar el pago por pedido.
3. Si existe pago estándar, puede precargar el campo al asignar motorista.
4. El monto debe ser mayor o igual a cero.
5. Debe mostrarse en quetzales.
6. No debe mostrarse al cliente.

### Ejemplo

```txt
Q25.00
```

---

## 22. Campo: Estado

Tipo: switch o checkbox.

### Valores

```txt
Activo
Inactivo
```

### Reglas

1. Un motorista nuevo debe nacer activo por defecto.
2. Un motorista inactivo no debe poder asignarse a nuevos pedidos.
3. Inactivar motorista no debe eliminar historial.
4. Si tiene entregas activas, el sistema debe advertir antes de inactivarlo.
5. Inactivar no debe eliminar acceso histórico.
6. Si tiene acceso a PWA Motorista, debe bloquear su acceso al inactivarlo.

---

## 23. Campo: Observación interna

Tipo: textarea.
Obligatorio: opcional.

### Uso

Permite registrar comentarios administrativos sobre el motorista.

### Reglas

1. No debe mostrarse al cliente.
2. No debe mostrarse al motorista, salvo que se decida.
3. Debe quedar visible solo en admin.
4. Debe permitir comentarios cortos.

---

# SECCIÓN C — EDITAR MOTORISTA

## 24. Pantalla: Editar motorista

### Ruta

```txt
/admin/tienda/motoristas/[motoristaId]/editar
```

### Objetivo

Permitir actualizar la información de un motorista existente.

### Reglas

1. Debe cargar la información actual.
2. Debe permitir editar datos de contacto.
3. Debe permitir cambiar tipo.
4. Debe permitir cambiar cobertura.
5. Debe permitir cambiar pago estándar.
6. Debe permitir activar/inactivar.
7. No debe eliminar historial de entregas.
8. Debe guardar usuario que modificó.
9. Debe guardar fecha de modificación.
10. Debe validar permisos.

---

## 25. Cambio de estado del motorista

### Activar

Al activar un motorista:

1. Puede volver a ser asignado.
2. Puede recuperar acceso a PWA Motorista si tiene usuario.
3. Debe registrar historial.

### Inactivar

Al inactivar un motorista:

1. No puede recibir nuevas asignaciones.
2. Si tiene pedidos asignados no finalizados, debe mostrar advertencia.
3. Debe permitir decidir si se mantiene o se reasignan pedidos.
4. Debe bloquear acceso a PWA Motorista si aplica.
5. Debe registrar historial.

### Mensaje sugerido al inactivar con pedidos activos

```txt
Este motorista tiene entregas pendientes o en ruta. Antes de inactivarlo, revisa si deseas reasignar sus pedidos.
```

---

# SECCIÓN D — VER MOTORISTA

## 26. Pantalla: Detalle de motorista

### Ruta

```txt
/admin/tienda/motoristas/[motoristaId]
```

### Objetivo

Mostrar información completa del motorista y su actividad operativa.

### Secciones sugeridas

1. Encabezado.
2. Información general.
3. Contacto.
4. Configuración operativa.
5. Resumen de entregas.
6. Pagos pendientes.
7. Historial reciente.
8. Acciones.

---

## 27. Encabezado del detalle

Debe mostrar:

* Nombre del motorista.
* Estado.
* Tipo.
* Teléfono.
* Código interno.
* Botones de acción.

### Botones sugeridos

* Editar.
* Activar/inactivar.
* Ver entregas.
* Ver liquidaciones.
* Volver a tabla.

---

## 28. Resumen operativo del motorista

Debe mostrar métricas compactas:

* Entregas asignadas.
* Entregas en ruta.
* Entregas entregadas.
* Entregas no entregadas.
* Pedidos pendientes.
* Monto pendiente de liquidar.
* Monto liquidado, si el usuario tiene permiso.

### Reglas

1. Las métricas deben ser compactas.
2. Los pagos solo deben mostrarse a usuarios autorizados.
3. Debe poder filtrarse por fecha en fase posterior.
4. Debe permitir ver detalle de pedidos asociados.

---

## 29. Historial de entregas del motorista

El detalle debe mostrar un listado reciente de entregas asignadas.

### Columnas sugeridas

* Número de pedido.
* Cliente.
* Fecha de entrega.
* Rango horario.
* Estado de entrega.
* Total del pedido.
* Pago motorista.
* Estado de liquidación.
* Acciones.

### Reglas

1. Debe mostrar solo pedidos asignados a ese motorista.
2. Debe permitir ver pedido.
3. Debe permitir filtrar por estado.
4. Debe permitir filtrar por fecha.
5. El pago al motorista debe respetar permisos.

---

# SECCIÓN E — ASIGNACIÓN A PEDIDOS

## 30. Relación motorista-pedido

Un motorista puede tener muchos pedidos asignados.

Un pedido solo puede tener un motorista asignado activo a la vez.

### Reglas

1. Un pedido puede estar sin motorista.
2. Un pedido puede cambiar de motorista antes de estar en ruta.
3. Un pedido no debe tener dos motoristas activos al mismo tiempo.
4. Si cambia motorista, debe quedar historial del motorista anterior.
5. El motorista anterior debe dejar de ver el pedido en su PWA.
6. El motorista nuevo debe ver el pedido en su PWA.
7. El pago del motorista se define por pedido.

---

## 31. Condiciones para asignar motorista

Un motorista puede ser asignado solo si:

1. Está activo.
2. El pedido está confirmado o en preparación.
3. El pedido tiene fecha confirmada de entrega.
4. El pedido no está cancelado.
5. El pedido no está entregado.
6. El pedido no está en ruta, salvo permiso especial.
7. El admin indica el monto a pagar al motorista.
8. El usuario tiene permiso para asignar.

---

## 32. Pago al motorista en asignación

Al asignar un motorista, el admin debe ingresar:

* Motorista.
* Monto a pagar.
* Comentario interno, opcional.

### Reglas

1. El monto es obligatorio.
2. El monto debe ser mayor o igual a cero.
3. Puede precargarse desde el pago estándar del motorista.
4. El admin puede modificarlo manualmente.
5. Debe guardarse en el pedido.
6. Debe crear estado de pago al motorista **Pendiente de liquidar**.
7. No debe mostrarse al cliente.
8. Debe mostrarse en liquidaciones.

---

## 33. Cambio de motorista asignado

### Disponible cuando

El pedido está en:

```txt
CONFIRMADO_ADMIN
PREPARANDO_PEDIDO
ASIGNADO_MOTORISTA
PROGRAMADA
ASIGNADA
```

### No disponible cuando

```txt
EN_RUTA
ENTREGADO
NO_ENTREGADO
CANCELADO
```

Salvo que el usuario tenga permiso especial.

### Campos requeridos

* Nuevo motorista.
* Nuevo pago al motorista.
* Motivo del cambio.

### Reglas

1. Debe guardar motorista anterior.
2. Debe guardar motorista nuevo.
3. Debe guardar pago anterior.
4. Debe guardar pago nuevo.
5. Debe guardar motivo.
6. Debe registrar timeline.
7. Debe actualizar pedido.
8. Debe actualizar agenda.
9. Debe actualizar visibilidad en PWA Motorista.

---

## 34. Motivos sugeridos de cambio de motorista

```txt
Motorista no disponible.
Cambio por zona.
Cambio por carga operativa.
Error de asignación.
Reprogramación de entrega.
Solicitud administrativa.
Otro.
```

Si selecciona **Otro**, debe solicitar comentario obligatorio.

---

# SECCIÓN F — ACCESO A PWA MOTORISTA

## 35. Usuario de acceso para motorista

El motorista puede requerir usuario para ingresar a la PWA Motorista.

### Opciones de autenticación

#### Opción recomendada

Correo electrónico y contraseña.

#### Alternativa

Teléfono y contraseña.

### Recomendación

Usar correo y contraseña si el sistema ya maneja autenticación similar en cliente o admin.

---

## 36. Campos de acceso

Si se habilita acceso desde este módulo, debe contemplar:

* Correo de acceso.
* Contraseña temporal.
* Cambio obligatorio de contraseña.
* Estado de acceso.
* Último ingreso, si se registra.

### Reglas

1. El correo debe ser único.
2. La contraseña temporal debe poder generarse.
3. Debe existir checkbox de cambio obligatorio de contraseña.
4. Si el motorista está inactivo, no debe poder ingresar.
5. Si el acceso está bloqueado, no debe poder ingresar.
6. El motorista solo debe ver pedidos asignados a él.

---

## 37. Estado de acceso

Valores sugeridos:

```txt
Activo
Bloqueado
Pendiente primer ingreso
Inactivo
```

### Reglas

1. Un motorista nuevo puede nacer con acceso pendiente.
2. Si se genera contraseña temporal, debe marcarse cambio obligatorio.
3. El admin puede bloquear acceso sin inactivar al motorista, si se requiere.
4. Inactivar motorista debe bloquear acceso operativo.

---

# SECCIÓN G — ESTADOS DEL MOTORISTA

## 38. Estado administrativo

```txt
ACTIVO
INACTIVO
```

### Uso

Define si puede ser usado en nuevas asignaciones.

---

## 39. Estado operativo calculado

Además del estado administrativo, el sistema puede calcular un estado operativo.

### Estados sugeridos

```txt
DISPONIBLE
CON_ENTREGAS_ASIGNADAS
EN_RUTA
SIN_ACTIVIDAD
INACTIVO
```

### Reglas

1. Disponible: activo y sin entregas en ruta.
2. Con entregas asignadas: tiene pedidos pendientes o asignados.
3. En ruta: tiene al menos un pedido en ruta.
4. Sin actividad: activo, sin pedidos recientes.
5. Inactivo: no puede recibir pedidos.

Este estado es calculado, no necesariamente editable manualmente.

---

# SECCIÓN H — PAGOS DEL MOTORISTA

## 40. Concepto de pago por entrega

El pago al motorista es un monto que la empresa define por cada pedido asignado.

### Reglas

1. No se calcula automáticamente en primera fase.
2. No depende obligatoriamente del total del pedido.
3. No depende obligatoriamente de la marca.
4. Puede variar por zona, dificultad o criterio administrativo.
5. Lo define el admin al asignar.
6. Queda asociado al pedido.
7. Queda pendiente hasta liquidación.
8. No se muestra al cliente.

---

## 41. Estados de pago al motorista

Estados sugeridos:

```txt
NO_ASIGNADO
PENDIENTE_LIQUIDAR
LIQUIDADO
RETENIDO
NO_APLICA
```

### Reglas

1. Pedido sin motorista: **No asignado**.
2. Pedido con motorista asignado: **Pendiente de liquidar**.
3. Pedido entregado puede liquidarse.
4. Pedido no entregado puede quedar retenido o no aplica, según política.
5. Pedido cancelado antes de ruta puede quedar no aplica.
6. La liquidación final se manejará en FRD 08.

---

## 42. Visualización de pagos en módulo motoristas

El módulo debe mostrar:

* Total pendiente de liquidar.
* Total liquidado.
* Entregas pendientes de pago.
* Entregas retenidas.
* Pagos por pedido.

### Reglas

1. Solo usuarios con permiso deben ver montos.
2. El motorista puede ver o no su pago en PWA Motorista según decisión de negocio.
3. En admin sí debe ser visible para control operativo.
4. Los pagos no deben mezclarse con cobros del cliente.

---

# SECCIÓN I — HISTORIAL Y AUDITORÍA

## 43. Historial del motorista

El sistema debe conservar historial de eventos relacionados con el motorista.

### Eventos mínimos

* Motorista creado.
* Motorista editado.
* Motorista activado.
* Motorista inactivado.
* Pedido asignado.
* Pedido retirado.
* Motorista cambiado.
* Acceso creado.
* Acceso bloqueado.
* Acceso desbloqueado.
* Pago estándar actualizado.

---

## 44. Datos del historial

Cada evento debe guardar:

* Motorista.
* Tipo de evento.
* Valor anterior.
* Valor nuevo.
* Comentario.
* Usuario que ejecutó.
* Fecha y hora.
* Rol del usuario.

---

## 45. Trazabilidad de asignaciones

Cuando un motorista es asignado a un pedido, debe registrarse:

* Pedido.
* Motorista asignado.
* Fecha de asignación.
* Usuario que asignó.
* Pago definido.
* Comentario interno.
* Estado inicial de pago al motorista.

Cuando se cambia motorista, debe registrarse:

* Motorista anterior.
* Nuevo motorista.
* Pago anterior.
* Nuevo pago.
* Motivo.
* Usuario.
* Fecha y hora.

---

# SECCIÓN J — VALIDACIONES

## 46. Validaciones al crear motorista

1. Nombre obligatorio.
2. Teléfono obligatorio.
3. Teléfono debe tener 8 dígitos.
4. Tipo de motorista obligatorio.
5. Estado obligatorio.
6. Correo válido si se ingresa.
7. Correo único si se usa para login.
8. Código interno único si se ingresa.
9. Pago estándar no puede ser negativo.
10. No permitir guardar si faltan campos obligatorios.

---

## 47. Validaciones al editar motorista

1. Motorista debe existir.
2. Usuario debe tener permiso.
3. Teléfono debe seguir siendo válido.
4. Correo debe seguir siendo válido.
5. Pago estándar no puede ser negativo.
6. Si se inactiva con entregas activas, mostrar advertencia.
7. No eliminar historial.
8. No romper pedidos ya asignados.

---

## 48. Validaciones al asignar motorista

1. Motorista debe existir.
2. Motorista debe estar activo.
3. Pedido debe existir.
4. Pedido no debe estar cancelado.
5. Pedido no debe estar entregado.
6. Pedido debe tener fecha confirmada.
7. Pedido debe estar confirmado o en preparación.
8. Pago al motorista debe ser obligatorio.
9. Pago al motorista no puede ser negativo.
10. Usuario debe tener permiso.
11. Debe registrar timeline.

---

## 49. Validaciones al cambiar motorista

1. Pedido debe tener motorista asignado.
2. Nuevo motorista debe estar activo.
3. Nuevo motorista debe ser diferente al actual.
4. Pedido no debe estar entregado.
5. Pedido no debe estar cancelado.
6. Si está en ruta, requerir permiso especial.
7. Motivo obligatorio.
8. Nuevo pago obligatorio.
9. Registrar historial.

---

# SECCIÓN K — MODELO DE DATOS SUGERIDO

## 50. Tabla: store_drivers

```txt
id
driver_code
full_name
phone
email
dpi
address
driver_type
coverage_notes
default_payment_amount
status
access_enabled
access_status
user_id
internal_notes
created_by
updated_by
created_at
updated_at
```

---

## 51. Tabla: store_driver_zones

Si se decide manejar cobertura por catálogo.

```txt
id
driver_id
department_id
municipality_id
zone_id
created_at
updated_at
```

---

## 52. Tabla: store_driver_history

```txt
id
driver_id
event_type
previous_value
new_value
comment
created_by
created_by_role
created_at
```

---

## 53. Tabla: store_driver_assignments

```txt
id
order_id
driver_id
assigned_by
assigned_at
driver_payment_amount
driver_payment_status
status
unassigned_by
unassigned_at
unassigned_reason
created_at
updated_at
```

### Estados sugeridos de asignación

```txt
ACTIVE
REPLACED
CANCELLED
COMPLETED
```

---

## 54. Campos relacionados en store_orders

```txt
assigned_driver_id
driver_assigned_at
driver_assigned_by
driver_payment_amount
driver_payment_status
```

---

# SECCIÓN L — SERVICIOS SUGERIDOS

## 55. Servicios backend

```txt
StoreDriverService
StoreDriverValidationService
StoreDriverAssignmentService
StoreDriverAccessService
StoreDriverHistoryService
StoreDriverPaymentSummaryService
```

---

## 56. StoreDriverService

Responsabilidades:

* Listar motoristas.
* Crear motorista.
* Editar motorista.
* Activar/inactivar motorista.
* Consultar detalle.
* Consultar métricas.
* Consultar historial.

---

## 57. StoreDriverValidationService

Responsabilidades:

* Validar datos obligatorios.
* Validar teléfono.
* Validar correo.
* Validar duplicados.
* Validar estado antes de asignar.
* Validar inactivación con pedidos activos.

---

## 58. StoreDriverAssignmentService

Responsabilidades:

* Asignar motorista a pedido.
* Cambiar motorista.
* Quitar motorista.
* Registrar pago por pedido.
* Actualizar estados del pedido.
* Actualizar agenda.
* Registrar timeline.
* Actualizar visibilidad en PWA Motorista.

---

## 59. StoreDriverAccessService

Responsabilidades:

* Crear acceso a PWA Motorista.
* Generar contraseña temporal.
* Bloquear acceso.
* Reactivar acceso.
* Validar que motorista activo pueda ingresar.
* Aplicar cambio obligatorio de contraseña.

---

## 60. StoreDriverHistoryService

Responsabilidades:

* Registrar eventos del motorista.
* Consultar historial.
* Registrar cambios administrativos.
* Registrar asignaciones y cambios.

---

# SECCIÓN M — ENDPOINTS SUGERIDOS

## 61. Listar motoristas

```txt
GET /api/admin/store/drivers
```

### Query params sugeridos

```txt
search
status
driverType
zoneId
withPendingDeliveries
withPendingPayments
page
limit
```

---

## 62. Crear motorista

```txt
POST /api/admin/store/drivers
```

### Request sugerido

```json
{
  "fullName": "Carlos Ramírez",
  "phone": "55555555",
  "email": "carlos@example.com",
  "dpi": "1234567890101",
  "driverType": "INTERNO",
  "coverageNotes": "Zona 10, zona 11 y zona 15",
  "defaultPaymentAmount": 25.00,
  "status": "ACTIVO",
  "accessEnabled": true,
  "temporaryPassword": "Temporal123",
  "forcePasswordChange": true,
  "internalNotes": "Disponible principalmente por las mañanas."
}
```

---

## 63. Respuesta al crear motorista

```json
{
  "success": true,
  "message": "Motorista creado correctamente.",
  "driver": {
    "id": "driver_123",
    "fullName": "Carlos Ramírez",
    "phone": "55555555",
    "driverType": "INTERNO",
    "status": "ACTIVO"
  }
}
```

---

## 64. Obtener detalle de motorista

```txt
GET /api/admin/store/drivers/:driverId
```

---

## 65. Editar motorista

```txt
PATCH /api/admin/store/drivers/:driverId
```

---

## 66. Cambiar estado de motorista

```txt
PATCH /api/admin/store/drivers/:driverId/status
```

### Request

```json
{
  "status": "INACTIVO",
  "comment": "Motorista no disponible temporalmente."
}
```

---

## 67. Obtener historial de motorista

```txt
GET /api/admin/store/drivers/:driverId/history
```

---

## 68. Obtener entregas del motorista

```txt
GET /api/admin/store/drivers/:driverId/deliveries
```

### Query params

```txt
dateFrom
dateTo
deliveryStatus
paymentStatus
page
limit
```

---

## 69. Asignar motorista a pedido

```txt
POST /api/admin/store/orders/:orderId/assign-driver
```

### Request

```json
{
  "driverId": "driver_123",
  "driverPaymentAmount": 25.00,
  "internalComment": "Asignado por disponibilidad en zona."
}
```

---

## 70. Cambiar motorista de pedido

```txt
POST /api/admin/store/orders/:orderId/change-driver
```

### Request

```json
{
  "newDriverId": "driver_456",
  "driverPaymentAmount": 30.00,
  "reason": "Motorista anterior no disponible.",
  "internalComment": "Cambio antes de iniciar ruta."
}
```

---

## 71. Crear o actualizar acceso PWA Motorista

```txt
POST /api/admin/store/drivers/:driverId/access
```

### Request

```json
{
  "email": "carlos@example.com",
  "temporaryPassword": "Temporal123",
  "forcePasswordChange": true,
  "accessEnabled": true
}
```

---

# SECCIÓN N — COMPONENTES FRONTEND

## 72. Componentes sugeridos

```txt
DriversPage.tsx
DriverSummaryCards.tsx
DriverFilters.tsx
DriverTable.tsx
DriverStatusBadge.tsx
DriverTypeBadge.tsx
DriverForm.tsx
DriverAccessForm.tsx
DriverDetailHeader.tsx
DriverGeneralInfo.tsx
DriverOperationalInfo.tsx
DriverPaymentSummary.tsx
DriverDeliveryHistory.tsx
DriverHistoryTimeline.tsx
DriverStatusToggleModal.tsx
AssignDriverModal.tsx
ChangeDriverModal.tsx
```

---

## 73. Estructura sugerida de archivos

```txt
app/
  admin/
    tienda/
      motoristas/
        page.tsx
        nuevo/
          page.tsx
        [motoristaId]/
          page.tsx
          editar/
            page.tsx
          historial/
            page.tsx
        components/
          DriverSummaryCards.tsx
          DriverFilters.tsx
          DriverTable.tsx
          DriverStatusBadge.tsx
          DriverTypeBadge.tsx
          DriverForm.tsx
          DriverAccessForm.tsx
          DriverDetailHeader.tsx
          DriverGeneralInfo.tsx
          DriverOperationalInfo.tsx
          DriverPaymentSummary.tsx
          DriverDeliveryHistory.tsx
          DriverHistoryTimeline.tsx
          DriverStatusToggleModal.tsx
          AssignDriverModal.tsx
          ChangeDriverModal.tsx

lib/
  services/
    store/
      storeDriverService.ts
      storeDriverValidationService.ts
      storeDriverAssignmentService.ts
      storeDriverAccessService.ts
      storeDriverHistoryService.ts
      storeDriverPaymentSummaryService.ts

types/
  store/
    driver.ts
    driverAssignment.ts
    driverHistory.ts
```

---

# SECCIÓN O — DISEÑO VISUAL

## 74. Consideraciones visuales

1. El diseño debe ser compacto.
2. Las tablas deben usar botones pequeños.
3. Los campos no deben ser robustos.
4. Los títulos deben ir en negrita.
5. Las cards deben ser limpias y de baja altura.
6. El estado del motorista debe verse con badge o switch.
7. La información de pago debe separarse visualmente de la información personal.
8. Los pagos no deben mostrarse si el usuario no tiene permiso.
9. El historial debe mostrarse en línea de tiempo clara.
10. Los modales deben aparecer centrados.
11. El fondo debe quedar bloqueado cuando haya modal.
12. Las acciones críticas deben pedir confirmación.

---

## 75. Badges sugeridos

### Estado administrativo

```txt
Activo
Inactivo
```

### Tipo de motorista

```txt
Interno
Externo
```

### Estado operativo calculado

```txt
Disponible
Con entregas
En ruta
Sin actividad
```

### Estado de pago

```txt
Pendiente de liquidar
Liquidado
Retenido
No aplica
```

---

# SECCIÓN P — CASOS DE USO

## 76. Caso de uso 1: Admin crea motorista

1. Admin ingresa a Tienda > Motoristas.
2. Presiona **Nuevo motorista**.
3. Ingresa nombre, teléfono y tipo.
4. Define estado activo.
5. Guarda.

### Resultado esperado

El motorista queda creado y disponible para asignación.

---

## 77. Caso de uso 2: Admin edita motorista

1. Admin abre el detalle de un motorista.
2. Presiona **Editar**.
3. Actualiza teléfono o cobertura.
4. Guarda cambios.

### Resultado esperado

La información queda actualizada y registrada en auditoría.

---

## 78. Caso de uso 3: Admin inactiva motorista

1. Admin selecciona motorista.
2. Cambia estado a inactivo.
3. Sistema valida entregas activas.
4. Si tiene entregas, muestra advertencia.
5. Admin confirma.

### Resultado esperado

El motorista queda inactivo y no puede recibir nuevas asignaciones.

---

## 79. Caso de uso 4: Admin asigna motorista a pedido

1. Admin abre pedido confirmado.
2. Presiona **Asignar motorista**.
3. Selecciona motorista activo.
4. Ingresa pago al motorista.
5. Guarda asignación.

### Resultado esperado

El pedido queda asignado y el motorista lo verá en su PWA.

---

## 80. Caso de uso 5: Admin cambia motorista asignado

1. Admin abre un pedido asignado.
2. Presiona **Cambiar motorista**.
3. Selecciona nuevo motorista.
4. Ingresa motivo y nuevo pago.
5. Guarda.

### Resultado esperado

El pedido cambia de motorista y se registra historial.

---

## 81. Caso de uso 6: Admin consulta historial de motorista

1. Admin abre detalle de motorista.
2. Revisa entregas asignadas.
3. Filtra por fecha o estado.
4. Abre un pedido relacionado.

### Resultado esperado

El admin puede dar seguimiento al desempeño del motorista.

---

# SECCIÓN Q — CRITERIOS DE ACEPTACIÓN

## 82. Criterios funcionales

1. Debe existir opción **Motoristas** dentro del menú Tienda.
2. Debe existir tabla de motoristas.
3. La tabla debe mostrar nombre, teléfono, tipo, estado, entregas y acciones.
4. La tabla debe tener búsqueda general.
5. La tabla debe tener filtro por estado.
6. La tabla debe tener filtro por tipo.
7. La tabla debe tener paginación.
8. El admin debe poder crear motorista.
9. El nombre del motorista debe ser obligatorio.
10. El teléfono debe ser obligatorio.
11. El teléfono debe validarse como 8 dígitos.
12. El tipo de motorista debe ser obligatorio.
13. El motorista nuevo debe nacer activo por defecto.
14. El admin debe poder editar motorista.
15. El admin debe poder activar motorista.
16. El admin debe poder inactivar motorista.
17. Un motorista inactivo no debe poder asignarse a pedidos nuevos.
18. Inactivar motorista no debe eliminar historial.
19. Si el motorista tiene pedidos activos, debe mostrarse advertencia al inactivar.
20. El detalle del motorista debe mostrar información general.
21. El detalle debe mostrar resumen operativo.
22. El detalle debe mostrar entregas asignadas.
23. El detalle debe mostrar pagos pendientes solo a usuarios autorizados.
24. El admin debe poder asignar motorista a pedido confirmado.
25. No debe permitirse asignar motorista a pedido cancelado.
26. No debe permitirse asignar motorista a pedido entregado.
27. No debe permitirse asignar motorista sin fecha confirmada.
28. El pago al motorista debe ser obligatorio al asignar.
29. El pago al motorista debe ser mayor o igual a cero.
30. El pago al motorista debe guardarse por pedido.
31. El pago estándar puede precargarse, pero debe poder modificarse.
32. El pago al motorista no debe mostrarse al cliente.
33. El admin debe poder cambiar motorista antes de ruta.
34. Cambiar motorista debe exigir motivo.
35. Cambiar motorista debe guardar motorista anterior y nuevo.
36. Cambiar motorista debe actualizar PWA Motorista.
37. El motorista anterior debe dejar de ver el pedido.
38. El motorista nuevo debe ver el pedido.
39. El sistema debe registrar historial de asignaciones.
40. El sistema debe registrar historial administrativo.
41. El sistema debe validar permisos en frontend y backend.
42. Cada pantalla debe tener ruta separada.
43. Cada componente debe tener responsabilidad separada.
44. El diseño debe ser compacto.
45. Los botones deben ser pequeños y claros.
46. Los modales deben aparecer centrados y bloquear fondo.
47. Los estados deben mostrarse como badges.
48. Los pagos deben separarse visualmente de los datos personales.
49. El módulo debe preparar la integración con PWA Motorista.
50. El módulo debe preparar la integración con liquidaciones.

---

## 83. Resultado esperado del FRD

Al finalizar este desarrollo, la plataforma administrativa contará con un módulo completo para administrar motoristas, controlar su estado, registrar información operativa, asignarlos a pedidos y definir manualmente cuánto se pagará por cada entrega.

Este módulo será la base para que la PWA Motorista pueda mostrar únicamente los pedidos asignados a cada motorista y para que el módulo de liquidaciones pueda calcular pagos pendientes, retenidos o liquidados.
