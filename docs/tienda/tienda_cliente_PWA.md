# FRD 01 — Módulo Tienda Cliente PWA

## 1. Información general del requerimiento

### Nombre del módulo

Tienda Cliente PWA

### Plataforma

PWA Cliente

### Tipo de módulo

Módulo transaccional de visualización, selección y solicitud de productos para compra con pago en efectivo contra entrega.

### Objetivo general

Permitir que el cliente pueda ingresar desde la PWA Cliente a una sección de tienda, visualizar productos disponibles de diferentes marcas, buscar y filtrar productos por marca, agregar productos al carrito y generar una solicitud de pedido con entrega programada.

El módulo debe funcionar como una tienda dentro de la app, pero sin pagos digitales. El único método de pago permitido será **efectivo contra entrega**.

### Alcance principal

El cliente podrá:

* Ver todos los productos activos publicados en tienda.
* Buscar productos por nombre.
* Filtrar productos por marca.
* Ver el detalle de cada producto.
* Agregar productos al carrito.
* Seleccionar cantidades.
* Confirmar una solicitud de pedido.
* Sugerir una fecha de entrega.
* Consultar el estado de sus pedidos.
* Ver el detalle y trazabilidad básica del pedido.

### Fuera de alcance en este FRD

Este FRD no contempla:

* Administración de productos.
* Creación de marcas.
* Confirmación administrativa del pedido.
* Asignación de motorista.
* Liquidación de motoristas.
* Gestión interna de inventario.
* Geolocalización en tiempo real.
* Pago con tarjeta, transferencia, POS o pasarela de pago.

Esos puntos serán documentados en FRD posteriores.

---

## 2. Contexto funcional

El sistema ya cuenta con una PWA Cliente orientada al programa de lealtad. Se requiere agregar una nueva sección llamada **Tienda**, donde los clientes puedan comprar productos publicados por la empresa.

La empresa maneja varias marcas y es responsable de la entrega de los pedidos. Por lo tanto, el cliente debe poder ver productos de todas las marcas, sin segmentación por nivel, puntos, tipo de cliente o comportamiento de compra.

La tienda no debe comportarse como un canje. Es una compra normal, con precio en quetzales y pago en efectivo contra entrega.

---

## 3. Reglas generales del módulo

1. La tienda debe mostrar todos los productos activos a todos los clientes.
2. No debe existir segmentación por nivel de cliente.
3. No debe existir segmentación por puntos acumulados.
4. No debe ocultar productos según marca, nivel o historial del cliente.
5. El cliente debe poder filtrar productos por marca.
6. El cliente debe poder buscar productos por nombre.
7. El cliente debe poder agregar uno o varios productos al carrito.
8. El método de pago será únicamente **efectivo contra entrega**.
9. La app no debe solicitar pago en línea.
10. La app no debe mostrar opciones de tarjeta, transferencia o billetera digital.
11. La entrega no puede programarse para el mismo día en que se solicita el pedido.
12. La fecha sugerida por el cliente debe ser como mínimo el día siguiente a la fecha de solicitud.
13. La fecha sugerida por el cliente no representa confirmación final de entrega.
14. La entrega debe ser confirmada o reprogramada posteriormente por el administrador.
15. El cliente debe ver claramente que su pedido queda en revisión.
16. El cliente debe poder consultar el estado de su pedido desde la app.
17. El seguimiento debe manejarse por estados, no por ubicación en tiempo real.
18. El cliente solo debe ver sus propios pedidos.
19. El cliente no debe ver información interna del pago al motorista.
20. El cliente no debe ver liquidaciones, costos internos ni pagos logísticos.

---

## 4. Menú y navegación

### Nueva opción en PWA Cliente

Se debe agregar una opción llamada:

**Tienda**

Ubicación sugerida:

* En el dashboard principal de la PWA Cliente.
* Puede mostrarse como acceso rápido junto a opciones como Mis puntos, Perfil, Historial o Canjes.
* También puede agregarse en el menú inferior, si la app cuenta con navegación fija.

### Icono sugerido

Usar un icono relacionado con:

* Bolsa de compra.
* Tienda.
* Producto.
* Carrito.

El icono debe mantener la línea gráfica de la PWA Cliente.

---

## 5. Rutas sugeridas

Se recomienda mantener una ruta separada por pantalla.

### Rutas PWA Cliente

```txt
/tienda-online
/tienda-online/producto/[productoId]
/tienda-online/carrito
/tienda-online/confirmacion
/tienda-online/mis-pedidos
/tienda-online/mis-pedidos/[pedidoId]
```

### Estructura sugerida de archivos

```txt
app/
  pwa-cliente/
    tienda/
      page.tsx
      components/
        ProductCard.tsx
        ProductFilters.tsx
        BrandFilter.tsx
        ProductSearch.tsx
        EmptyProductsState.tsx
      producto/
        [productoId]/
          page.tsx
          components/
            ProductDetail.tsx
            ProductGallery.tsx
            QuantitySelector.tsx
      carrito/
        page.tsx
        components/
          CartItem.tsx
          CartSummary.tsx
          DeliveryDateSelector.tsx
          DeliveryAddressSection.tsx
          ConfirmOrderModal.tsx
    mis-pedidos/
      page.tsx
      components/
        OrderCard.tsx
        OrderStatusBadge.tsx
        EmptyOrdersState.tsx
      [pedidoId]/
        page.tsx
        components/
          OrderDetailHeader.tsx
          OrderProductsList.tsx
          OrderTimeline.tsx
          OrderPaymentInfo.tsx
```

---

## 6. Pantalla: Tienda

### Objetivo

Mostrar al cliente todos los productos disponibles para compra, con opción de búsqueda y filtro por marca.

### Ruta

```txt
/tienda-online
```

### Componentes principales

La pantalla debe contener:

1. Encabezado de sección.
2. Buscador de productos.
3. Filtro por marca.
4. Lista de productos en cards.
5. Acceso visible al carrito.
6. Estado vacío cuando no existan productos.
7. Indicador de carga al consultar productos.

---

### Diseño sugerido

La pantalla debe ser compacta, limpia y orientada a móvil.

Estructura recomendada:

```txt
[Título: Tienda]

[Buscador: Buscar producto...]

[Filtro por marca]
Todas | Nine West | Flexi | Adidas | Anais | Bitter | ...

[Grid/Listado de productos]

[Card producto]
Imagen
Marca
Nombre del producto
Precio
Disponibilidad
[Agregar]
[Ver detalle]
```

---

### Campos visuales por producto

Cada card de producto debe mostrar:

* Imagen principal del producto.
* Marca.
* Nombre del producto.
* Precio en quetzales.
* Disponibilidad.
* Botón **Agregar**.
* Botón **Ver detalle**.

### Ejemplo visual de contenido

```txt
Nine West
Zapato casual dama
Q399.00
Disponible

[Agregar] [Ver detalle]
```

---

## 7. Buscador de productos

### Campo

**Buscar producto**

### Comportamiento

El buscador debe permitir buscar por coincidencia parcial.

Debe buscar por:

* Nombre del producto.
* Marca.
* Categoría, si existe.
* Descripción corta, si se decide habilitar.

### Reglas

1. La búsqueda debe ejecutarse al escribir.
2. Debe tener un pequeño debounce para evitar consultas innecesarias.
3. Si no hay resultados, mostrar estado vacío.
4. El buscador no debe borrar el filtro de marca seleccionado, salvo que el usuario lo limpie manualmente.

### Placeholder sugerido

```txt
Buscar producto...
```

---

## 8. Filtro por marca

### Objetivo

Permitir al cliente filtrar productos por marca.

### Comportamiento

Debe mostrar una lista horizontal de marcas activas.

Opciones mínimas:

* Todas.
* Marca 1.
* Marca 2.
* Marca 3.

### Reglas

1. La opción predeterminada debe ser **Todas**.
2. El filtro debe mostrar únicamente marcas con productos activos.
3. Al seleccionar una marca, solo se deben mostrar productos asociados a esa marca.
4. El cliente debe poder volver a **Todas**.
5. No debe requerir recargar la pantalla completa.
6. Debe funcionar junto con el buscador.

---

## 9. Pantalla: Detalle del producto

### Objetivo

Permitir que el cliente vea información completa del producto antes de agregarlo al carrito.

### Ruta

```txt
/tienda-online/producto/[productoId]
```

### Información a mostrar

* Imagen principal del producto.
* Galería de imágenes, si existe.
* Marca.
* Nombre del producto.
* Descripción.
* Precio en quetzales.
* Disponibilidad.
* Cantidad seleccionable.
* Botón **Agregar al carrito**.
* Botón **Volver a tienda**.

### Reglas funcionales

1. Si el producto está inactivo, no debe poder consultarse desde la tienda.
2. Si el producto no tiene stock, debe mostrarse como no disponible.
3. Si no hay stock, el botón **Agregar al carrito** debe estar deshabilitado.
4. La cantidad no puede ser menor a 1.
5. La cantidad no puede superar el stock disponible.
6. El precio debe mostrarse en quetzales.
7. El cliente no debe ver costo interno, margen ni datos administrativos.

---

## 10. Carrito de compra

### Objetivo

Permitir que el cliente revise los productos seleccionados antes de solicitar el pedido.

### Ruta

```txt
/tienda-online/carrito
```

### Información a mostrar

Por cada producto:

* Imagen.
* Marca.
* Nombre.
* Precio unitario.
* Cantidad.
* Subtotal.
* Botón para eliminar.
* Control para aumentar o disminuir cantidad.

Resumen:

* Subtotal.
* Costo de envío, si aplica.
* Total a pagar.
* Método de pago.
* Dirección de entrega.
* Fecha sugerida de entrega.
* Botón **Solicitar pedido**.

---

## 11. Método de pago

### Regla principal

El único método de pago permitido será:

**Efectivo contra entrega**

### Visualización sugerida

```txt
Método de pago
Efectivo contra entrega

El pago se realizará al momento de recibir el paquete.
```

### Reglas

1. No mostrar selección de método de pago.
2. No mostrar campos de tarjeta.
3. No mostrar campos bancarios.
4. No integrar pasarela de pago.
5. El pedido debe nacer con estado de pago **Pendiente de cobro**.

---

## 12. Dirección de entrega

### Objetivo

Permitir que el cliente seleccione o ingrese la dirección donde desea recibir el pedido.

### Campos sugeridos

* Dirección.
* Departamento.
* Municipio.
* Zona.
* Referencia de ubicación.
* Teléfono de contacto.

### Reglas

1. La dirección debe ser obligatoria.
2. El teléfono de contacto debe ser obligatorio.
3. El teléfono debe validarse como número local de 8 dígitos si el sistema mantiene la lógica actual.
4. La referencia de ubicación debe ser recomendable, pero puede ser opcional.
5. Si el cliente ya tiene dirección registrada en perfil, debe poder reutilizarla.
6. Si el cliente edita la dirección en el carrito, esa dirección debe aplicarse al pedido.
7. No se debe consultar ubicación GPS en tiempo real.

---

## 13. Fecha sugerida de entrega

### Objetivo

Permitir que el cliente sugiera una fecha de entrega para su pedido.

### Campo

**Fecha sugerida de entrega**

### Reglas

1. La fecha sugerida debe ser obligatoria.
2. No debe permitirse seleccionar la fecha actual.
3. La primera fecha disponible debe ser como mínimo el día siguiente.
4. La fecha seleccionada por el cliente queda como sugerencia.
5. La fecha final debe ser confirmada por el administrador.
6. El cliente debe ver un mensaje claro indicando que la fecha está sujeta a disponibilidad.
7. El sistema debe guardar la fecha sugerida por el cliente.

### Mensaje sugerido

```txt
La fecha seleccionada será revisada por nuestro equipo. La entrega será confirmada o reprogramada según disponibilidad.
```

---

## 14. Confirmación de solicitud de pedido

### Objetivo

Evitar que el cliente solicite un pedido por error.

### Componente

Modal de confirmación.

### Disparador

Al presionar el botón:

**Solicitar pedido**

### Contenido del modal

Debe mostrar:

* Título.
* Total del pedido.
* Método de pago.
* Dirección de entrega.
* Fecha sugerida.
* Mensaje de confirmación.
* Botón cancelar.
* Botón confirmar.

### Texto sugerido

```txt
Confirmar solicitud de pedido

Total a pagar: Q399.00
Método de pago: Efectivo contra entrega
Fecha sugerida: 27/06/2026

Nuestro equipo revisará disponibilidad y confirmará la fecha de entrega. El pago se realizará al momento de recibir el paquete.
```

### Botones

* Cancelar
* Confirmar solicitud

---

## 15. Creación del pedido

Al confirmar la solicitud, el sistema debe crear un pedido con los siguientes estados iniciales:

### Estado del pedido

```txt
Pedido solicitado
```

### Estado de pago del cliente

```txt
Pendiente de cobro
```

### Estado de entrega

```txt
Pendiente de programación
```

### Estado de pago al motorista

```txt
No asignado
```

---

## 16. Pantalla posterior a la solicitud

Después de crear el pedido, el cliente debe ver una pantalla o mensaje de éxito.

### Mensaje sugerido

```txt
Tu pedido fue solicitado correctamente.

Nuestro equipo revisará disponibilidad y confirmará la fecha de entrega. Recibirás una notificación cuando el pedido sea confirmado o reprogramado.
```

### Acciones disponibles

* Ver mi pedido.
* Volver a tienda.
* Ir a mis pedidos.

---

## 17. Mis pedidos

### Objetivo

Permitir que el cliente vea el historial de pedidos realizados desde la tienda.

### Ruta

```txt
/tienda-online/mis-pedidos
```

### Información por card

* Número de pedido.
* Fecha de solicitud.
* Total.
* Estado del pedido.
* Estado del pago.
* Fecha sugerida.
* Fecha confirmada, si existe.
* Botón **Ver detalle**.

### Estados visibles para el cliente

El cliente puede ver estados como:

* Pedido solicitado.
* En revisión.
* Confirmado.
* Reprogramado.
* Preparando pedido.
* Asignado a entrega.
* En ruta.
* Entregado.
* No entregado.
* Cancelado.

### No debe mostrar

* Pago al motorista.
* Liquidación interna.
* Usuario admin que asignó el pedido.
* Costos internos.
* Comentarios internos.
* Rentabilidad.
* Datos administrativos sensibles.

---

## 18. Detalle de pedido para cliente

### Ruta

```txt
/tienda-online/mis-pedidos/[pedidoId]
```

### Información a mostrar

#### Encabezado

* Número de pedido.
* Estado actual.
* Fecha de solicitud.
* Total.

#### Productos

* Imagen.
* Marca.
* Nombre.
* Cantidad.
* Precio unitario.
* Subtotal.

#### Entrega

* Dirección.
* Teléfono de contacto.
* Fecha sugerida.
* Fecha confirmada, si ya fue programada.
* Rango horario, si existe.
* Estado de entrega.

#### Pago

* Método de pago: efectivo contra entrega.
* Estado de pago: pendiente de cobro o cobrado.

#### Línea de tiempo

Debe mostrar trazabilidad básica del pedido.

Ejemplo:

```txt
Pedido solicitado
Tu pedido fue recibido por nuestro equipo.

En revisión
Estamos validando disponibilidad y programación.

Confirmado
Tu pedido fue confirmado.

Entrega programada
Tu entrega fue programada para el 27/06/2026.

En ruta
Tu pedido salió a entrega.

Entregado
Tu pedido fue entregado correctamente.
```

---

## 19. Notificaciones al cliente

El sistema debe poder generar notificaciones al cliente en eventos importantes.

### Eventos sugeridos

1. Pedido solicitado correctamente.
2. Pedido confirmado por admin.
3. Pedido reprogramado.
4. Pedido asignado a entrega.
5. Pedido en ruta.
6. Pedido entregado.
7. Pedido no entregado.
8. Pedido cancelado.

### Reglas

1. Las notificaciones deben mostrarse dentro de la PWA Cliente.
2. Si el sistema ya tiene notificaciones push, deben integrarse a la lógica existente.
3. No se requiere integración con WhatsApp.
4. No se requiere SMS.

---

## 20. Validaciones funcionales

### Validaciones de producto

1. No permitir agregar productos inactivos.
2. No permitir agregar productos sin stock.
3. No permitir cantidades mayores al stock disponible.
4. No permitir cantidades menores a 1.

### Validaciones de carrito

1. No permitir confirmar pedido con carrito vacío.
2. No permitir confirmar pedido sin dirección.
3. No permitir confirmar pedido sin teléfono.
4. No permitir confirmar pedido sin fecha sugerida.
5. No permitir confirmar pedido con fecha de entrega igual al día de solicitud.
6. No permitir confirmar pedido con productos que ya no estén disponibles.

### Validaciones de fecha

1. La fecha mínima debe ser el día siguiente.
2. Si el día siguiente no está disponible por reglas internas futuras, debe mostrarse el siguiente día disponible.
3. La fecha debe guardarse como sugerida, no como confirmada.

---

## 21. Estados iniciales del pedido

Cuando el cliente confirma el pedido desde la PWA Cliente, el sistema debe crear el registro con estos valores:

```txt
estado_pedido = "PEDIDO_SOLICITADO"
estado_pago_cliente = "PENDIENTE_COBRO"
estado_entrega = "PENDIENTE_PROGRAMACION"
estado_pago_motorista = "NO_ASIGNADO"
metodo_pago = "EFECTIVO_CONTRA_ENTREGA"
fecha_sugerida_entrega = fecha seleccionada por cliente
fecha_confirmada_entrega = null
motorista_id = null
pago_motorista = null
```

---

## 22. Modelo de datos sugerido

### Tabla: store_orders

Campos sugeridos:

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
delivery_reference
delivery_phone
assigned_driver_id
driver_payment_amount
driver_payment_status
created_at
updated_at
cancelled_at
cancel_reason
```

### Tabla: store_order_items

```txt
id
order_id
product_id
brand_id
product_name_snapshot
brand_name_snapshot
unit_price
quantity
subtotal
created_at
updated_at
```

### Tabla: store_order_timeline

```txt
id
order_id
previous_status
new_status
status_type
comment
created_by_user_id
created_by_role
created_at
```

---

## 23. Servicios sugeridos

```txt
StoreProductService
StoreCartService
StoreOrderService
StoreOrderTimelineService
StoreNotificationService
```

### Responsabilidad sugerida

#### StoreProductService

Consulta productos activos, filtros por marca y búsqueda.

#### StoreCartService

Administra carrito del cliente.

#### StoreOrderService

Crea pedidos y valida reglas antes de confirmar.

#### StoreOrderTimelineService

Registra trazabilidad del pedido.

#### StoreNotificationService

Genera notificaciones al cliente.

---

## 24. Endpoints sugeridos

### Productos

```txt
GET /api/pwa-client/store/products
GET /api/pwa-client/store/products/:id
GET /api/pwa-client/store/brands
```

### Carrito

```txt
GET /api/pwa-client/store/cart
POST /api/pwa-client/store/cart/items
PATCH /api/pwa-client/store/cart/items/:id
DELETE /api/pwa-client/store/cart/items/:id
```

### Pedidos

```txt
POST /api/pwa-client/store/orders
GET /api/pwa-client/store/orders
GET /api/pwa-client/store/orders/:id
```

---

## 25. Respuesta esperada al crear pedido

Ejemplo:

```json
{
  "success": true,
  "message": "Pedido solicitado correctamente.",
  "order": {
    "id": "123",
    "orderNumber": "PED-000123",
    "status": "PEDIDO_SOLICITADO",
    "paymentStatus": "PENDIENTE_COBRO",
    "deliveryStatus": "PENDIENTE_PROGRAMACION",
    "totalAmount": 399.00,
    "paymentMethod": "EFECTIVO_CONTRA_ENTREGA",
    "suggestedDeliveryDate": "2026-06-27"
  }
}
```

---

## 26. Consideraciones de diseño visual

### Estilo general

* Pantallas compactas.
* Cards limpias.
* Botones no robustos.
* Texto en negrita únicamente para títulos o información clave.
* Mantener coherencia con la línea gráfica actual de la PWA Cliente.
* Evitar saturación visual.
* Priorizar lectura rápida en móvil.

### Botones sugeridos

Primarios:

* Agregar.
* Solicitar pedido.
* Confirmar solicitud.

Secundarios:

* Ver detalle.
* Volver.
* Eliminar producto.
* Ir a mis pedidos.

### Badges sugeridos

* Disponible.
* No disponible.
* Pedido solicitado.
* En revisión.
* Confirmado.
* Reprogramado.
* En ruta.
* Entregado.
* Cancelado.

---

## 27. Casos de uso

### Caso de uso 1: Cliente visualiza productos

1. Cliente ingresa a PWA Cliente.
2. Selecciona opción Tienda.
3. El sistema muestra productos activos.
4. Cliente visualiza productos de todas las marcas.

Resultado esperado:

El cliente puede ver la tienda completa sin segmentación.

---

### Caso de uso 2: Cliente filtra por marca

1. Cliente entra a Tienda.
2. Selecciona una marca.
3. El sistema filtra productos de esa marca.
4. Cliente puede volver a Todas.

Resultado esperado:

El filtro muestra únicamente productos de la marca seleccionada.

---

### Caso de uso 3: Cliente agrega producto al carrito

1. Cliente selecciona producto.
2. Presiona Agregar.
3. El sistema valida disponibilidad.
4. El producto se agrega al carrito.

Resultado esperado:

El producto aparece en el carrito con cantidad y precio correcto.

---

### Caso de uso 4: Cliente solicita pedido

1. Cliente revisa carrito.
2. Ingresa dirección.
3. Selecciona fecha sugerida de entrega.
4. El sistema valida que no sea el mismo día.
5. Cliente confirma solicitud.
6. El sistema crea el pedido.

Resultado esperado:

El pedido queda creado en estado Pedido solicitado.

---

### Caso de uso 5: Cliente consulta pedido

1. Cliente entra a Mis pedidos.
2. Selecciona un pedido.
3. El sistema muestra detalle, productos, total y estado.

Resultado esperado:

El cliente puede dar seguimiento al pedido por estados.

---

## 28. Criterios de aceptación

1. La PWA Cliente debe mostrar una sección llamada Tienda.
2. La tienda debe listar productos activos.
3. La tienda debe permitir filtrar por marca.
4. La tienda debe permitir búsqueda por nombre de producto.
5. El cliente debe poder ver el detalle de un producto.
6. El cliente debe poder agregar productos al carrito.
7. El carrito debe calcular subtotal y total.
8. El método de pago debe mostrarse como efectivo contra entrega.
9. No debe existir opción de pago digital.
10. El cliente debe poder seleccionar o ingresar dirección de entrega.
11. El cliente debe seleccionar una fecha sugerida de entrega.
12. El sistema no debe permitir seleccionar el mismo día como fecha de entrega.
13. El sistema debe mostrar modal de confirmación antes de crear el pedido.
14. Al confirmar, el pedido debe crearse como Pedido solicitado.
15. El estado de pago debe iniciar como Pendiente de cobro.
16. El estado de entrega debe iniciar como Pendiente de programación.
17. El cliente debe poder ver sus pedidos en Mis pedidos.
18. El cliente debe poder ver el detalle de cada pedido.
19. El cliente debe ver una línea de tiempo básica.
20. El cliente no debe ver información de pago al motorista.
21. El cliente no debe ver datos internos administrativos.
22. El sistema debe registrar trazabilidad inicial del pedido.
23. El módulo debe respetar el diseño compacto de la PWA Cliente.
24. Cada pantalla debe tener su propia ruta y archivo independiente.
25. Los componentes deben estar separados por responsabilidad.

---

## 29. Resultado esperado del FRD

Al finalizar este desarrollo, la PWA Cliente contará con una tienda funcional donde el cliente podrá consultar productos de diferentes marcas, filtrar por marca, agregar productos al carrito y solicitar pedidos con pago en efectivo contra entrega.

La solicitud quedará pendiente de revisión administrativa, permitiendo que en los siguientes módulos el administrador confirme, reprograme, asigne motorista y controle la entrega.
