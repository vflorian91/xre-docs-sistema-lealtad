# FRD — Módulo Web Admin: Productos Canjeables y Solicitudes de Canje

## 1. Objetivo del módulo

El módulo de **Productos Canjeables** permitirá al administrador registrar, editar, visualizar, activar e inactivar productos que estarán disponibles para los clientes en la PWA Cliente dentro de una sección llamada **Premios** o **Canjear**.

La finalidad es que los clientes puedan consultar los productos disponibles, revisar su descripción, fotografía y valor en puntos, y solicitar el canje únicamente si cuentan con los puntos suficientes.

Cuando un cliente solicite un canje, se deberá generar una solicitud en la plataforma Web Admin dentro de una pantalla de **Canjes**, quedando en estado **Pendiente** hasta que el administrador la revise y gestione. Además, la solicitud deberá generar una notificación en la campanita superior del panel administrativo.

---

## 2. Nombre recomendado de las secciones

### En Web Admin

Dentro del menú lateral, bajo el grupo correspondiente de gestión del sistema, se recomienda agregar:

**Gestión de Lealtad**

* Productos Canjeables
* Solicitudes de Canje

### En PWA Cliente

Se recomienda usar el nombre:

**Premios**

Dentro de la pantalla, el botón principal del producto puede decir:

**Canjear**

Esto permite que la sección se vea más amigable para el cliente, mientras que la acción sigue siendo clara.

---

## 3. Alcance del módulo

El desarrollo debe contemplar:

1. Pantalla Web Admin para listar productos canjeables.
2. Pantalla Web Admin para crear producto canjeable.
3. Pantalla Web Admin para editar producto canjeable.
4. Pantalla Web Admin para ver detalle de producto canjeable.
5. Publicación automática de productos activos en PWA Cliente.
6. Sección de Premios/Canjear en PWA Cliente.
7. Pantalla de detalle de producto en PWA Cliente.
8. Validación de puntos disponibles del cliente.
9. Selección de tienda de recolección mediante buscador.
10. Creación de solicitud de canje.
11. Pantalla Web Admin para ver solicitudes de canje.
12. Notificación en campanita del panel admin cuando exista una solicitud pendiente.
13. Gestión de estados de la solicitud.
14. Reserva, consumo o liberación de puntos según el estado del canje.
15. Control de inventario del producto canjeable.

---

## 4. Reglas generales del módulo

### 4.1 Productos canjeables

* Un producto canjeable podrá ser creado únicamente desde Web Admin.
* El producto se publicará en PWA Cliente únicamente si está activo.
* El producto debe tener un valor en puntos.
* El producto debe tener al menos una imagen principal.
* El producto debe tener stock disponible para poder ser canjeado.
* Si el producto no tiene stock, podrá mostrarse como no disponible o dejar de publicarse, según la configuración definida.
* Ningún producto deberá eliminarse físicamente de base de datos.
* Los productos solo podrán activarse o inactivarse.
* Un producto inactivo no deberá mostrarse en la PWA Cliente.
* Si un producto está activo pero no tiene stock, el botón de canje deberá estar deshabilitado.
* El valor en puntos no deberá poder ser menor o igual a cero.
* El nombre del producto debe ser obligatorio.
* La descripción debe ser obligatoria.
* La fotografía debe ser obligatoria.

---

## 5. Pantalla Web Admin — Productos Canjeables

### 5.1 Ubicación

Menú lateral:

**Gestión de Lealtad**

* Productos Canjeables

### 5.2 Objetivo de la pantalla

Permitir al administrador visualizar todos los productos canjeables registrados, crear nuevos productos, editar productos existentes, ver su detalle e inactivarlos cuando ya no deban estar disponibles para los clientes.

---

## 6. Diseño de la pantalla de listado

La pantalla debe tener diseño compacto, limpio y visualmente alineado con el resto del sistema.

### 6.1 Encabezado

Debe mostrar:

**Título:** Productos Canjeables
**Descripción corta:** Administra los productos que los clientes pueden canjear con sus puntos.

En la parte derecha, a la altura del título de la tabla, debe estar el botón:

**Nuevo producto**

---

## 7. Cards superiores de resumen

La pantalla debe incluir cards compactas en la parte superior con los siguientes indicadores:

1. **Total productos**
2. **Productos activos**
3. **Productos inactivos**
4. **Productos sin stock**
5. **Solicitudes pendientes**

Las cards deben funcionar como filtros rápidos cuando aplique.

Ejemplo:

* Al presionar “Productos activos”, la tabla debe mostrar únicamente productos activos.
* Al presionar “Productos sin stock”, debe mostrar productos cuyo stock sea igual a cero.
* Al presionar “Solicitudes pendientes”, puede redirigir o filtrar la pantalla de solicitudes de canje.

---

## 8. Tabla de registro de productos canjeables

La tabla debe contener las siguientes columnas:

1. **Fotografía**
2. **Nombre del producto**
3. **Valor en puntos**
4. **Stock disponible**
5. **Estado**
6. **Publicado en PWA**
7. **Acciones**

### 8.1 Fotografía

Debe mostrarse como miniatura compacta.

### 8.2 Nombre del producto

Debe mostrar el nombre registrado del producto.

### 8.3 Valor en puntos

Debe mostrar el valor necesario para canjear el producto.

Ejemplo:

**1,500 pts**

### 8.4 Stock disponible

Debe mostrar la cantidad disponible.

Si el stock es cero, debe marcarse visualmente como:

**Sin stock**

### 8.5 Estado

Debe mostrar:

* Activo
* Inactivo

### 8.6 Publicado en PWA

Debe indicar si el producto está visible actualmente para clientes.

Un producto estará publicado si cumple:

* Está activo.
* Tiene stock disponible.
* Tiene imagen.
* Tiene valor en puntos válido.
* Se encuentra dentro de vigencia, si se configura vigencia.

### 8.7 Acciones

Las acciones disponibles serán:

* Ver
* Editar
* Activar/Inactivar mediante botón de alternancia

No debe existir acción de eliminar.

---

## 9. Filtros y búsqueda

La pantalla debe incluir filtros compactos.

### 9.1 Búsqueda general

Campo único de búsqueda por:

* Nombre del producto
* Código del producto
* Descripción

### 9.2 Filtros

Filtros disponibles:

* Estado: Todos, Activos, Inactivos.
* Stock: Todos, Con stock, Sin stock.
* Rango de puntos: mínimo y máximo.
* Categoría, si se implementa catálogo de categorías.
* Publicado en PWA: Sí / No.

### 9.3 Paginación

La tabla debe tener paginación de 10 registros por página.

---

## 10. Pantalla Crear Producto Canjeable

La pantalla de creación debe permitir registrar un nuevo producto que posteriormente será publicado en la PWA Cliente.

### 10.1 Campos obligatorios

1. **Nombre del producto**
2. **Descripción**
3. **Valor en puntos**
4. **Stock disponible**
5. **Fotografía principal**
6. **Estado**
7. **Publicar en PWA**

### 10.2 Campos recomendados

1. **Código interno del producto**
2. **Categoría**
3. **Orden de visualización**
4. **Fecha de inicio de publicación**
5. **Fecha fin de publicación**
6. **Límite de canje por cliente**
7. **Términos o condiciones del canje**

---

## 11. Descripción de campos

### 11.1 Nombre del producto

Campo obligatorio.

Debe aceptar texto.

Ejemplo:

**Bolso Nine West negro**

### 11.2 Descripción

Campo obligatorio.

Debe permitir explicar al cliente qué producto está canjeando.

Ejemplo:

**Bolso color negro, tamaño mediano, sujeto a disponibilidad al momento de aprobación del canje.**

### 11.3 Valor en puntos

Campo obligatorio.

Debe ser numérico.

Reglas:

* No puede ser cero.
* No puede ser negativo.
* Debe aceptar únicamente números enteros.
* Este valor será usado para validar si el cliente puede solicitar el canje.

### 11.4 Stock disponible

Campo obligatorio.

Debe ser numérico.

Reglas:

* No puede ser negativo.
* Si el stock llega a cero, el producto no podrá ser solicitado por clientes.
* El administrador debe poder actualizar el stock desde editar producto.

### 11.5 Fotografía principal

Campo obligatorio.

Debe permitir subir imagen del producto.

Formatos permitidos:

* JPG
* JPEG
* PNG
* WEBP, si el sistema ya lo soporta

Peso máximo recomendado:

* 1 MB

La pantalla debe mostrar vista previa de la imagen antes de guardar.

### 11.6 Estado

Campo obligatorio.

Opciones:

* Activo
* Inactivo

Por defecto, al crear un producto puede quedar como **Activo**, salvo que el administrador lo cambie.

### 11.7 Publicar en PWA

Checkbox o switch.

Si está activo, el sistema intentará mostrar el producto en PWA Cliente, siempre que cumpla las reglas de publicación.

### 11.8 Código interno del producto

Campo opcional.

Puede servir para identificar productos en inventario interno.

### 11.9 Categoría

Campo opcional.

Ejemplos:

* Bolsos
* Zapatos
* Accesorios
* Cupones
* Premios especiales

### 11.10 Orden de visualización

Campo opcional.

Sirve para ordenar los productos en PWA Cliente.

Regla recomendada:

* No permitir dos productos activos publicados con el mismo orden si ambos están visibles al cliente.

### 11.11 Vigencia de publicación

Campos opcionales:

* Fecha inicio
* Fecha fin

Reglas:

* Si no se configura vigencia, el producto estará visible mientras esté activo, publicado y con stock.
* Si se configura fecha fin, al vencer ya no deberá mostrarse en PWA Cliente.
* La fecha fin no puede ser menor a la fecha inicio.

### 11.12 Límite de canje por cliente

Campo opcional.

Permite definir cuántas veces un mismo cliente puede solicitar el mismo producto.

Ejemplo:

* 1 vez por cliente
* 2 veces por cliente
* Sin límite

Si no se configura, el sistema puede tomarlo como sin límite.

---

## 12. Pantalla Editar Producto Canjeable

Debe tener los mismos campos que la pantalla Crear Producto.

El administrador podrá modificar:

* Nombre
* Descripción
* Valor en puntos
* Stock
* Fotografía
* Estado
* Publicación en PWA
* Categoría
* Orden
* Vigencia
* Límite de canje por cliente
* Términos y condiciones

### 12.1 Regla importante al editar valor en puntos

Si ya existen solicitudes pendientes de ese producto, el cambio de valor en puntos no debe afectar las solicitudes ya creadas.

Cada solicitud de canje debe guardar el valor en puntos vigente al momento de ser solicitada.

---

## 13. Pantalla Ver Producto Canjeable

Debe ser una vista de solo lectura.

Debe mostrar:

* Fotografía
* Nombre
* Descripción
* Valor en puntos
* Stock disponible
* Estado
* Publicación en PWA
* Categoría
* Orden
* Vigencia
* Fecha de creación
* Fecha de última actualización
* Total de solicitudes generadas
* Total de canjes entregados

Acciones disponibles desde esta pantalla:

* Editar
* Volver al listado

---

# 14. PWA Cliente — Sección Premios / Canjear

## 14.1 Ubicación

La PWA Cliente debe incluir una sección llamada preferiblemente:

**Premios**

También puede utilizarse el texto:

**Canjear puntos**

### Recomendación visual

En el dashboard de cliente puede existir un acceso rápido:

**Premios**

Al ingresar, el cliente verá todos los productos activos y disponibles para canje.

---

## 15. Pantalla Listado de Premios en PWA Cliente

La pantalla debe mostrar productos publicados por el administrador.

Cada card de producto debe mostrar:

1. Fotografía del producto
2. Nombre
3. Valor en puntos
4. Estado visual de disponibilidad
5. Botón o acceso para ver detalle

### 15.1 Estados visuales para el cliente

El sistema debe mostrar claramente si el cliente puede o no puede solicitar el canje.

#### Si el cliente tiene puntos suficientes

Mostrar:

**Disponible para canjear**

Botón:

**Ver premio**

#### Si el cliente no tiene puntos suficientes

Mostrar:

**Te faltan X puntos**

El cliente puede ver el producto, pero no podrá solicitarlo.

#### Si el producto no tiene stock

Mostrar:

**No disponible**

El cliente puede ver el producto, pero no podrá solicitarlo.

---

## 16. Pantalla Detalle de Producto en PWA Cliente

Cuando el cliente seleccione un producto, debe ingresar a una pantalla de detalle.

Debe mostrar:

* Fotografía grande del producto
* Nombre del producto
* Descripción
* Valor en puntos
* Puntos disponibles del cliente
* Puntos faltantes, si aplica
* Términos o condiciones del canje
* Botón para solicitar canje

### 16.1 Botón de acción

El botón debe decir:

**Canjear premio**

El botón estará habilitado únicamente si:

* El cliente tiene puntos suficientes.
* El producto está activo.
* El producto está publicado.
* El producto tiene stock disponible.
* El cliente no ha superado el límite de canje, si aplica.

Si no cumple las condiciones, el botón debe aparecer deshabilitado.

---

## 17. Confirmación del canje en PWA Cliente

Al presionar **Canjear premio**, el sistema debe mostrar una pantalla o modal de confirmación.

Debe mostrar:

* Producto seleccionado
* Valor en puntos
* Puntos actuales del cliente
* Puntos que quedarán después del canje
* Campo para seleccionar tienda de recolección
* Botón confirmar

---

## 18. Selección de tienda de recolección

El cliente debe seleccionar la tienda donde desea recoger su premio.

### 18.1 Buscador de tienda

Debe existir un buscador que permita buscar tienda por:

* Nombre de tienda
* Departamento
* Municipio
* Zona

### 18.2 Reglas

* Solo se deben mostrar tiendas activas.
* El cliente solo puede seleccionar una tienda.
* La tienda seleccionada debe quedar guardada en la solicitud de canje.
* El cliente no debe poder confirmar el canje si no ha seleccionado tienda.
* Si el producto tiene restricciones por tienda, solo deberán mostrarse las tiendas permitidas.

---

## 19. Validación final antes de crear solicitud

Al confirmar el canje, el sistema debe validar nuevamente:

1. Que el cliente siga activo.
2. Que el cliente tenga puntos suficientes.
3. Que el producto siga activo.
4. Que el producto siga publicado.
5. Que el producto tenga stock disponible.
6. Que la tienda seleccionada esté activa.
7. Que no exista una solicitud duplicada pendiente del mismo producto para el mismo cliente, si se define esa regla.
8. Que el cliente no haya superado el límite de canje por producto.

Esta validación debe hacerse en backend, no solo en frontend.

---

## 20. Reserva de puntos

Al crear una solicitud de canje, el sistema debe **reservar** los puntos del cliente.

### 20.1 Motivo

Esto evita que el cliente solicite varios canjes usando los mismos puntos antes de que el administrador revise la solicitud.

### 20.2 Comportamiento

Cuando el cliente confirma la solicitud:

* Se crea la solicitud de canje.
* Los puntos quedan en estado reservado.
* El producto reduce stock disponible o bloquea una unidad.
* La solicitud queda en estado **Pendiente**.
* Se notifica al administrador en la campanita.

### 20.3 Estados de puntos

Los puntos pueden manejarse así:

* **Disponibles:** puntos que el cliente puede usar.
* **Reservados:** puntos comprometidos en una solicitud pendiente.
* **Canjeados:** puntos consumidos al entregar el premio.
* **Liberados:** puntos devueltos por rechazo o cancelación.

---

# 21. Web Admin — Pantalla Solicitudes de Canje

## 21.1 Ubicación

Menú lateral:

**Gestión de Lealtad**

* Solicitudes de Canje

## 21.2 Objetivo

Permitir al administrador revisar, aprobar, rechazar, preparar y marcar como entregadas las solicitudes de canje realizadas por los clientes desde la PWA Cliente.

---

## 22. Notificación en campanita

Cada vez que un cliente cree una solicitud de canje, el sistema debe generar una notificación en la campanita superior del panel Web Admin.

### 22.1 La notificación debe mostrar

* Texto: **Nueva solicitud de canje**
* Nombre del cliente
* Producto solicitado
* Fecha y hora
* Enlace directo a la solicitud

### 22.2 Contador

La campanita debe mostrar un contador con la cantidad de solicitudes pendientes no revisadas.

### 22.3 Estado de lectura

Al ingresar a la solicitud, la notificación puede marcarse como leída.

---

## 23. Tabla de Solicitudes de Canje

La tabla debe mostrar:

1. **Código de solicitud**
2. **Fecha**
3. **Cliente**
4. **Producto**
5. **Puntos utilizados**
6. **Tienda de recolección**
7. **Estado**
8. **Acciones**

---

## 24. Estados de una solicitud de canje

Las solicitudes deben manejar los siguientes estados:

### 24.1 Pendiente

Estado inicial cuando el cliente solicita el canje.

Acciones permitidas:

* Ver solicitud
* Aprobar
* Rechazar

### 24.2 Aprobado

El administrador confirmó que la solicitud es válida.

Acciones permitidas:

* Marcar como listo para recoger
* Rechazar, si todavía no fue entregado

### 24.3 Listo para recoger

El premio está listo en la tienda seleccionada.

Acciones permitidas:

* Marcar como entregado
* Cancelar, si aplica

### 24.4 Entregado

El cliente recibió el premio.

Este estado debe cerrar el canje.

Al marcar como entregado:

* Los puntos reservados pasan a puntos canjeados.
* La solicitud queda finalizada.
* Debe quedar registro de fecha, hora y usuario que confirmó la entrega.

### 24.5 Rechazado

El administrador rechazó la solicitud.

Al rechazar:

* Los puntos reservados deben liberarse al cliente.
* El stock reservado debe devolverse.
* Debe registrarse un motivo de rechazo.

### 24.6 Cancelado

Estado opcional para casos donde el cliente o administrador cancela antes de la entrega.

Al cancelar:

* Los puntos reservados deben liberarse.
* El stock reservado debe devolverse.
* Debe registrarse motivo de cancelación.

---

## 25. Vista detalle de solicitud de canje

Al presionar “Ver”, el administrador debe entrar a una pantalla con toda la información de la solicitud.

Debe mostrar:

### 25.1 Información del cliente

* Código de cliente
* Nombre
* Correo
* Teléfono
* Puntos disponibles
* Puntos reservados
* Nivel del cliente
* Estado del cliente

### 25.2 Información del producto

* Fotografía
* Nombre
* Descripción
* Valor en puntos al momento de la solicitud
* Stock actual
* Estado del producto

### 25.3 Información del canje

* Código de solicitud
* Fecha de solicitud
* Estado actual
* Tienda seleccionada para recolección
* Usuario administrador que gestionó la solicitud
* Fecha de aprobación
* Fecha de entrega
* Motivo de rechazo o cancelación, si aplica

### 25.4 Acciones

Según el estado, deben mostrarse botones compactos:

* Aprobar
* Rechazar
* Marcar listo para recoger
* Marcar entregado
* Cancelar
* Volver

---

## 26. Reglas de negocio para solicitudes de canje

1. El cliente solo puede solicitar un producto si tiene puntos disponibles suficientes.
2. Los puntos deben validarse nuevamente en backend al confirmar el canje.
3. Los puntos deben quedar reservados mientras la solicitud esté pendiente o aprobada.
4. El cliente no podrá usar puntos reservados en otro canje.
5. Si la solicitud se rechaza o cancela, los puntos deben regresar a disponibles.
6. Si la solicitud se marca como entregada, los puntos pasan a canjeados.
7. El stock debe reservarse al crear la solicitud.
8. Si la solicitud se rechaza o cancela, el stock debe devolverse.
9. Si la solicitud se entrega, el stock queda descontado definitivamente.
10. El administrador debe registrar motivo cuando rechace o cancele.
11. El cliente debe poder ver el estado de su solicitud desde PWA Cliente.
12. La tienda de recolección debe ser obligatoria.
13. Solo puede seleccionarse una tienda por solicitud.
14. No deben mostrarse tiendas inactivas.
15. No deben mostrarse productos inactivos en PWA Cliente.
16. No deben mostrarse productos vencidos.
17. No deben poder solicitarse productos sin stock.
18. No debe permitirse eliminar solicitudes de canje.

---

# 27. PWA Cliente — Historial de Canjes

Debe existir una sección donde el cliente pueda ver sus solicitudes de canje.

Puede estar dentro de:

**Perfil > Historial de canjes**

O dentro de:

**Premios > Mis canjes**

Debe mostrar:

* Producto
* Fecha de solicitud
* Puntos usados
* Tienda de recolección
* Estado
* Detalle

Estados visibles para el cliente:

* Pendiente
* Aprobado
* Listo para recoger
* Entregado
* Rechazado
* Cancelado

Si el estado es rechazado o cancelado, debe mostrar el motivo cuando aplique.

---

## 28. Notificaciones al cliente

Cuando cambie el estado de una solicitud, el cliente debe recibir notificación dentro de la PWA.

Eventos recomendados:

1. Solicitud creada.
2. Solicitud aprobada.
3. Premio listo para recoger.
4. Premio entregado.
5. Solicitud rechazada.
6. Solicitud cancelada.

Ejemplo:

**Tu premio ya está listo para recoger en Nine West Miraflores.**

---

## 29. Modelo de datos recomendado

### 29.1 Tabla: redeemable_products

Campos recomendados:

* id
* code
* name
* description
* points_value
* stock
* reserved_stock
* image_url
* category_id
* display_order
* is_active
* is_published
* publish_start_date
* publish_end_date
* redemption_limit_per_customer
* terms_conditions
* created_at
* updated_at
* created_by
* updated_by

### 29.2 Tabla: redemption_requests

Campos recomendados:

* id
* request_code
* customer_id
* product_id
* product_name_snapshot
* product_points_snapshot
* pickup_store_id
* status
* points_reserved
* requested_at
* approved_at
* ready_at
* delivered_at
* rejected_at
* cancelled_at
* rejection_reason
* cancellation_reason
* managed_by_user_id
* created_at
* updated_at

### 29.3 Tabla: customer_points_movements

Si ya existe una tabla de movimientos de puntos, debe registrar los movimientos del canje.

Tipos de movimiento recomendados:

* Reserva por canje
* Liberación por rechazo
* Liberación por cancelación
* Consumo por entrega

Campos recomendados:

* id
* customer_id
* movement_type
* points
* reference_type
* reference_id
* description
* created_at
* created_by

### 29.4 Tabla: admin_notifications

Si ya existe una tabla de notificaciones internas, debe reutilizarse.

Campos recomendados:

* id
* type
* title
* message
* reference_type
* reference_id
* is_read
* created_at
* read_at
* user_id, si la notificación es individual
* role_id, si la notificación es por rol

---

## 30. Permisos

Se deben manejar permisos por módulo.

### 30.1 Productos Canjeables

Permisos:

* Ver productos canjeables
* Crear producto canjeable
* Editar producto canjeable
* Activar/Inactivar producto canjeable

### 30.2 Solicitudes de Canje

Permisos:

* Ver solicitudes de canje
* Aprobar solicitud
* Rechazar solicitud
* Marcar listo para recoger
* Marcar entregado
* Cancelar solicitud

---

## 31. Validaciones técnicas

### 31.1 Producto

* Nombre obligatorio.
* Descripción obligatoria.
* Valor en puntos obligatorio.
* Valor en puntos mayor a cero.
* Stock obligatorio.
* Stock no puede ser negativo.
* Imagen obligatoria.
* Estado obligatorio.
* No permitir publicación si faltan campos críticos.
* No permitir fecha fin menor a fecha inicio.

### 31.2 Solicitud de canje

* Cliente obligatorio.
* Producto obligatorio.
* Tienda de recolección obligatoria.
* Validar puntos disponibles.
* Validar stock disponible.
* Validar estado activo del cliente.
* Validar estado activo del producto.
* Validar tienda activa.
* Validar límite de canje por cliente, si existe.
* Evitar doble clic o solicitudes duplicadas al confirmar.

---

## 32. Consideraciones visuales

### 32.1 Web Admin

* Diseño compacto.
* Botones pequeños y claros.
* Títulos en negrita únicamente.
* Estados con etiquetas visuales.
* Tablas limpias.
* Acciones con íconos.
* Evitar botones robustos.
* Mantener consistencia con los módulos de Clientes, Tiendas, Banners y Catálogos.

### 32.2 PWA Cliente

* Diseño móvil.
* Cards visuales de productos.
* Fotografía clara.
* Valor en puntos destacado.
* Botón de canje visible.
* Mensajes claros cuando no tenga puntos suficientes.
* Flujo simple de máximo tres pasos:

  1. Ver premio.
  2. Seleccionar tienda.
  3. Confirmar canje.

---

## 33. Flujo completo del canje

### 33.1 Desde Web Admin

1. Administrador entra a Productos Canjeables.
2. Presiona Nuevo producto.
3. Registra nombre, descripción, puntos, stock, fotografía y estado.
4. Marca publicar en PWA.
5. Guarda.
6. El producto aparece en PWA Cliente si cumple las reglas de publicación.

### 33.2 Desde PWA Cliente

1. Cliente entra a Premios.
2. Visualiza productos disponibles.
3. Selecciona un producto.
4. Entra al detalle.
5. El sistema muestra sus puntos disponibles.
6. Si tiene puntos suficientes, se habilita el botón Canjear premio.
7. Cliente presiona Canjear premio.
8. Selecciona tienda de recolección mediante buscador.
9. Confirma solicitud.
10. El sistema reserva puntos y stock.
11. La solicitud queda pendiente.
12. El administrador recibe notificación en la campanita.

### 33.3 Desde Web Admin — Solicitud

1. Administrador entra a Solicitudes de Canje.
2. Revisa solicitud pendiente.
3. Puede aprobar o rechazar.
4. Si aprueba, puede marcar como listo para recoger.
5. Cuando el cliente recibe el premio, se marca como entregado.
6. Al entregar, los puntos se consumen definitivamente.
7. La solicitud queda cerrada.

---

## 34. Criterios de aceptación

1. El administrador puede crear productos canjeables desde Web Admin.
2. El administrador puede editar productos existentes.
3. El administrador puede ver detalle de cada producto.
4. El administrador puede activar e inactivar productos.
5. No existe eliminación física de productos.
6. Los productos activos, publicados y con stock aparecen en PWA Cliente.
7. Los productos inactivos no aparecen en PWA Cliente.
8. Los productos sin stock no pueden ser solicitados.
9. El cliente puede ver productos aunque no tenga puntos suficientes.
10. El botón de canje solo se habilita si el cliente tiene puntos suficientes.
11. Al confirmar canje, el cliente debe seleccionar una tienda.
12. El cliente solo puede seleccionar una tienda de recolección.
13. La búsqueda de tienda permite encontrar tiendas activas por nombre, departamento, municipio o zona.
14. Al confirmar el canje, se crea una solicitud pendiente.
15. La solicitud aparece en Web Admin en la pantalla de Solicitudes de Canje.
16. La campanita del admin muestra notificación por nueva solicitud.
17. Los puntos del cliente quedan reservados al crear la solicitud.
18. El stock queda reservado al crear la solicitud.
19. Si se rechaza la solicitud, los puntos se liberan.
20. Si se cancela la solicitud, los puntos se liberan.
21. Si se entrega el premio, los puntos se consumen definitivamente.
22. El cliente puede ver el historial y estado de sus canjes.
23. El administrador debe registrar motivo al rechazar o cancelar.
24. El sistema debe validar puntos y stock desde backend.
25. No deben generarse solicitudes duplicadas por doble clic.

---

## 35. Fuera de alcance inicial

Queda fuera de alcance inicial, salvo que se indique lo contrario:

1. Envío de premio a domicilio.
2. Pago mixto con puntos más dinero.
3. Inventario separado por tienda.
4. Integración con inventario externo.
5. Códigos QR para retiro.
6. Aprobación automática sin revisión de administrador.
7. Canjes por productos digitales.
8. Transferencia de puntos entre clientes.

Estos puntos pueden agregarse en futuras fases si el negocio lo requiere.

---

## 36. Recomendación final

Para evitar problemas operativos, el sistema debe manejar el canje en dos momentos:

1. **Solicitud del cliente:** se reservan puntos y stock.
2. **Entrega del premio:** se consumen puntos definitivamente.

Esto evita que el cliente use los mismos puntos en varias solicitudes y permite al administrador rechazar o cancelar correctamente devolviendo los puntos cuando corresponda.
