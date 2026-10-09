# FRD 07 — PWA Motorista

## 1. Información general del requerimiento

### Nombre del módulo

PWA Motorista

### Plataforma

PWA Motorista

### Tipo de módulo

Aplicación web progresiva operativa para que los motoristas gestionen las entregas de pedidos asignados por la empresa.

### Objetivo general

Permitir que cada motorista pueda ingresar a una PWA propia, visualizar únicamente los pedidos que le fueron asignados, consultar la información necesaria para realizar la entrega, marcar estados operativos, confirmar entrega, confirmar cobro en efectivo o registrar una no entrega con motivo.

La PWA Motorista no debe consultar ubicación en tiempo real, no debe mostrar mapas obligatorios y no debe usar GPS como parte del flujo principal. El seguimiento debe manejarse únicamente por estados.

---

## 2. Contexto funcional

La empresa administra una tienda dentro de la PWA Cliente. Los clientes solicitan pedidos de productos de varias marcas, el pago es únicamente en efectivo contra entrega y la empresa se encarga directamente de la logística de entrega.

Desde la plataforma administrativa, un usuario admin confirma el pedido, programa la entrega, asigna motorista e indica cuánto se pagará al motorista por realizar esa entrega.

Una vez asignado, el pedido aparece en la PWA Motorista del motorista correspondiente.

---

## 3. Alcance del FRD

Este FRD contempla:

* Login de motorista.
* Cambio obligatorio de contraseña en primer ingreso, si aplica.
* Dashboard de entregas asignadas.
* Listado de pedidos asignados.
* Filtros por estado y fecha.
* Detalle de entrega.
* Visualización de datos del cliente.
* Visualización de dirección de entrega.
* Visualización de productos del pedido.
* Visualización del total a cobrar.
* Confirmación de salida a ruta.
* Confirmación de entrega.
* Confirmación de cobro en efectivo.
* Registro de monto cobrado.
* Registro de no entrega.
* Motivos de no entrega.
* Observaciones del motorista.
* Actualización de estados.
* Trazabilidad de acciones.
* Notificaciones o alertas internas.
* Validaciones de seguridad.
* Estructura técnica sugerida.
* Endpoints sugeridos.
* Modelo de datos sugerido.
* Criterios de aceptación.

---

## 4. Fuera de alcance

Este FRD no contempla:

* Geolocalización en tiempo real.
* Rastreo por GPS.
* Mapa obligatorio.
* Optimización automática de rutas.
* Cálculo automático de distancia.
* Pago digital.
* Cobro con tarjeta.
* Cobro por transferencia.
* Liquidación final del motorista.
* Administración de motoristas.
* Asignación de motorista desde la PWA Motorista.
* Reprogramación administrativa completa.
* Edición de productos.
* Edición de pedidos.
* Creación de pedidos.

---

## 5. Regla principal del módulo

El motorista solo puede operar pedidos asignados a él.

No debe poder ver:

* Pedidos de otros motoristas.
* Pedidos sin asignar.
* Pedidos de clientes no relacionados con su entrega.
* Información interna del administrador.
* Reportes generales.
* Liquidaciones globales.
* Configuración de productos.
* Configuración de marcas.

---

## 6. Ubicación y acceso

La PWA Motorista debe ser una plataforma separada o una sección separada dentro del sistema, con rutas propias.

### Ruta base sugerida

```txt
/pwa-motorista
```

### Rutas sugeridas

```txt
/pwa-motorista/login
/pwa-motorista/cambiar-contrasena
/pwa-motorista/inicio
/pwa-motorista/entregas
/pwa-motorista/entregas/[pedidoId]
/pwa-motorista/historial
/perfil-motorista
```

---

## 7. Estructura sugerida de archivos

```txt
app/
  pwa-motorista/
    login/
      page.tsx
      components/
        DriverLoginForm.tsx
    cambiar-contrasena/
      page.tsx
      components/
        DriverPasswordChangeForm.tsx
    inicio/
      page.tsx
      components/
        DriverDashboardCards.tsx
        TodayDeliveriesList.tsx
        DriverQuickActions.tsx
    entregas/
      page.tsx
      components/
        DriverDeliveryFilters.tsx
        DriverDeliveryCard.tsx
        DriverDeliveryStatusBadge.tsx
        EmptyDriverDeliveriesState.tsx
      [pedidoId]/
        page.tsx
        components/
          DriverOrderDetailHeader.tsx
          DriverClientInfo.tsx
          DriverDeliveryAddress.tsx
          DriverOrderProducts.tsx
          DriverCashCollectionInfo.tsx
          DriverOrderTimeline.tsx
          StartRouteModal.tsx
          ConfirmDeliveryModal.tsx
          FailedDeliveryModal.tsx
    historial/
      page.tsx
      components/
        DriverHistoryFilters.tsx
        DriverHistoryList.tsx
    perfil/
      page.tsx
      components/
        DriverProfileInfo.tsx

lib/
  services/
    driver/
      driverAuthService.ts
      driverDeliveryService.ts
      driverDeliveryStatusService.ts
      driverCashCollectionService.ts
      driverTimelineService.ts
      driverValidationService.ts

types/
  driver/
    driverAuth.ts
    driverDelivery.ts
    driverStatus.ts
    driverCashCollection.ts
```

---

# SECCIÓN A — AUTENTICACIÓN DEL MOTORISTA

## 8. Pantalla: Login motorista

### Ruta

```txt
/pwa-motorista/login
```

### Objetivo

Permitir que el motorista ingrese a la PWA Motorista con credenciales autorizadas.

### Campos sugeridos

* Correo electrónico o teléfono.
* Contraseña.

### Recomendación

Usar correo electrónico y contraseña si el sistema ya maneja autenticación similar para clientes o administradores.

### Botón principal

```txt
Ingresar
```

---

## 9. Reglas de login

1. Solo pueden ingresar motoristas activos.
2. Solo pueden ingresar motoristas con acceso habilitado.
3. Si el motorista está inactivo, debe bloquearse el ingreso.
4. Si el acceso está bloqueado, debe mostrarse mensaje claro.
5. Si tiene cambio obligatorio de contraseña, debe redirigir a la pantalla de cambio de contraseña.
6. La sesión del motorista debe limitarse a sus pedidos asignados.
7. No debe permitir acceso a módulos administrativos.
8. No debe permitir acceso a PWA Cliente.
9. La autenticación debe validar credenciales en backend.
10. No debe exponer información de otros motoristas.

---

## 10. Mensajes de error de login

### Credenciales incorrectas

```txt
Correo, teléfono o contraseña incorrectos.
```

### Motorista inactivo

```txt
Tu usuario se encuentra inactivo. Comunícate con el administrador.
```

### Acceso bloqueado

```txt
Tu acceso se encuentra bloqueado. Comunícate con el administrador.
```

### Cambio obligatorio de contraseña

```txt
Debes cambiar tu contraseña antes de continuar.
```

---

## 11. Pantalla: Cambio obligatorio de contraseña

### Ruta

```txt
/pwa-motorista/cambiar-contrasena
```

### Campos

* Contraseña temporal o actual.
* Nueva contraseña.
* Confirmar nueva contraseña.

### Reglas

1. Debe solicitarse si el admin marcó cambio obligatorio.
2. La nueva contraseña debe cumplir política mínima de seguridad.
3. La confirmación debe coincidir.
4. Después de cambiar contraseña, el motorista debe ingresar al inicio.
5. El flag de cambio obligatorio debe desactivarse al guardar.
6. Debe mostrar errores claros.
7. No debe permitir continuar sin cambiar la contraseña.

---

# SECCIÓN B — DASHBOARD DEL MOTORISTA

## 12. Pantalla: Inicio motorista

### Ruta

```txt
/pwa-motorista/inicio
```

### Objetivo

Mostrar al motorista un resumen rápido de sus entregas asignadas y pendientes.

### Información sugerida

* Entregas programadas para hoy.
* Entregas pendientes.
* Entregas en ruta.
* Entregas entregadas.
* Entregas no entregadas.
* Acceso a listado de entregas.
* Acceso a historial.

---

## 13. Cards de resumen

Cards sugeridas:

1. **Para hoy**
2. **Pendientes**
3. **En ruta**
4. **Entregadas**
5. **No entregadas**

### Reglas

1. Las cards deben ser compactas.
2. Deben mostrar únicamente información del motorista autenticado.
3. Deben poder funcionar como acceso rápido al listado filtrado.
4. No deben mostrar datos de otros motoristas.
5. No deben mostrar reportes administrativos globales.

---

## 14. Listado rápido de entregas de hoy

Debe mostrar las entregas programadas para la fecha actual.

### Cada card debe mostrar:

* Número de pedido.
* Cliente.
* Teléfono.
* Dirección resumida.
* Zona.
* Fecha programada.
* Rango horario.
* Total a cobrar.
* Estado.
* Botón **Ver detalle**.

---

# SECCIÓN C — LISTADO DE ENTREGAS

## 15. Pantalla: Mis entregas

### Ruta

```txt
/pwa-motorista/entregas
```

### Objetivo

Permitir al motorista consultar todos los pedidos asignados a él.

### Filtros sugeridos

* Fecha.
* Estado de entrega.
* Pendientes.
* En ruta.
* Entregadas.
* No entregadas.
* Búsqueda por pedido, cliente o teléfono.

### Reglas

1. El listado solo debe mostrar pedidos asignados al motorista autenticado.
2. Debe excluir pedidos asignados a otros motoristas.
3. Debe excluir pedidos cancelados, salvo que se active filtro de historial.
4. Debe mostrar primero entregas más próximas.
5. Debe resaltar entregas programadas para hoy.
6. Debe resaltar entregas vencidas o atrasadas.
7. Debe ser una vista móvil compacta.

---

## 16. Card de entrega

Cada entrega debe mostrarse en formato card.

### Información requerida

* Número de pedido.
* Estado de entrega.
* Cliente.
* Teléfono.
* Dirección resumida.
* Fecha programada.
* Rango horario.
* Total a cobrar.
* Método de pago: efectivo.
* Botón **Ver detalle**.

### Ejemplo visual

```txt
PED-2026-000015
Asignada

Cliente: María López
Teléfono: 55555555
Entrega: 27/06/2026 — 09:00 a 12:00
Dirección: Zona 10, Guatemala
Total a cobrar: Q399.00

[Ver detalle]
```

---

## 17. Estados visibles para motorista

El motorista debe ver estados simples y operativos:

```txt
Asignada
En ruta
Entregada
No entregada
Cancelada
```

### Equivalencia técnica

```txt
ASIGNADA
EN_RUTA
ENTREGADA
NO_ENTREGADA
CANCELADA
```

---

# SECCIÓN D — DETALLE DE ENTREGA

## 18. Pantalla: Detalle de entrega

### Ruta

```txt
/pwa-motorista/entregas/[pedidoId]
```

### Objetivo

Mostrar al motorista la información necesaria para realizar la entrega y actualizar el estado del pedido.

### Secciones sugeridas

1. Encabezado del pedido.
2. Información del cliente.
3. Dirección de entrega.
4. Productos del pedido.
5. Información de cobro.
6. Estado actual.
7. Línea de tiempo.
8. Acciones disponibles.

---

## 19. Encabezado del pedido

Debe mostrar:

* Número de pedido.
* Estado actual.
* Fecha programada.
* Rango horario.
* Total a cobrar.
* Método de pago.

### Método de pago

Siempre debe mostrar:

```txt
Efectivo contra entrega
```

---

## 20. Información del cliente

Debe mostrar:

* Nombre del cliente.
* Teléfono de contacto.
* Nombre de quien recibe, si existe.

### Reglas

1. El motorista debe ver únicamente la información necesaria para la entrega.
2. No debe ver datos administrativos del cliente.
3. No debe ver puntos del cliente.
4. No debe ver nivel del cliente.
5. No debe ver historial de compras del cliente.
6. No debe ver información de otros pedidos del cliente.

---

## 21. Dirección de entrega

Debe mostrar:

* Dirección completa.
* Departamento.
* Municipio.
* Zona.
* Referencia de ubicación.
* Comentarios de entrega, si existen.

### Reglas

1. La dirección debe venir del snapshot del pedido.
2. No debe depender de cambios posteriores en el perfil del cliente.
3. La referencia debe ser visible y fácil de leer.
4. No debe requerir GPS.
5. No debe mostrar mapa obligatorio.

---

## 22. Productos del pedido

Debe mostrar:

* Imagen del producto, si existe.
* Marca.
* Nombre del producto.
* Cantidad.
* Precio unitario.
* Subtotal.

### Reglas

1. El motorista debe poder revisar qué productos entrega.
2. No debe poder modificar productos.
3. No debe poder cambiar cantidades.
4. No debe poder cambiar precios.
5. No debe poder cancelar productos individuales.
6. La información debe venir del snapshot del pedido.

---

## 23. Información de cobro

Debe mostrar:

* Total a cobrar.
* Método de pago.
* Estado del pago del cliente.
* Monto cobrado, si ya fue registrado.

### Estado inicial

```txt
Pendiente de cobro
```

### Reglas

1. El motorista debe saber cuánto cobrar.
2. El monto debe estar destacado.
3. El método debe indicar efectivo.
4. No debe mostrar opción de tarjeta.
5. No debe mostrar opción de transferencia.
6. No debe permitir modificar el total del pedido.
7. Solo debe registrar monto cobrado al confirmar entrega.

---

## 24. Pago al motorista

El pago al motorista es definido por el admin al asignar la entrega.

### Regla recomendada

Por defecto, la PWA Motorista no debe mostrar cuánto se le pagará al motorista, salvo que la empresa decida hacerlo visible.

### Configuración sugerida

```txt
mostrar_pago_motorista_en_pwa = true / false
```

### Reglas

1. El pago al motorista siempre debe existir en admin.
2. El cliente nunca debe verlo.
3. El motorista puede verlo solo si la empresa lo habilita.
4. Si se muestra, debe ser informativo.
5. El motorista no puede modificarlo.
6. El motorista no puede liquidarlo desde la PWA.
7. La liquidación final se maneja desde Admin.

---

# SECCIÓN E — ACCIONES DEL MOTORISTA

## 25. Acciones disponibles según estado

### Estado: Asignada

Acciones disponibles:

```txt
Marcar en ruta
Reportar problema
```

### Estado: En ruta

Acciones disponibles:

```txt
Confirmar entrega
No se pudo entregar
```

### Estado: Entregada

Acciones disponibles:

```txt
Ver detalle
```

### Estado: No entregada

Acciones disponibles:

```txt
Ver detalle
```

### Estado: Cancelada

Acciones disponibles:

```txt
Ver detalle
```

---

## 26. Acción: Marcar en ruta

### Objetivo

Permitir que el motorista indique que salió a realizar la entrega.

### Disponible cuando

```txt
estado_entrega = ASIGNADA
```

### No disponible cuando

```txt
estado_entrega = EN_RUTA
estado_entrega = ENTREGADA
estado_entrega = NO_ENTREGADA
estado_entrega = CANCELADA
```

---

## 27. Modal: Marcar en ruta

Al presionar **Marcar en ruta**, debe aparecer un modal de confirmación.

### Información a mostrar

* Número de pedido.
* Cliente.
* Dirección.
* Total a cobrar.
* Mensaje de confirmación.

### Texto sugerido

```txt
Marcar pedido en ruta

Confirma que iniciarás la entrega de este pedido. El cliente podrá ver que el pedido ya salió a entrega.
```

### Botones

```txt
Cancelar
Confirmar en ruta
```

---

## 28. Reglas para marcar en ruta

1. El pedido debe estar asignado al motorista autenticado.
2. El pedido debe estar en estado Asignada.
3. El pedido no debe estar cancelado.
4. El pedido no debe estar entregado.
5. El pedido no debe estar asignado a otro motorista.
6. Debe registrar fecha y hora.
7. Debe actualizar estado de entrega a **En ruta**.
8. Debe actualizar estado del pedido a **En ruta**.
9. Debe registrar timeline.
10. Debe notificar al cliente.
11. No debe solicitar ubicación GPS.

---

## 29. Notificación al cliente por en ruta

Mensaje sugerido:

```txt
Tu pedido ya salió a entrega.
```

---

# SECCIÓN F — CONFIRMAR ENTREGA Y COBRO

## 30. Acción: Confirmar entrega

### Objetivo

Permitir que el motorista confirme que entregó el paquete y cobró el efectivo correspondiente.

### Disponible cuando

```txt
estado_entrega = EN_RUTA
```

### No disponible cuando

```txt
estado_entrega = ASIGNADA
estado_entrega = ENTREGADA
estado_entrega = NO_ENTREGADA
estado_entrega = CANCELADA
```

---

## 31. Modal: Confirmar entrega

Al presionar **Confirmar entrega**, debe aparecer un modal.

### Información a mostrar

* Número de pedido.
* Cliente.
* Total a cobrar.
* Método de pago.
* Campo monto cobrado.
* Checkbox de confirmación de entrega.
* Checkbox de confirmación de cobro.
* Observación opcional.

### Texto sugerido

```txt
Confirmar entrega

Confirma que entregaste el paquete y recibiste el pago en efectivo.
```

### Campos requeridos

* Monto cobrado.
* Confirmación de entrega.
* Confirmación de cobro en efectivo.

### Campos opcionales

* Observación.
* Foto de evidencia, opcional para fase futura.

---

## 32. Confirmaciones obligatorias

El modal debe incluir dos confirmaciones explícitas:

```txt
Confirmo que entregué el paquete al cliente.
Confirmo que recibí el pago en efectivo.
```

### Reglas

1. Ambas confirmaciones deben ser obligatorias.
2. No debe permitir confirmar entrega sin confirmar cobro.
3. No debe permitir confirmar cobro sin monto cobrado.
4. No debe permitir confirmar si el monto cobrado no coincide, salvo regla especial.
5. Debe evitar confirmaciones accidentales.

---

## 33. Monto cobrado

### Campo

```txt
Monto cobrado
```

### Reglas

1. Debe ser obligatorio.
2. Debe ser numérico.
3. Debe ser mayor o igual a cero.
4. Debe compararse contra el total del pedido.
5. El valor esperado debe ser el total del pedido.
6. No debe permitir modificar el total del pedido.
7. Debe guardarse como monto recibido.
8. Debe mostrarse en Admin.

---

## 34. Manejo de diferencia en cobro

### Regla recomendada

No permitir confirmar entrega si el monto cobrado es diferente al total del pedido.

### Mensaje sugerido

```txt
El monto cobrado no coincide con el total del pedido. Verifica el efectivo recibido antes de continuar.
```

### Variante opcional

Permitir diferencia solo con autorización administrativa.

Si se implementa autorización:

1. El motorista registra monto diferente.
2. Debe ingresar observación obligatoria.
3. El pedido queda en estado de incidencia.
4. El admin debe revisar.
5. El pago al motorista puede quedar retenido.

### Recomendación para primera fase

Bloquear cobro diferente y exigir que coincida con el total del pedido.

---

## 35. Resultado de confirmar entrega

Al confirmar correctamente:

### Estado del pedido

```txt
ENTREGADO
```

### Estado de entrega

```txt
ENTREGADA
```

### Estado de pago del cliente

```txt
COBRADO_EFECTIVO
```

### Estado de pago al motorista

Debe mantenerse como:

```txt
PENDIENTE_LIQUIDAR
```

hasta que Admin liquide.

---

## 36. Reglas para confirmar entrega

1. El pedido debe estar asignado al motorista autenticado.
2. El pedido debe estar en estado En ruta.
3. El pedido no debe estar cancelado.
4. El pedido no debe estar entregado.
5. El monto cobrado debe coincidir con el total.
6. El método de pago debe ser efectivo contra entrega.
7. Debe registrar fecha y hora de entrega.
8. Debe registrar fecha y hora de cobro.
9. Debe actualizar estados.
10. Debe registrar timeline.
11. Debe notificar al cliente.
12. Debe dejar el pago al motorista pendiente de liquidar.
13. No debe liquidar automáticamente al motorista.
14. No debe usar ubicación en tiempo real.

---

## 37. Notificación al cliente por entrega

Mensaje sugerido:

```txt
Tu pedido fue entregado correctamente. Gracias por tu compra.
```

---

# SECCIÓN G — NO SE PUDO ENTREGAR

## 38. Acción: No se pudo entregar

### Objetivo

Permitir que el motorista registre una entrega fallida cuando no pueda completar la entrega.

### Disponible cuando

```txt
estado_entrega = EN_RUTA
```

### No disponible cuando

```txt
estado_entrega = ASIGNADA
estado_entrega = ENTREGADA
estado_entrega = NO_ENTREGADA
estado_entrega = CANCELADA
```

---

## 39. Modal: No se pudo entregar

### Campos requeridos

* Motivo de no entrega.
* Comentario.

### Campos opcionales

* Foto de evidencia, opcional para fase futura.

### Texto sugerido

```txt
No se pudo entregar

Indica el motivo por el cual no fue posible completar la entrega.
```

### Botones

```txt
Cancelar
Registrar no entrega
```

---

## 40. Motivos de no entrega

Valores sugeridos:

```txt
Cliente no contestó.
Cliente no se encontraba.
Dirección incorrecta.
Dirección incompleta.
Cliente rechazó el pedido.
Cliente no tenía efectivo.
Zona inaccesible.
Producto no recibido por inconformidad.
Problema operativo.
Otro.
```

### Reglas

1. El motivo debe ser obligatorio.
2. El comentario debe ser obligatorio.
3. Si el motivo es **Otro**, el comentario debe ser obligatorio y descriptivo.
4. El motorista no debe poder inventar un estado distinto.
5. La no entrega debe registrarse en historial.
6. El admin debe poder revisar el motivo.
7. El cliente puede ver un mensaje general, no necesariamente toda la observación interna.

---

## 41. Resultado de registrar no entrega

Al registrar no entrega:

### Estado del pedido

```txt
NO_ENTREGADO
```

### Estado de entrega

```txt
NO_ENTREGADA
```

### Estado de pago del cliente

```txt
NO_COBRADO
```

### Estado de pago al motorista

Debe quedar según política:

```txt
RETENIDO
```

o

```txt
NO_APLICA
```

### Recomendación

Dejar como **Retenido** para que Admin revise si corresponde pagar o no al motorista.

---

## 42. Reglas para no entrega

1. El pedido debe estar asignado al motorista autenticado.
2. El pedido debe estar en estado En ruta.
3. Debe seleccionar motivo.
4. Debe ingresar comentario.
5. Debe registrar fecha y hora.
6. Debe actualizar estado a No entregado.
7. Debe marcar pago del cliente como No cobrado.
8. Debe registrar timeline.
9. Debe notificar al cliente.
10. Debe dejar pago al motorista retenido o pendiente de revisión.
11. No debe liquidar automáticamente.
12. No debe cancelar el pedido automáticamente, salvo política futura.

---

## 43. Notificación al cliente por no entrega

Mensaje sugerido:

```txt
No pudimos completar la entrega de tu pedido. Nuestro equipo revisará el caso y te notificará los próximos pasos.
```

---

# SECCIÓN H — REPORTAR PROBLEMA

## 44. Acción: Reportar problema

### Objetivo

Permitir que el motorista reporte una situación antes de marcar en ruta o durante el proceso.

### Disponible cuando

```txt
ASIGNADA
EN_RUTA
```

### Motivos sugeridos

```txt
No encuentro la dirección.
Cliente no responde.
Problema con el paquete.
Problema con el efectivo.
No podré realizar la entrega.
Otro.
```

### Reglas

1. El reporte no necesariamente cambia el estado del pedido.
2. Debe registrar comentario.
3. Debe notificar o alertar al admin.
4. Debe quedar en timeline interno.
5. No debe mostrarse completo al cliente si es comentario interno.

---

# SECCIÓN I — HISTORIAL DEL MOTORISTA

## 45. Pantalla: Historial

### Ruta

```txt
/pwa-motorista/historial
```

### Objetivo

Permitir que el motorista consulte entregas anteriores asignadas a él.

### Información a mostrar

* Número de pedido.
* Fecha de entrega.
* Cliente.
* Estado final.
* Total cobrado.
* Método de pago.
* Fecha de cierre.

### Filtros

* Fecha desde.
* Fecha hasta.
* Estado.
* Búsqueda por pedido.

### Reglas

1. Solo debe mostrar historial del motorista autenticado.
2. No debe mostrar entregas de otros motoristas.
3. No debe permitir modificar pedidos históricos.
4. Debe permitir ver detalle en modo solo lectura.
5. La información de pago al motorista puede ocultarse o mostrarse según configuración.

---

# SECCIÓN J — PERFIL MOTORISTA

## 46. Pantalla: Perfil motorista

### Ruta

```txt
/pwa-motorista/perfil
```

### Objetivo

Mostrar información básica del motorista autenticado.

### Información sugerida

* Nombre.
* Teléfono.
* Correo.
* Tipo de motorista.
* Estado.
* Cambio de contraseña.

### Reglas

1. El motorista no debe editar todos sus datos.
2. Puede permitirse cambiar contraseña.
3. Puede permitirse consultar datos de contacto.
4. Cambios de teléfono o correo deben manejarse desde Admin, salvo que se defina autoservicio.
5. No debe mostrar liquidaciones globales, salvo decisión futura.

---

# SECCIÓN K — TRAZABILIDAD

## 47. Eventos que debe registrar la PWA Motorista

Cada acción del motorista debe quedar registrada.

### Eventos mínimos

```txt
Motorista inició sesión.
Pedido visto por motorista.
Pedido marcado en ruta.
Entrega confirmada.
Cobro confirmado.
No entrega registrada.
Problema reportado.
Comentario agregado.
```

---

## 48. Datos por evento

Cada evento debe guardar:

* Pedido.
* Motorista.
* Estado anterior.
* Estado nuevo.
* Tipo de evento.
* Comentario.
* Monto cobrado, si aplica.
* Motivo, si aplica.
* Fecha y hora.
* Rol: motorista.
* Usuario/motorista que ejecutó la acción.

---

## 49. Línea de tiempo visible para motorista

El motorista debe ver una línea de tiempo simple:

```txt
Asignada
En ruta
Entregada
```

o

```txt
Asignada
En ruta
No entregada
```

### Reglas

1. Debe ser simple.
2. No debe mostrar información administrativa sensible.
3. Debe mostrar fecha y hora de sus propias acciones.
4. Puede mostrar programación y asignación.
5. No debe mostrar pagos internos si no está autorizado.

---

# SECCIÓN L — VALIDACIONES GENERALES

## 50. Validaciones de seguridad

1. El motorista debe estar autenticado.
2. El motorista debe estar activo.
3. El motorista debe tener acceso habilitado.
4. El pedido debe estar asignado al motorista autenticado.
5. El pedido no debe pertenecer a otro motorista.
6. El pedido no debe estar cancelado.
7. El pedido no debe estar finalizado para permitir cambios.
8. Backend debe validar todas las acciones.
9. Frontend no debe ser la única capa de seguridad.
10. No debe exponerse información de otros pedidos.

---

## 51. Validaciones para marcar en ruta

1. Pedido asignado al motorista.
2. Estado actual debe ser Asignada.
3. Pedido no cancelado.
4. Pedido no entregado.
5. Pedido no en ruta previamente.
6. Motorista activo.
7. Registrar timeline.

---

## 52. Validaciones para confirmar entrega

1. Pedido asignado al motorista.
2. Estado actual debe ser En ruta.
3. Monto cobrado obligatorio.
4. Monto cobrado debe coincidir con total del pedido.
5. Confirmación de entrega obligatoria.
6. Confirmación de cobro obligatoria.
7. Pedido no cancelado.
8. Pedido no entregado previamente.
9. Actualizar estado de pago del cliente.
10. Registrar timeline.

---

## 53. Validaciones para registrar no entrega

1. Pedido asignado al motorista.
2. Estado actual debe ser En ruta.
3. Motivo obligatorio.
4. Comentario obligatorio.
5. Pedido no cancelado.
6. Pedido no entregado.
7. Pago cliente debe quedar no cobrado.
8. Registrar timeline.
9. Alertar al admin.

---

# SECCIÓN M — MODELO DE DATOS SUGERIDO

## 54. Tabla: store_driver_delivery_events

```txt
id
order_id
driver_id
event_type
previous_order_status
new_order_status
previous_delivery_status
new_delivery_status
previous_payment_status
new_payment_status
cash_amount_collected
failure_reason
comment
created_at
```

---

## 55. Tabla: store_driver_delivery_attempts

```txt
id
order_id
driver_id
attempt_number
delivery_status
failure_reason
cash_collected_amount
started_route_at
delivered_at
failed_at
comment
created_at
updated_at
```

---

## 56. Campos relacionados en store_orders

```txt
assigned_driver_id
driver_assigned_at
driver_payment_amount
driver_payment_status
delivery_status
order_status
client_payment_status
cash_collected_amount
route_started_at
delivered_at
not_delivered_at
not_delivery_reason
not_delivery_comment
```

---

## 57. Estados técnicos requeridos

### Estado de entrega

```txt
ASIGNADA
EN_RUTA
ENTREGADA
NO_ENTREGADA
CANCELADA
```

### Estado del pedido

```txt
ASIGNADO_MOTORISTA
EN_RUTA
ENTREGADO
NO_ENTREGADO
CANCELADO
```

### Estado de pago del cliente

```txt
PENDIENTE_COBRO
COBRADO_EFECTIVO
NO_COBRADO
ANULADO
```

### Estado de pago al motorista

```txt
PENDIENTE_LIQUIDAR
LIQUIDADO
RETENIDO
NO_APLICA
```

---

# SECCIÓN N — SERVICIOS SUGERIDOS

## 58. Servicios backend

```txt
DriverAuthService
DriverDeliveryService
DriverDeliveryQueryService
DriverDeliveryStatusService
DriverCashCollectionService
DriverFailedDeliveryService
DriverIssueReportService
DriverTimelineService
DriverSecurityService
```

---

## 59. DriverAuthService

Responsabilidades:

* Login de motorista.
* Validar acceso activo.
* Validar motorista activo.
* Manejar cambio obligatorio de contraseña.
* Cerrar sesión.

---

## 60. DriverDeliveryService

Responsabilidades:

* Obtener entregas asignadas.
* Obtener detalle de entrega.
* Consultar historial.
* Validar que el pedido pertenece al motorista.

---

## 61. DriverDeliveryStatusService

Responsabilidades:

* Marcar en ruta.
* Marcar entregado.
* Marcar no entregado.
* Validar transiciones de estado.
* Actualizar pedido y entrega.

---

## 62. DriverCashCollectionService

Responsabilidades:

* Validar monto cobrado.
* Registrar efectivo recibido.
* Cambiar estado de pago del cliente.
* Guardar fecha y hora de cobro.
* Bloquear diferencias no autorizadas.

---

## 63. DriverFailedDeliveryService

Responsabilidades:

* Registrar motivo de no entrega.
* Registrar comentario.
* Cambiar estado a no entregado.
* Marcar pago cliente como no cobrado.
* Dejar pago motorista retenido o pendiente de revisión.

---

## 64. DriverIssueReportService

Responsabilidades:

* Registrar problemas.
* Alertar al admin.
* Guardar comentario interno.
* Mantener trazabilidad.

---

# SECCIÓN O — ENDPOINTS SUGERIDOS

## 65. Login motorista

```txt
POST /api/driver/auth/login
```

### Request

```json
{
  "email": "motorista@example.com",
  "password": "Temporal123"
}
```

---

## 66. Cambio de contraseña

```txt
POST /api/driver/auth/change-password
```

### Request

```json
{
  "currentPassword": "Temporal123",
  "newPassword": "NuevaClave123",
  "confirmPassword": "NuevaClave123"
}
```

---

## 67. Obtener dashboard del motorista

```txt
GET /api/driver/dashboard
```

---

## 68. Listar entregas asignadas

```txt
GET /api/driver/deliveries
```

### Query params sugeridos

```txt
date
status
search
page
limit
```

---

## 69. Obtener detalle de entrega

```txt
GET /api/driver/deliveries/:orderId
```

---

## 70. Marcar en ruta

```txt
POST /api/driver/deliveries/:orderId/start-route
```

### Request

```json
{
  "comment": "Inicio entrega del pedido."
}
```

---

## 71. Confirmar entrega y cobro

```txt
POST /api/driver/deliveries/:orderId/confirm-delivery
```

### Request

```json
{
  "cashAmountCollected": 399.00,
  "deliveryConfirmed": true,
  "cashConfirmed": true,
  "comment": "Entregado y cobrado en efectivo."
}
```

---

## 72. Registrar no entrega

```txt
POST /api/driver/deliveries/:orderId/failed-delivery
```

### Request

```json
{
  "failureReason": "CLIENTE_NO_CONTESTO",
  "comment": "Se llamó varias veces al cliente y no respondió."
}
```

---

## 73. Reportar problema

```txt
POST /api/driver/deliveries/:orderId/report-issue
```

### Request

```json
{
  "issueType": "NO_ENCUENTRO_DIRECCION",
  "comment": "La dirección no tiene número de casa visible."
}
```

---

## 74. Obtener historial del motorista

```txt
GET /api/driver/history
```

### Query params

```txt
dateFrom
dateTo
status
search
page
limit
```

---

# SECCIÓN P — RESPUESTAS ESPERADAS

## 75. Respuesta al marcar en ruta

```json
{
  "success": true,
  "message": "Pedido marcado en ruta correctamente.",
  "order": {
    "id": "order_123",
    "orderNumber": "PED-2026-000015",
    "orderStatus": "EN_RUTA",
    "deliveryStatus": "EN_RUTA"
  }
}
```

---

## 76. Respuesta al confirmar entrega

```json
{
  "success": true,
  "message": "Entrega y cobro confirmados correctamente.",
  "order": {
    "id": "order_123",
    "orderNumber": "PED-2026-000015",
    "orderStatus": "ENTREGADO",
    "deliveryStatus": "ENTREGADA",
    "clientPaymentStatus": "COBRADO_EFECTIVO",
    "cashAmountCollected": 399.00,
    "driverPaymentStatus": "PENDIENTE_LIQUIDAR"
  }
}
```

---

## 77. Respuesta al registrar no entrega

```json
{
  "success": true,
  "message": "No entrega registrada correctamente.",
  "order": {
    "id": "order_123",
    "orderNumber": "PED-2026-000015",
    "orderStatus": "NO_ENTREGADO",
    "deliveryStatus": "NO_ENTREGADA",
    "clientPaymentStatus": "NO_COBRADO",
    "driverPaymentStatus": "RETENIDO"
  }
}
```

---

# SECCIÓN Q — ERRORES ESPERADOS

## 78. Pedido no asignado al motorista

```json
{
  "success": false,
  "message": "No tienes permiso para operar este pedido."
}
```

---

## 79. Estado inválido

```json
{
  "success": false,
  "message": "El pedido no se encuentra en un estado válido para esta acción."
}
```

---

## 80. Monto cobrado incorrecto

```json
{
  "success": false,
  "message": "El monto cobrado no coincide con el total del pedido."
}
```

---

## 81. Motivo obligatorio

```json
{
  "success": false,
  "message": "Debes indicar el motivo por el cual no se pudo entregar el pedido."
}
```

---

# SECCIÓN R — DISEÑO VISUAL

## 82. Consideraciones visuales

1. La PWA debe estar optimizada para móvil.
2. El diseño debe ser simple y operativo.
3. Las cards deben ser compactas.
4. Los botones deben ser grandes solo cuando sean acciones críticas, pero sin verse robustos.
5. El total a cobrar debe ser muy visible.
6. El método de pago debe estar claramente identificado.
7. Los estados deben verse como badges.
8. Los modales deben aparecer centrados.
9. El fondo debe quedar bloqueado cuando aparezca un modal.
10. Las confirmaciones críticas deben ser claras.
11. No saturar la pantalla con información administrativa.
12. Evitar textos largos en las cards.
13. Usar secciones plegables si la información es extensa.

---

## 83. Botones principales

```txt
Marcar en ruta
Confirmar entrega
No se pudo entregar
Ver detalle
```

---

## 84. Badges sugeridos

```txt
Asignada
En ruta
Entregada
No entregada
Cancelada
Pendiente de cobro
Cobrado en efectivo
No cobrado
```

---

## 85. Alertas visuales

### Total a cobrar

```txt
Total a cobrar: Q399.00
```

Debe estar destacado.

### Pago

```txt
Pago: Efectivo contra entrega
```

### Advertencia antes de confirmar

```txt
Verifica que recibiste el efectivo completo antes de confirmar la entrega.
```

---

# SECCIÓN S — CASOS DE USO

## 86. Caso de uso 1: Motorista inicia sesión

1. Motorista ingresa a la PWA Motorista.
2. Ingresa credenciales.
3. Sistema valida usuario, estado y acceso.
4. Si todo es correcto, ingresa al dashboard.

### Resultado esperado

El motorista accede únicamente a sus entregas asignadas.

---

## 87. Caso de uso 2: Motorista consulta entregas asignadas

1. Motorista ingresa al dashboard.
2. Selecciona **Mis entregas**.
3. Sistema muestra pedidos asignados.
4. Motorista filtra por fecha o estado.

### Resultado esperado

El motorista puede consultar su trabajo operativo.

---

## 88. Caso de uso 3: Motorista marca pedido en ruta

1. Motorista abre una entrega asignada.
2. Presiona **Marcar en ruta**.
3. Confirma acción.
4. Sistema actualiza estado.
5. Cliente recibe notificación.

### Resultado esperado

El pedido queda en ruta sin usar ubicación en tiempo real.

---

## 89. Caso de uso 4: Motorista confirma entrega y cobro

1. Motorista entrega el paquete.
2. Recibe efectivo del cliente.
3. Abre detalle del pedido.
4. Presiona **Confirmar entrega**.
5. Ingresa monto cobrado.
6. Marca confirmación de entrega y cobro.
7. Sistema valida monto.
8. Sistema actualiza estados.

### Resultado esperado

El pedido queda entregado y el pago del cliente queda cobrado en efectivo.

---

## 90. Caso de uso 5: Motorista registra no entrega

1. Motorista intenta entregar pedido.
2. No logra concretar la entrega.
3. Presiona **No se pudo entregar**.
4. Selecciona motivo.
5. Ingresa comentario.
6. Sistema registra incidencia.

### Resultado esperado

El pedido queda como no entregado y el admin puede revisar el caso.

---

## 91. Caso de uso 6: Motorista intenta operar pedido ajeno

1. Motorista intenta abrir un pedido no asignado a él.
2. Backend valida relación.
3. Sistema rechaza acceso.

### Resultado esperado

El motorista no puede ver ni operar pedidos que no le corresponden.

---

# SECCIÓN T — CRITERIOS DE ACEPTACIÓN

## 92. Criterios funcionales

1. Debe existir una PWA Motorista con rutas propias.
2. El motorista debe poder iniciar sesión.
3. El sistema debe validar que el motorista esté activo.
4. El sistema debe validar que el acceso esté habilitado.
5. Si tiene cambio obligatorio de contraseña, debe cambiarla antes de ingresar.
6. El motorista debe ver un dashboard operativo.
7. El dashboard debe mostrar entregas asignadas al motorista autenticado.
8. El motorista no debe ver entregas de otros motoristas.
9. El motorista debe poder ver listado de entregas.
10. El listado debe permitir filtrar por estado.
11. El listado debe permitir filtrar por fecha.
12. El listado debe mostrar número de pedido, cliente, dirección resumida, horario, total y estado.
13. El motorista debe poder abrir detalle de entrega.
14. El detalle debe mostrar cliente, teléfono, dirección y referencia.
15. El detalle debe mostrar productos del pedido.
16. El detalle debe mostrar total a cobrar.
17. El método de pago debe mostrarse como efectivo contra entrega.
18. No debe existir opción de pago con tarjeta.
19. No debe existir opción de transferencia.
20. No debe existir geolocalización en tiempo real.
21. No debe existir mapa obligatorio.
22. El seguimiento debe manejarse por estados.
23. El motorista debe poder marcar pedido en ruta.
24. Marcar en ruta debe cambiar estado de entrega a En ruta.
25. Marcar en ruta debe registrar timeline.
26. Marcar en ruta debe notificar al cliente.
27. El motorista debe poder confirmar entrega solo si el pedido está en ruta.
28. Confirmar entrega debe exigir monto cobrado.
29. Confirmar entrega debe exigir confirmación de entrega.
30. Confirmar entrega debe exigir confirmación de cobro en efectivo.
31. El monto cobrado debe coincidir con el total del pedido.
32. Si el monto no coincide, debe bloquear confirmación.
33. Al confirmar entrega, el pedido debe quedar Entregado.
34. Al confirmar entrega, el pago del cliente debe quedar Cobrado en efectivo.
35. Al confirmar entrega, el pago del motorista debe quedar Pendiente de liquidar.
36. El motorista no debe liquidar su propio pago.
37. El motorista debe poder registrar no entrega.
38. Registrar no entrega debe exigir motivo.
39. Registrar no entrega debe exigir comentario.
40. Al registrar no entrega, el pedido debe quedar No entregado.
41. Al registrar no entrega, el pago del cliente debe quedar No cobrado.
42. El pago al motorista debe quedar retenido o pendiente de revisión.
43. El admin debe poder ver la incidencia.
44. El cliente debe recibir notificación por entrega o no entrega.
45. Todas las acciones deben validarse en backend.
46. El frontend no debe ser la única capa de seguridad.
47. El motorista no debe poder modificar productos.
48. El motorista no debe poder modificar precios.
49. El motorista no debe poder modificar cantidades.
50. El motorista no debe poder cambiar dirección.
51. El motorista no debe poder reprogramar entrega.
52. El motorista no debe poder asignar otro motorista.
53. El motorista no debe poder cancelar el pedido.
54. La PWA debe tener diseño móvil compacto.
55. Los modales deben aparecer centrados.
56. El fondo debe quedar bloqueado al mostrar modales.
57. Las acciones críticas deben pedir confirmación.
58. Cada pantalla debe tener ruta propia.
59. Cada componente debe estar separado por responsabilidad.
60. La PWA Motorista debe integrarse con Pedidos Admin, Agenda de Entregas y Liquidación de Motoristas.

---

## 93. Resultado esperado del FRD

Al finalizar este desarrollo, cada motorista tendrá una PWA operativa donde podrá consultar únicamente sus entregas asignadas, ver el detalle necesario para realizar la entrega, marcar el pedido en ruta, confirmar entrega y cobro en efectivo, o registrar una no entrega con motivo.

El módulo permitirá operar entregas sin ubicación en tiempo real, manteniendo trazabilidad por estados y dejando la información lista para que Admin controle pagos, incidencias y liquidaciones de motoristas.
