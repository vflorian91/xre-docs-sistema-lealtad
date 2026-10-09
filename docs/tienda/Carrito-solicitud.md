# FRD 03 — Carrito y Solicitud de Pedido

## 1. Información general del requerimiento

### Nombre del módulo

Carrito y Solicitud de Pedido

### Plataforma

PWA Cliente

### Tipo de módulo

Módulo transaccional para selección de productos, validación de carrito, captura de datos de entrega y creación de solicitud de pedido con pago en efectivo contra entrega.

### Objetivo general

Permitir que el cliente pueda agregar productos de la tienda al carrito, revisar cantidades, validar disponibilidad, ingresar o seleccionar dirección de entrega, sugerir una fecha de entrega y confirmar una solicitud de pedido.

El pedido generado desde este módulo no debe quedar automáticamente confirmado para entrega. Debe quedar en estado inicial **Pedido solicitado**, pendiente de revisión, confirmación o reprogramación por parte del administrador.

---

## 2. Contexto funcional

La PWA Cliente contará con una sección de tienda donde se mostrarán productos de diferentes marcas. El cliente podrá agregar productos al carrito y solicitar el pedido.

La empresa será responsable de la entrega de los productos y podrá asignar uno o varios motoristas según disponibilidad. El cliente no pagará en línea. El único método de pago será **efectivo contra entrega**.

La fecha de entrega seleccionada por el cliente será únicamente una fecha sugerida. La entrega real deberá ser confirmada o reprogramada por el administrador.

---

## 3. Alcance del FRD

Este FRD contempla:

* Agregar productos al carrito.
* Modificar cantidades.
* Eliminar productos del carrito.
* Validar stock disponible.
* Mostrar resumen de compra.
* Mostrar método de pago fijo.
* Capturar dirección de entrega.
* Capturar teléfono de contacto.
* Capturar referencia de dirección.
* Permitir fecha sugerida de entrega.
* Bloquear entregas para el mismo día.
* Mostrar modal de confirmación.
* Crear solicitud de pedido.
* Generar número de pedido.
* Guardar snapshot de productos, precios y marcas.
* Crear estado inicial del pedido.
* Crear trazabilidad inicial.
* Mostrar confirmación de solicitud.
* Redirigir a detalle del pedido o a Mis pedidos.

---

## 4. Fuera de alcance

Este FRD no contempla:

* Confirmación del pedido por admin.
* Reprogramación administrativa.
* Asignación de motorista.
* Pago al motorista.
* Liquidación de motorista.
* Reportes.
* Control avanzado de agenda.
* Pasarela de pago.
* Pago con tarjeta.
* Pago por transferencia.
* Geolocalización en tiempo real.
* Descuento definitivo de inventario.
* Gestión administrativa de productos.

---

## 5. Reglas generales del módulo

1. El cliente debe poder agregar productos activos y visibles al carrito.
2. El carrito debe aceptar productos de diferentes marcas en un mismo pedido.
3. No debe existir segmentación por cliente, puntos, nivel o marca.
4. Todos los productos agregados deben validarse antes de crear el pedido.
5. No se debe permitir confirmar un pedido con carrito vacío.
6. No se debe permitir confirmar productos sin stock.
7. No se debe permitir confirmar cantidades mayores al stock disponible.
8. El método de pago debe ser únicamente **efectivo contra entrega**.
9. No debe mostrarse selección de método de pago.
10. No debe existir integración con pasarela de pago.
11. No debe solicitar datos de tarjeta.
12. La fecha sugerida de entrega debe ser obligatoria.
13. La fecha sugerida no puede ser el mismo día de la solicitud.
14. La primera fecha permitida debe ser como mínimo el día siguiente.
15. La fecha sugerida no confirma la entrega.
16. El pedido debe quedar pendiente de revisión administrativa.
17. El pedido debe nacer con estado de pago **Pendiente de cobro**.
18. El pedido debe nacer sin motorista asignado.
19. El pedido debe nacer sin pago de motorista asignado.
20. El cliente debe recibir confirmación visual de que su solicitud fue registrada.
21. El sistema debe guardar snapshot del nombre, marca y precio de cada producto al momento de solicitar el pedido.
22. El stock no debe descontarse al crear la solicitud; se recomienda descontar al confirmar el pedido desde admin.
23. El cliente solo debe poder ver y modificar su propio carrito.
24. El cliente solo debe poder crear pedidos para sí mismo.
25. El sistema debe registrar trazabilidad inicial del pedido.

---

## 6. Rutas sugeridas

### PWA Cliente

```txt
/tienda-online/carrito
/tienda-online/confirmacion
/tienda-online/mis-pedidos/[pedidoId]
```

### APIs sugeridas

```txt
GET /api/pwa-client/store/cart
POST /api/pwa-client/store/cart/items
PATCH /api/pwa-client/store/cart/items/:itemId
DELETE /api/pwa-client/store/cart/items/:itemId
DELETE /api/pwa-client/store/cart
POST /api/pwa-client/store/orders
GET /api/pwa-client/store/orders/:orderId
```

---

## 7. Estructura sugerida de archivos

```txt
app/
  pwa-cliente/
    tienda/
      carrito/
        page.tsx
        components/
          CartHeader.tsx
          CartItem.tsx
          CartItemsList.tsx
          CartSummary.tsx
          CartEmptyState.tsx
          DeliveryAddressForm.tsx
          DeliveryDateSelector.tsx
          PaymentMethodInfo.tsx
          ConfirmOrderModal.tsx
          OrderValidationAlert.tsx
      confirmacion/
        page.tsx
        components/
          OrderSuccessCard.tsx
          OrderNextSteps.tsx

lib/
  services/
    store/
      storeCartService.ts
      storeOrderRequestService.ts
      storeOrderValidationService.ts
      storeOrderTimelineService.ts

types/
  store/
    cart.ts
    orderRequest.ts
    orderItem.ts
    delivery.ts
```

---

# SECCIÓN A — CARRITO

## 8. Pantalla: Carrito

### Ruta

```txt
/tienda-online/carrito
```

### Objetivo

Permitir que el cliente revise los productos seleccionados antes de solicitar el pedido.

### Elementos principales

La pantalla debe contener:

1. Encabezado del carrito.
2. Listado de productos agregados.
3. Control de cantidad por producto.
4. Botón para eliminar producto.
5. Resumen de montos.
6. Información de método de pago.
7. Formulario de dirección de entrega.
8. Selector de fecha sugerida.
9. Mensaje de entrega sujeta a confirmación.
10. Botón **Solicitar pedido**.

---

## 9. Card de producto en carrito

Cada producto dentro del carrito debe mostrar:

* Imagen.
* Marca.
* Nombre del producto.
* Precio unitario.
* Cantidad.
* Subtotal.
* Botón eliminar.
* Control para aumentar o disminuir cantidad.

### Ejemplo visual

```txt
[Imagen]

Nine West
Zapato casual dama color negro
Q399.00

Cantidad: [-] 1 [+]

Subtotal: Q399.00

[Eliminar]
```

---

## 10. Reglas para agregar productos al carrito

1. Solo se pueden agregar productos activos.
2. Solo se pueden agregar productos visibles en tienda.
3. Solo se pueden agregar productos de marcas activas.
4. Solo se pueden agregar productos con stock mayor a cero.
5. Si el producto ya existe en el carrito, se debe incrementar la cantidad.
6. Si el incremento supera stock disponible, debe bloquearse.
7. El cliente debe recibir mensaje si no puede agregar más unidades.
8. El sistema debe validar nuevamente en backend, no solo en frontend.

### Mensaje sugerido sin stock

```txt
Este producto no tiene disponibilidad en este momento.
```

### Mensaje sugerido por stock insuficiente

```txt
No puedes agregar más unidades porque superas el stock disponible.
```

---

## 11. Modificación de cantidades

### Acciones permitidas

* Aumentar cantidad.
* Disminuir cantidad.
* Eliminar producto.

### Reglas

1. La cantidad mínima debe ser 1.
2. La cantidad máxima debe ser igual al stock disponible.
3. No se deben permitir cantidades decimales.
4. Si el cliente reduce una cantidad a cero, se debe solicitar eliminar el producto o eliminarlo directamente según el diseño.
5. Al cambiar cantidad, el subtotal debe actualizarse automáticamente.
6. El total del carrito debe recalcularse automáticamente.
7. Toda actualización debe validar stock en backend.

---

## 12. Eliminación de productos

### Acción

Botón **Eliminar**

### Reglas

1. El cliente puede eliminar cualquier producto de su carrito.
2. Al eliminar, debe recalcularse el total.
3. Si el carrito queda vacío, debe mostrarse estado vacío.
4. No debe eliminar productos de pedidos ya creados.
5. Solo aplica al carrito antes de confirmar solicitud.

### Mensaje sugerido

```txt
Producto eliminado del carrito.
```

---

## 13. Estado vacío del carrito

Si el cliente no tiene productos agregados, debe mostrarse una pantalla limpia.

### Texto sugerido

```txt
Tu carrito está vacío.

Agrega productos desde la tienda para solicitar tu pedido.
```

### Botón sugerido

```txt
Ir a tienda
```

---

## 14. Resumen del carrito

El resumen debe mostrar:

* Subtotal de productos.
* Costo de envío, si aplica.
* Total a pagar.
* Método de pago.

### Reglas

1. El subtotal debe ser la suma de todos los productos.
2. El total debe calcularse en quetzales.
3. Si todavía no se maneja costo de envío, mostrar Q0.00 o no mostrar esa línea.
4. Si se manejará costo de envío en fase posterior, dejar estructura preparada.
5. El total debe mostrarse claramente antes de confirmar.

### Ejemplo

```txt
Resumen

Subtotal: Q399.00
Envío: Q0.00
Total a pagar: Q399.00
```

---

# SECCIÓN B — MÉTODO DE PAGO

## 15. Método de pago fijo

### Método permitido

```txt
Efectivo contra entrega
```

### Reglas

1. No debe existir selector de método de pago.
2. No debe haber opción de tarjeta.
3. No debe haber opción de transferencia.
4. No debe haber opción de POS.
5. No debe haber opción de billetera digital.
6. El pedido debe crearse con método de pago fijo.
7. El pago debe quedar pendiente hasta que el motorista o admin confirme cobro.
8. El cliente debe entender que no está pagando en la app.

### Texto sugerido en carrito

```txt
Método de pago

Efectivo contra entrega

El pago se realizará al momento de recibir tu pedido.
```

---

## 16. Estado inicial del pago del cliente

Al crear el pedido, el estado de pago debe ser:

```txt
PENDIENTE_COBRO
```

### Estados relacionados

```txt
PENDIENTE_COBRO
COBRADO_EFECTIVO
NO_COBRADO
ANULADO
```

### Reglas

1. El estado inicial siempre será **Pendiente de cobro**.
2. La PWA Cliente no debe marcar pagos como cobrados.
3. El cobro se confirmará posteriormente desde la PWA Motorista o desde Admin.
4. El cliente puede ver el estado de pago, pero no puede modificarlo.

---

# SECCIÓN C — DATOS DE ENTREGA

## 17. Dirección de entrega

### Objetivo

Capturar la dirección donde el cliente desea recibir el pedido.

### Campos requeridos

* Dirección.
* Departamento.
* Municipio.
* Zona.
* Teléfono de contacto.

### Campos opcionales

* Referencia de ubicación.
* Nombre de quien recibe.
* Comentarios para entrega.

---

## 18. Reglas de dirección

1. La dirección debe ser obligatoria.
2. El departamento debe ser obligatorio si el sistema usa catálogos geográficos.
3. El municipio debe ser obligatorio si el sistema usa catálogos geográficos.
4. La zona debe ser obligatoria si el sistema lo maneja como catálogo.
5. El teléfono debe ser obligatorio.
6. El teléfono debe validarse con 8 dígitos si se mantiene la lógica de Guatemala.
7. Si el usuario ingresa espacios en el teléfono, deben eliminarse automáticamente.
8. La referencia puede ser opcional, pero debe recomendarse.
9. No se debe solicitar ubicación GPS en tiempo real.
10. No se debe mostrar mapa obligatorio.
11. La dirección capturada debe guardarse como snapshot en el pedido.

---

## 19. Uso de dirección registrada en perfil

Si el cliente ya tiene dirección registrada en su perfil, el sistema puede mostrarla precargada.

### Reglas

1. El cliente debe poder usar su dirección registrada.
2. El cliente debe poder modificar la dirección para ese pedido.
3. Modificar la dirección del pedido no necesariamente debe actualizar el perfil.
4. Si se desea actualizar perfil, debe mostrarse una opción separada.
5. La dirección usada en el pedido debe quedar congelada como snapshot.

### Opción sugerida

```txt
Usar esta dirección para este pedido
```

Opcional:

```txt
Guardar también en mi perfil
```

---

## 20. Fecha sugerida de entrega

### Campo

**Fecha sugerida de entrega**

### Objetivo

Permitir al cliente indicar cuándo desea recibir el pedido, sujeto a confirmación administrativa.

### Reglas principales

1. La fecha sugerida debe ser obligatoria.
2. No puede ser el mismo día de la solicitud.
3. La fecha mínima debe ser el día siguiente.
4. Debe mostrarse calendario o selector de fecha.
5. No debe permitir fechas anteriores.
6. No debe permitir fecha actual.
7. La fecha seleccionada no es definitiva.
8. El admin podrá confirmar o reprogramar la entrega.
9. El sistema debe guardar la fecha sugerida.
10. El pedido debe iniciar con fecha confirmada en null.

### Texto sugerido

```txt
Selecciona una fecha sugerida para la entrega.

Nuestro equipo confirmará o reprogramará la fecha según disponibilidad.
```

---

## 21. Validación de fecha mínima

### Regla

Si la fecha de solicitud es:

```txt
26/06/2026
```

La primera fecha permitida debe ser:

```txt
27/06/2026
```

### Pseudológica

```txt
fecha_minima_entrega = fecha_actual + 1 día
```

### Validación

1. Validar en frontend para mejorar experiencia.
2. Validar en backend para seguridad.
3. Si el cliente intenta enviar fecha inválida, rechazar solicitud.
4. Mostrar mensaje claro.

### Mensaje sugerido

```txt
La entrega no puede programarse para el mismo día. Selecciona una fecha a partir de mañana.
```

---

## 22. Rango horario de entrega

### Decisión recomendada

En esta fase, el cliente puede sugerir fecha, pero el rango horario debe confirmarlo el admin.

### Opciones

#### Opción A — Cliente solo selecciona fecha

Recomendada para iniciar.

El admin luego define rango horario.

#### Opción B — Cliente selecciona fecha y horario sugerido

Puede implementarse si la empresa ya tiene rangos definidos.

Rangos sugeridos:

```txt
09:00 a 12:00
12:00 a 15:00
15:00 a 18:00
```

### Recomendación

Para evitar compromisos operativos, usar inicialmente la **Opción A**: el cliente solo sugiere fecha.

---

# SECCIÓN D — VALIDACIÓN PREVIA

## 23. Validaciones antes de confirmar solicitud

Antes de mostrar el modal de confirmación, el sistema debe validar:

1. Que el carrito no esté vacío.
2. Que todos los productos sigan activos.
3. Que todos los productos sigan visibles en tienda.
4. Que las marcas sigan activas.
5. Que haya stock suficiente.
6. Que las cantidades sean válidas.
7. Que el precio sea válido.
8. Que la dirección esté completa.
9. Que el teléfono esté completo.
10. Que la fecha sugerida sea válida.
11. Que la fecha sugerida no sea hoy.
12. Que la fecha sugerida no sea anterior a hoy.
13. Que el cliente esté autenticado.
14. Que el cliente esté activo.
15. Que el método de pago sea efectivo contra entrega.

---

## 24. Manejo de cambios de producto antes de confirmar

Puede ocurrir que el producto cambie mientras está en el carrito.

### Casos

1. Producto inactivado.
2. Producto ocultado de tienda.
3. Marca inactivada.
4. Precio cambiado.
5. Stock reducido.
6. Producto eliminado lógicamente.

### Reglas

1. Si un producto ya no está disponible, debe bloquearse la confirmación.
2. Si el precio cambió, debe actualizarse el carrito y avisar al cliente.
3. Si el stock ya no alcanza, debe ajustar o solicitar modificar cantidad.
4. Si la marca fue inactivada, el producto no debe poder confirmarse.
5. El sistema debe mostrar una alerta clara.

### Mensaje por producto no disponible

```txt
Uno o más productos de tu carrito ya no están disponibles. Revisa tu carrito antes de continuar.
```

### Mensaje por cambio de precio

```txt
El precio de uno o más productos cambió. Actualizamos tu carrito antes de confirmar.
```

---

# SECCIÓN E — MODAL DE CONFIRMACIÓN

## 25. Modal: Confirmar solicitud de pedido

### Disparador

Botón:

```txt
Solicitar pedido
```

### Objetivo

Confirmar con el cliente antes de crear la solicitud de pedido.

### Información a mostrar

* Título del modal.
* Total del pedido.
* Método de pago.
* Dirección de entrega.
* Fecha sugerida.
* Mensaje de revisión administrativa.
* Botón cancelar.
* Botón confirmar.

### Texto sugerido

```txt
Confirmar solicitud de pedido

Total a pagar: Q399.00
Método de pago: Efectivo contra entrega
Fecha sugerida de entrega: 27/06/2026

Nuestro equipo revisará disponibilidad y confirmará o reprogramará la entrega según disponibilidad.

El pago se realizará al momento de recibir tu pedido.
```

### Botones

```txt
Cancelar
Confirmar solicitud
```

---

## 26. Reglas del modal

1. El modal debe bloquear el fondo.
2. El modal debe aparecer centrado.
3. El fondo debe quedar inactivo.
4. El diseño debe parecerse al estilo de popup usado en otros módulos.
5. El botón confirmar debe deshabilitarse mientras se procesa la solicitud.
6. Si ocurre error, debe mostrarse mensaje sin cerrar el modal.
7. Si se crea correctamente, debe cerrar y redirigir a confirmación o detalle del pedido.
8. No debe crear doble pedido si el cliente presiona varias veces.

---

# SECCIÓN F — CREACIÓN DE SOLICITUD

## 27. Creación del pedido

Al confirmar, el sistema debe crear un pedido.

### Estados iniciales

```txt
estado_pedido = PEDIDO_SOLICITADO
estado_pago_cliente = PENDIENTE_COBRO
estado_entrega = PENDIENTE_PROGRAMACION
estado_pago_motorista = NO_ASIGNADO
metodo_pago = EFECTIVO_CONTRA_ENTREGA
motorista_id = null
pago_motorista = null
fecha_confirmada_entrega = null
```

---

## 28. Número de pedido

El sistema debe generar un número único de pedido.

### Formato sugerido

```txt
PED-000001
PED-000002
PED-000003
```

También puede incluir año:

```txt
PED-2026-000001
```

### Reglas

1. Debe ser único.
2. Debe ser legible para cliente y admin.
3. Debe mostrarse en Mis pedidos.
4. Debe mostrarse en el detalle del pedido.
5. Debe usarse como referencia para soporte.

---

## 29. Snapshot del pedido

Al crear la solicitud, el sistema debe guardar snapshot de datos clave para evitar inconsistencias si luego cambian los productos.

### Snapshot por producto

* ID de producto.
* Nombre del producto al momento del pedido.
* ID de marca.
* Nombre de marca al momento del pedido.
* Precio unitario al momento del pedido.
* Cantidad solicitada.
* Subtotal.
* Imagen principal, si se desea congelar referencia.

### Snapshot de entrega

* Dirección ingresada.
* Departamento.
* Municipio.
* Zona.
* Referencia.
* Teléfono.
* Fecha sugerida.

### Snapshot comercial

* Subtotal.
* Envío, si aplica.
* Total.
* Método de pago.

---

## 30. Stock en solicitud de pedido

### Regla recomendada

El stock no debe descontarse cuando el cliente solicita el pedido.

### Motivo

El pedido aún requiere revisión administrativa. La empresa puede confirmar, reprogramar o cancelar.

### Reglas

1. Al solicitar, solo validar disponibilidad.
2. No descontar stock todavía.
3. Descontar stock cuando el admin confirme el pedido.
4. Si al confirmar ya no hay stock, el admin debe poder cancelar o ajustar.
5. La validación de stock en solicitud evita solicitudes evidentemente inválidas.

---

## 31. Trazabilidad inicial

Al crear el pedido, debe insertarse un registro en la línea de tiempo.

### Registro inicial

```txt
Estado: PEDIDO_SOLICITADO
Tipo: PEDIDO
Comentario: Pedido solicitado por el cliente desde la PWA.
Usuario: cliente autenticado
Fecha y hora: timestamp actual
```

### Reglas

1. Debe guardarse automáticamente.
2. Debe asociarse al pedido.
3. Debe mostrarse en la línea de tiempo del cliente.
4. Debe mostrarse en el historial admin.
5. Debe permitir calcular duración en etapas posteriores.

---

## 32. Notificación inicial

Al crear el pedido, el sistema debe generar notificación para el cliente.

### Notificación sugerida

```txt
Tu pedido fue solicitado correctamente. Nuestro equipo revisará disponibilidad y programación de entrega.
```

### Reglas

1. Debe quedar registrada en el centro de notificaciones de la PWA Cliente.
2. Puede mostrarse como toast inmediato.
3. No requiere WhatsApp.
4. No requiere SMS.
5. Puede disparar notificación push si la lógica ya existe.

---

# SECCIÓN G — CONFIRMACIÓN VISUAL

## 33. Pantalla de solicitud exitosa

### Ruta sugerida

```txt
/tienda-online/confirmacion
```

### Objetivo

Confirmar al cliente que el pedido fue recibido por el sistema.

### Información a mostrar

* Icono de éxito.
* Número de pedido.
* Total.
* Método de pago.
* Fecha sugerida.
* Mensaje de revisión administrativa.
* Botón para ver pedido.
* Botón para volver a tienda.

### Mensaje sugerido

```txt
Tu pedido fue solicitado correctamente.

Pedido: PED-2026-000001

Nuestro equipo revisará disponibilidad y confirmará o reprogramará la entrega según disponibilidad.

El pago se realizará en efectivo al momento de recibir tu pedido.
```

### Botones

```txt
Ver mi pedido
Volver a tienda
```

---

## 34. Limpieza del carrito

Después de crear correctamente la solicitud:

1. El carrito debe limpiarse.
2. Los productos deben quedar registrados en el pedido.
3. No debe perderse la información del pedido.
4. Si ocurre error al crear pedido, el carrito no debe limpiarse.
5. Si el cliente regresa al carrito después de éxito, debe mostrarse vacío.

---

# SECCIÓN H — MODELO DE DATOS

## 35. Tabla: store_carts

```txt
id
client_id
status
created_at
updated_at
```

### Estados sugeridos

```txt
ACTIVE
ORDERED
ABANDONED
```

---

## 36. Tabla: store_cart_items

```txt
id
cart_id
product_id
quantity
unit_price_snapshot
created_at
updated_at
```

### Reglas

1. El carrito pertenece a un cliente.
2. Cada producto puede existir una sola vez por carrito.
3. Si se agrega el mismo producto, se actualiza cantidad.
4. El precio snapshot en carrito puede actualizarse antes de confirmar.
5. El pedido debe guardar snapshot final.

---

## 37. Tabla: store_orders

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
created_at
updated_at
cancelled_at
cancel_reason
```

---

## 38. Tabla: store_order_items

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

## 39. Tabla: store_order_timeline

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
created_at
```

### status_type sugeridos

```txt
ORDER_STATUS
PAYMENT_STATUS
DELIVERY_STATUS
DRIVER_PAYMENT_STATUS
```

---

# SECCIÓN I — SERVICIOS

## 40. Servicios sugeridos

```txt
StoreCartService
StoreCartValidationService
StoreOrderRequestService
StoreOrderNumberService
StoreOrderTimelineService
StoreNotificationService
```

---

## 41. StoreCartService

### Responsabilidades

* Obtener carrito activo del cliente.
* Crear carrito si no existe.
* Agregar productos.
* Actualizar cantidades.
* Eliminar productos.
* Limpiar carrito.
* Calcular totales.

---

## 42. StoreCartValidationService

### Responsabilidades

* Validar productos activos.
* Validar marcas activas.
* Validar visibilidad en tienda.
* Validar stock.
* Validar cantidades.
* Validar precios.
* Validar carrito antes de crear pedido.

---

## 43. StoreOrderRequestService

### Responsabilidades

* Crear solicitud de pedido.
* Guardar snapshots.
* Asignar estados iniciales.
* Guardar dirección de entrega.
* Guardar fecha sugerida.
* Crear relación con cliente.
* Limpiar carrito después de crear pedido.

---

## 44. StoreOrderNumberService

### Responsabilidades

* Generar número único de pedido.
* Garantizar correlativo.
* Evitar duplicados.
* Formatear número visible.

---

## 45. StoreOrderTimelineService

### Responsabilidades

* Crear trazabilidad inicial.
* Registrar cambios futuros de estado.
* Asociar usuario o cliente que ejecuta acción.
* Permitir lectura de timeline.

---

# SECCIÓN J — ENDPOINTS

## 46. Obtener carrito

```txt
GET /api/pwa-client/store/cart
```

### Respuesta esperada

```json
{
  "success": true,
  "cart": {
    "id": "cart_123",
    "items": [
      {
        "id": "item_1",
        "productId": "prod_1",
        "brandName": "Nine West",
        "productName": "Zapato casual dama",
        "imageUrl": "/images/product.png",
        "unitPrice": 399.00,
        "quantity": 1,
        "subtotal": 399.00,
        "availableStock": 5
      }
    ],
    "subtotal": 399.00,
    "shippingAmount": 0.00,
    "total": 399.00
  }
}
```

---

## 47. Agregar producto al carrito

```txt
POST /api/pwa-client/store/cart/items
```

### Request

```json
{
  "productId": "prod_1",
  "quantity": 1
}
```

### Respuesta

```json
{
  "success": true,
  "message": "Producto agregado al carrito."
}
```

---

## 48. Actualizar cantidad

```txt
PATCH /api/pwa-client/store/cart/items/:itemId
```

### Request

```json
{
  "quantity": 2
}
```

### Respuesta

```json
{
  "success": true,
  "message": "Cantidad actualizada."
}
```

---

## 49. Eliminar producto del carrito

```txt
DELETE /api/pwa-client/store/cart/items/:itemId
```

### Respuesta

```json
{
  "success": true,
  "message": "Producto eliminado del carrito."
}
```

---

## 50. Crear solicitud de pedido

```txt
POST /api/pwa-client/store/orders
```

### Request

```json
{
  "deliveryAddress": "10 avenida 5-20 zona 10",
  "deliveryDepartmentId": "dep_1",
  "deliveryMunicipalityId": "mun_1",
  "deliveryZoneId": "zone_10",
  "deliveryReference": "Casa color blanco, portón negro",
  "deliveryPhone": "55555555",
  "receiverName": "Karina Monzón",
  "suggestedDeliveryDate": "2026-06-27"
}
```

### Respuesta exitosa

```json
{
  "success": true,
  "message": "Pedido solicitado correctamente.",
  "order": {
    "id": "order_123",
    "orderNumber": "PED-2026-000001",
    "orderStatus": "PEDIDO_SOLICITADO",
    "paymentStatus": "PENDIENTE_COBRO",
    "deliveryStatus": "PENDIENTE_PROGRAMACION",
    "paymentMethod": "EFECTIVO_CONTRA_ENTREGA",
    "totalAmount": 399.00,
    "suggestedDeliveryDate": "2026-06-27"
  }
}
```

---

## 51. Errores esperados

### Carrito vacío

```json
{
  "success": false,
  "message": "No puedes solicitar un pedido con el carrito vacío."
}
```

### Fecha inválida

```json
{
  "success": false,
  "message": "La entrega no puede programarse para el mismo día. Selecciona una fecha a partir de mañana."
}
```

### Stock insuficiente

```json
{
  "success": false,
  "message": "Uno o más productos no cuentan con stock suficiente."
}
```

### Producto no disponible

```json
{
  "success": false,
  "message": "Uno o más productos ya no están disponibles."
}
```

---

# SECCIÓN K — DISEÑO VISUAL

## 52. Consideraciones de diseño

### Pantalla carrito

1. Diseño móvil compacto.
2. Cards limpias por producto.
3. Botones pequeños.
4. Cantidad fácil de modificar.
5. Resumen visible.
6. Total destacado.
7. Método de pago claro.
8. Mensajes de entrega entendibles.
9. Modal centrado.
10. Fondo bloqueado cuando aparece modal.

---

## 53. Botones sugeridos

### Primarios

```txt
Solicitar pedido
Confirmar solicitud
Ver mi pedido
```

### Secundarios

```txt
Volver a tienda
Eliminar
Cancelar
```

---

## 54. Mensajes visuales importantes

### Pago

```txt
El pago se realizará en efectivo al momento de recibir tu pedido.
```

### Fecha sugerida

```txt
La fecha seleccionada está sujeta a confirmación por nuestro equipo.
```

### Pedido solicitado

```txt
Tu pedido fue recibido. Te notificaremos cuando sea confirmado o reprogramado.
```

---

# SECCIÓN L — CASOS DE USO

## 55. Caso de uso 1: Cliente agrega producto al carrito

1. Cliente entra a Tienda.
2. Selecciona un producto.
3. Presiona Agregar.
4. El sistema valida disponibilidad.
5. El producto se agrega al carrito.

### Resultado esperado

El producto aparece en el carrito con cantidad, precio y subtotal correcto.

---

## 56. Caso de uso 2: Cliente modifica cantidad

1. Cliente entra al carrito.
2. Aumenta cantidad de un producto.
3. El sistema valida stock.
4. El subtotal y total se actualizan.

### Resultado esperado

La cantidad queda actualizada sin superar el stock disponible.

---

## 57. Caso de uso 3: Cliente elimina producto

1. Cliente entra al carrito.
2. Presiona eliminar.
3. El sistema elimina el producto.
4. El total se recalcula.

### Resultado esperado

El producto ya no aparece en el carrito.

---

## 58. Caso de uso 4: Cliente selecciona fecha válida

1. Cliente entra al carrito.
2. Selecciona fecha de entrega.
3. El sistema valida que no sea hoy.
4. El cliente continúa.

### Resultado esperado

La fecha sugerida queda lista para enviarse en la solicitud.

---

## 59. Caso de uso 5: Cliente intenta seleccionar entrega para hoy

1. Cliente entra al carrito.
2. Intenta seleccionar la fecha actual.
3. El sistema bloquea la selección o muestra error.

### Resultado esperado

No se permite continuar con fecha del mismo día.

---

## 60. Caso de uso 6: Cliente confirma solicitud

1. Cliente revisa carrito.
2. Ingresa dirección.
3. Selecciona fecha sugerida.
4. Presiona Solicitar pedido.
5. El sistema muestra modal.
6. Cliente confirma.
7. El sistema crea pedido.

### Resultado esperado

El pedido queda creado como **Pedido solicitado** y pago **Pendiente de cobro**.

---

# SECCIÓN M — CRITERIOS DE ACEPTACIÓN

## 61. Criterios funcionales

1. El cliente debe poder agregar productos al carrito.
2. El cliente debe poder ver su carrito.
3. El cliente debe poder modificar cantidades.
4. El cliente debe poder eliminar productos.
5. El sistema debe recalcular subtotales y total.
6. El sistema debe validar stock antes de agregar.
7. El sistema debe validar stock antes de confirmar.
8. No se debe permitir confirmar carrito vacío.
9. El método de pago debe mostrarse como efectivo contra entrega.
10. No debe existir opción de pago digital.
11. La dirección de entrega debe ser obligatoria.
12. El teléfono de contacto debe ser obligatorio.
13. El teléfono debe limpiarse de espacios.
14. La fecha sugerida de entrega debe ser obligatoria.
15. La fecha sugerida no puede ser el mismo día.
16. La primera fecha permitida debe ser el día siguiente.
17. Debe mostrarse mensaje de que la entrega está sujeta a confirmación.
18. Debe mostrarse modal antes de crear el pedido.
19. El modal debe mostrar total, método de pago, dirección y fecha sugerida.
20. Al confirmar, debe crearse un pedido.
21. El pedido debe tener número único.
22. El pedido debe nacer en estado **Pedido solicitado**.
23. El pago debe nacer como **Pendiente de cobro**.
24. La entrega debe nacer como **Pendiente de programación**.
25. El pedido debe nacer sin motorista asignado.
26. El pedido debe nacer sin pago de motorista.
27. El sistema debe guardar snapshot de productos.
28. El sistema debe guardar snapshot de precios.
29. El sistema debe guardar snapshot de marca.
30. El sistema debe guardar snapshot de dirección.
31. El sistema debe registrar trazabilidad inicial.
32. El sistema debe limpiar el carrito después de crear pedido.
33. Si falla la creación, el carrito no debe limpiarse.
34. El cliente debe ver pantalla o mensaje de éxito.
35. El cliente debe poder ir al detalle del pedido.
36. El cliente debe poder volver a tienda.
37. El cliente solo debe poder gestionar su propio carrito.
38. El cliente solo debe poder crear pedidos para sí mismo.
39. El diseño debe ser compacto y consistente con la PWA Cliente.
40. Cada pantalla debe tener ruta y archivo separado.

---

## 62. Resultado esperado del FRD

Al finalizar este desarrollo, el cliente podrá construir un carrito de productos desde la tienda, revisar el total, ingresar datos de entrega, sugerir una fecha válida y crear una solicitud de pedido con pago en efectivo contra entrega.

El pedido quedará pendiente de revisión administrativa, listo para que en los siguientes módulos el administrador pueda confirmar, reprogramar, asignar motorista, definir pago de motorista y controlar la entrega.
