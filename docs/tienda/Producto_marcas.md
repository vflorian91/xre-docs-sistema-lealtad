# FRD 02 — Productos y Marcas Admin

## 1. Información general del requerimiento

### Nombre del módulo

Productos y Marcas Admin

### Plataforma

Web Administrador

### Tipo de módulo

Módulo administrativo para creación, edición, consulta, publicación y control de productos y marcas disponibles en la tienda de la PWA Cliente.

### Objetivo general

Permitir que los usuarios administradores puedan registrar y administrar las marcas y productos que serán visibles en la sección **Tienda** de la PWA Cliente.

El módulo debe permitir manejar productos de diferentes marcas, con imagen, precio, descripción, disponibilidad, stock, estado y orden de visualización. Los productos activos serán visibles para todos los clientes sin segmentación.

### Objetivos específicos

* Crear y administrar marcas.
* Crear y administrar productos de tienda.
* Asociar productos a marcas.
* Subir imagen principal del producto.
* Administrar precio de venta.
* Administrar stock disponible.
* Activar o inactivar productos.
* Controlar si un producto aparece o no en la tienda del cliente.
* Permitir búsqueda y filtros en la tabla administrativa.
* Mantener trazabilidad básica de creación y modificación.
* Preparar los datos necesarios para el carrito y solicitud de pedidos.

---

## 2. Contexto funcional

La empresa administra una tienda dentro de la app de clientes. Esta tienda contiene productos de varias marcas y la empresa se encarga de la entrega de los pedidos.

Los productos no deben estar segmentados por nivel de cliente, puntos, comportamiento, tienda asignada ni promoción. Todos los clientes deben ver todos los productos activos disponibles en la tienda.

La administración de productos debe estar centralizada en la plataforma web administrativa.

---

## 3. Alcance del FRD

Este FRD contempla:

* Módulo de marcas.
* Módulo de productos.
* Tabla de marcas.
* Tabla de productos.
* Pantalla para crear marca.
* Pantalla para editar marca.
* Pantalla para ver marca.
* Pantalla para crear producto.
* Pantalla para editar producto.
* Pantalla para ver producto.
* Activación e inactivación de marcas.
* Activación e inactivación de productos.
* Asociación producto-marca.
* Control de stock.
* Imagen principal del producto.
* Filtros administrativos.
* Validaciones.
* Estructura técnica sugerida.
* Modelo de datos sugerido.
* Endpoints sugeridos.
* Criterios de aceptación.

---

## 4. Fuera de alcance

Este FRD no contempla:

* Carrito de compra.
* Confirmación de pedido.
* Pago del cliente.
* Pago al motorista.
* Asignación de motorista.
* Programación de entregas.
* Liquidación de motoristas.
* Reportes de ventas.
* Seguimiento de pedidos.
* Geolocalización.
* Segmentación de productos por cliente.
* Promociones aplicadas al precio.

Estos puntos serán tratados en otros FRD.

---

## 5. Estructura del módulo en menú admin

### Ubicación sugerida

Dentro del menú principal de la plataforma administrativa debe existir una sección:

**Tienda**

Subopciones:

1. **Productos**
2. **Marcas**

Posteriormente, dentro de la misma sección se agregarán:

3. Pedidos
4. Agenda de entregas
5. Motoristas
6. Liquidaciones
7. Reportes

---

## 6. Permisos del módulo

El módulo debe respetar la lógica de roles y permisos del sistema.

### Permisos sugeridos para marcas

* Ver marcas.
* Crear marca.
* Editar marca.
* Activar/inactivar marca.

### Permisos sugeridos para productos

* Ver productos.
* Crear producto.
* Editar producto.
* Activar/inactivar producto.
* Ajustar stock.
* Ver detalle de producto.

### Reglas

1. Un usuario sin permiso de ver productos no debe acceder a la ruta de productos.
2. Un usuario sin permiso de crear producto no debe ver el botón **Nuevo producto**.
3. Un usuario sin permiso de editar producto no debe poder guardar cambios.
4. Un usuario sin permiso de activar/inactivar no debe ver el switch de estado.
5. Todas las acciones deben validar permisos también desde backend.

---

# SECCIÓN A — MARCAS

## 7. Módulo de marcas

### Objetivo

Permitir administrar las marcas que estarán disponibles para asociar productos y filtrar la tienda del cliente.

### Ruta principal sugerida

```txt
/admin/tienda/marcas
```

### Rutas sugeridas

```txt
/admin/tienda/marcas
/admin/tienda/marcas/nueva
/admin/tienda/marcas/[marcaId]
/admin/tienda/marcas/[marcaId]/editar
```

---

## 8. Pantalla: Tabla de marcas

### Ruta

```txt
/admin/tienda/marcas
```

### Objetivo

Mostrar el listado de marcas registradas en el sistema.

### Encabezado de pantalla

Título:

**Marcas**

Subtítulo sugerido:

**Administra las marcas disponibles para los productos de la tienda.**

Botón principal:

**Nueva marca**

El botón debe ubicarse en la parte superior derecha, alineado a la altura del título o del encabezado de la tabla.

---

## 9. Cards de resumen para marcas

La pantalla debe mostrar cards compactas con métricas generales.

### Cards sugeridas

1. **Total marcas**
2. **Marcas activas**
3. **Marcas inactivas**
4. **Con productos activos**

### Reglas

1. Las cards deben ser compactas.
2. No deben saturar visualmente la pantalla.
3. Pueden funcionar como filtro rápido si la estructura actual del sistema lo permite.
4. Los títulos deben ir en negrita.
5. El valor numérico debe ser claro y visible.

---

## 10. Filtros de marcas

La tabla debe incluir filtros compactos.

### Filtros requeridos

* Buscar por nombre.
* Estado:

  * Todas.
  * Activas.
  * Inactivas.

### Reglas

1. La búsqueda debe funcionar por coincidencia parcial.
2. El filtro de estado debe poder combinarse con la búsqueda.
3. Debe existir opción para limpiar filtros.
4. La tabla debe actualizarse sin recargar toda la pantalla.

---

## 11. Columnas de tabla de marcas

La tabla debe contener:

* Logo.
* Nombre de marca.
* Código.
* Estado.
* Productos activos.
* Fecha de creación.
* Acciones.

### Acciones por registro

* Ver.
* Editar.
* Activar/inactivar.

### Estado visual

El estado debe mostrarse con badge o switch:

* Activa.
* Inactiva.

---

## 12. Pantalla: Crear marca

### Ruta

```txt
/admin/tienda/marcas/nueva
```

### Objetivo

Permitir registrar una nueva marca.

### Campos requeridos

#### Información general

* Nombre de marca.
* Código interno.
* Logo de marca.
* Estado.

### Campos opcionales

* Descripción.
* Orden de visualización.
* Color principal de marca.
* Sitio web.
* Redes sociales, si se desea conectar con la lógica existente de marcas.

---

## 13. Campos de marca

### Nombre de marca

Tipo: texto.
Obligatorio: sí.

Reglas:

1. No debe permitir guardar vacío.
2. Debe eliminar espacios al inicio y final.
3. No debe permitir duplicados exactos.
4. Debe permitir nombres comerciales con espacios.

Ejemplos:

```txt
Nine West
Flexi
Adidas
Anais
Bitter
```

---

### Código interno

Tipo: texto.
Obligatorio: sí.

Reglas:

1. Debe ser único.
2. Debe poder generarse automáticamente a partir del nombre.
3. Debe guardarse en formato limpio, sin espacios.
4. Puede usar mayúsculas.

Ejemplo:

```txt
NINE_WEST
FLEXI
ADIDAS
```

---

### Logo de marca

Tipo: imagen.
Obligatorio: recomendable, pero puede definirse como opcional según la etapa del proyecto.

Formatos permitidos:

* PNG.
* JPG.
* JPEG.
* WEBP.

Reglas:

1. Validar formato.
2. Validar peso máximo.
3. Mostrar nombre del archivo cargado.
4. Permitir reemplazar logo al editar.
5. No debe romper la tabla si no existe logo.
6. Si no existe logo, mostrar placeholder.

Peso máximo sugerido:

```txt
1 MB
```

---

### Estado

Tipo: switch o checkbox.

Valores:

* Activa.
* Inactiva.

Reglas:

1. Una marca nueva debe nacer activa por defecto.
2. Si una marca está inactiva, no debe mostrarse como filtro en la tienda cliente.
3. Si una marca está inactiva, sus productos no deben mostrarse en la tienda cliente aunque el producto esté activo.
4. Inactivar una marca no debe eliminar sus productos.
5. La inactivación debe solicitar confirmación.

---

## 14. Pantalla: Editar marca

### Ruta

```txt
/admin/tienda/marcas/[marcaId]/editar
```

### Objetivo

Permitir modificar información de una marca existente.

### Reglas

1. Debe cargar la información actual de la marca.
2. Debe permitir actualizar nombre, logo, descripción, orden y estado.
3. El código interno puede quedar bloqueado si ya existen productos asociados.
4. Si se permite editar el código, debe validar que no afecte relaciones existentes.
5. Debe guardar usuario y fecha de modificación.
6. Debe mostrar mensaje de éxito al guardar.
7. Debe mostrar errores de validación cuando aplique.

---

## 15. Pantalla: Ver marca

### Ruta

```txt
/admin/tienda/marcas/[marcaId]
```

### Objetivo

Mostrar el detalle de la marca sin permitir edición directa.

### Información a mostrar

* Logo.
* Nombre.
* Código.
* Estado.
* Descripción.
* Cantidad de productos asociados.
* Cantidad de productos activos.
* Fecha de creación.
* Última actualización.

### Acciones disponibles

* Volver a tabla.
* Editar.
* Activar/inactivar, si tiene permiso.

---

# SECCIÓN B — PRODUCTOS

## 16. Módulo de productos

### Objetivo

Permitir que el administrador registre, edite, consulte y publique productos para la tienda de la PWA Cliente.

### Ruta principal sugerida

```txt
/admin/tienda/productos
```

### Rutas sugeridas

```txt
/admin/tienda/productos
/admin/tienda/productos/nuevo
/admin/tienda/productos/[productoId]
/admin/tienda/productos/[productoId]/editar
```

---

## 17. Pantalla: Tabla de productos

### Ruta

```txt
/admin/tienda/productos
```

### Objetivo

Mostrar todos los productos registrados para la tienda.

### Encabezado de pantalla

Título:

**Productos de tienda**

Subtítulo sugerido:

**Administra los productos visibles para los clientes en la tienda de la app.**

Botón principal:

**Nuevo producto**

El botón debe estar en la parte superior derecha.

---

## 18. Cards de resumen para productos

La pantalla debe mostrar cards compactas.

### Cards sugeridas

1. **Total productos**
2. **Productos activos**
3. **Productos inactivos**
4. **Sin stock**
5. **Stock bajo**

### Reglas

1. Las cards deben ser compactas.
2. Pueden funcionar como filtros rápidos.
3. No deben ocupar demasiado alto.
4. Deben respetar la línea gráfica del admin.
5. Los títulos deben ir en negrita.

---

## 19. Filtros de productos

La tabla debe incluir filtros claros y compactos.

### Filtros requeridos

* Buscar por nombre.
* Marca.
* Estado.
* Disponibilidad.
* Rango de precio, opcional.
* Stock bajo, opcional.

### Valores del filtro estado

* Todos.
* Activos.
* Inactivos.

### Valores del filtro disponibilidad

* Todos.
* Disponible.
* Sin stock.

### Reglas

1. La búsqueda debe ser por coincidencia parcial.
2. El filtro por marca debe listar marcas activas.
3. El filtro por estado debe poder combinarse con marca.
4. El filtro por disponibilidad debe evaluar stock.
5. Debe existir botón para limpiar filtros.
6. Los filtros no deben ser robustos ni ocupar demasiado espacio.

---

## 20. Columnas de tabla de productos

La tabla debe contener:

* Imagen.
* Producto.
* Marca.
* Precio.
* Stock.
* Estado.
* Visible en tienda.
* Fecha de creación.
* Acciones.

### Acciones por registro

* Ver.
* Editar.
* Activar/inactivar.

### Reglas de la tabla

1. La tabla debe tener paginación.
2. La paginación sugerida es de 10 registros por página.
3. La imagen debe mostrarse en miniatura.
4. Si no existe imagen, mostrar placeholder.
5. El precio debe mostrarse en quetzales.
6. El stock debe mostrarse con alerta visual si está bajo.
7. Los botones de acción deben ser compactos.
8. Los textos en negrita deben usarse solo para títulos o valores importantes.

---

## 21. Pantalla: Crear producto

### Ruta

```txt
/admin/tienda/productos/nuevo
```

### Objetivo

Permitir registrar un nuevo producto para la tienda.

### Estructura visual sugerida

La pantalla debe dividirse en secciones:

1. Información general.
2. Marca y categoría.
3. Precio y stock.
4. Imágenes.
5. Configuración de publicación.

No debe tener menú lateral interno. Debe ser una pantalla limpia con formulario compacto.

---

## 22. Campos de producto

### Información general

Campos:

* Nombre del producto.
* Código interno o SKU.
* Descripción corta.
* Descripción completa.

### Marca y categoría

Campos:

* Marca.
* Categoría, si existe catálogo.
* Etiquetas, opcional.

### Precio y stock

Campos:

* Precio de venta.
* Stock disponible.
* Stock mínimo.
* Costo de envío, opcional.
* Permite envío, por defecto sí.

### Imágenes

Campos:

* Imagen principal.
* Galería de imágenes, opcional.

### Publicación

Campos:

* Estado.
* Visible en tienda.
* Producto destacado, opcional.
* Orden de visualización.

---

## 23. Campo: Nombre del producto

Tipo: texto.
Obligatorio: sí.

Reglas:

1. No puede estar vacío.
2. Debe eliminar espacios al inicio y final.
3. Debe permitir nombres comerciales.
4. Debe mostrarse en la PWA Cliente.
5. Debe guardarse como nombre principal del producto.

Ejemplo:

```txt
Zapato casual dama color negro
Bolso pequeño de cuero
Tenis deportivo blanco
```

---

## 24. Campo: Código interno o SKU

Tipo: texto.
Obligatorio: recomendable.

Reglas:

1. Debe ser único si se utiliza como SKU.
2. No debe mostrarse obligatoriamente al cliente.
3. Debe servir para control interno.
4. Puede generarse manualmente o automáticamente.
5. Debe permitir letras, números y guiones.

Ejemplo:

```txt
NW-ZAP-001
FLEXI-DAMA-045
ADIDAS-TENIS-100
```

---

## 25. Campo: Descripción corta

Tipo: texto.
Obligatorio: opcional.

Uso:

Debe mostrarse en el detalle del producto o en cards si el diseño lo permite.

Reglas:

1. Debe tener límite de caracteres.
2. No debe permitir texto excesivamente largo.
3. No debe romper el diseño de la card.

Límite sugerido:

```txt
160 caracteres
```

---

## 26. Campo: Descripción completa

Tipo: editor simple o textarea.
Obligatorio: opcional.

Uso:

Debe mostrarse en la pantalla de detalle del producto.

Reglas:

1. Permitir texto descriptivo.
2. Evitar HTML libre si no hay sanitización.
3. No permitir scripts.
4. Debe guardarse como descripción comercial.

---

## 27. Campo: Marca

Tipo: selector.
Obligatorio: sí.

Reglas:

1. Debe listar marcas activas.
2. No debe permitir seleccionar marcas inactivas.
3. Todo producto debe pertenecer a una marca.
4. La marca debe mostrarse en la card del producto en la PWA Cliente.
5. La marca debe permitir filtrado desde la tienda del cliente.

---

## 28. Campo: Categoría

Tipo: selector.
Obligatorio: opcional según decisión del sistema.

Reglas:

1. Si existe catálogo de categorías, debe usarlo.
2. Si no existe, se puede dejar preparado para fase posterior.
3. La categoría puede apoyar filtros futuros.
4. No debe reemplazar el filtro por marca.

Categorías sugeridas, si se implementan:

* Zapatos.
* Bolsos.
* Accesorios.
* Ropa.
* Otros.

---

## 29. Campo: Precio de venta

Tipo: numérico / moneda.
Obligatorio: sí.

Moneda:

```txt
GTQ / Quetzales
```

Reglas:

1. Debe ser mayor que cero.
2. No debe permitir valores negativos.
3. Debe permitir decimales.
4. Debe mostrarse con formato de moneda.
5. Debe ser el precio usado en el carrito.
6. Debe guardarse como precio vigente del producto.
7. El pedido debe guardar snapshot del precio al momento de la compra para evitar cambios posteriores.

Ejemplo visual:

```txt
Q399.00
```

---

## 30. Campo: Stock disponible

Tipo: numérico entero.
Obligatorio: sí.

Reglas:

1. No puede ser negativo.
2. Debe permitir cero.
3. Si el stock es cero, el producto puede seguir existiendo pero debe mostrarse como no disponible.
4. Si el stock es cero, no debe permitir agregar al carrito.
5. La tabla admin debe marcar visualmente productos sin stock.
6. El cliente no debe poder solicitar cantidades mayores al stock disponible.

---

## 31. Campo: Stock mínimo

Tipo: numérico entero.
Obligatorio: opcional.

Uso:

Permite identificar productos con bajo inventario.

Reglas:

1. No puede ser negativo.
2. Si el stock disponible es menor o igual al stock mínimo, debe marcarse como stock bajo.
3. Debe mostrarse en admin.
4. No necesariamente debe mostrarse al cliente.

---

## 32. Campo: Imagen principal

Tipo: archivo de imagen.
Obligatorio: recomendable.

Formatos permitidos:

* PNG.
* JPG.
* JPEG.
* WEBP.

Peso máximo sugerido:

```txt
2 MB
```

Reglas:

1. Validar extensión.
2. Validar peso.
3. Mostrar vista previa o nombre del archivo.
4. Permitir reemplazo al editar.
5. Usar placeholder si no existe imagen.
6. La imagen principal debe mostrarse en la tienda cliente.
7. La imagen debe estar optimizada para vista móvil.

---

## 33. Campo: Galería de imágenes

Tipo: múltiples imágenes.
Obligatorio: no.

Reglas:

1. Permitir subir varias imágenes si se implementa.
2. Debe respetar peso máximo por archivo.
3. Debe permitir eliminar imágenes al editar.
4. Debe mostrarse en detalle del producto.
5. No debe ser obligatorio para publicar producto.

---

## 34. Campo: Estado

Tipo: switch.

Valores:

* Activo.
* Inactivo.

Reglas:

1. Un producto nuevo debe nacer activo por defecto, salvo que el admin lo cambie.
2. Un producto inactivo no debe mostrarse en la PWA Cliente.
3. Inactivar producto no debe eliminar historial de pedidos.
4. Si un producto ya fue comprado en un pedido anterior, debe conservarse el snapshot en el pedido.
5. La inactivación debe requerir confirmación.

---

## 35. Campo: Visible en tienda

Tipo: switch.

Valores:

* Sí.
* No.

Objetivo:

Permitir que un producto esté activo internamente, pero no publicado todavía para clientes.

Reglas:

1. Para mostrarse al cliente, el producto debe estar activo y visible en tienda.
2. Si visible en tienda es no, el producto no aparece en la PWA Cliente.
3. Si la marca está inactiva, el producto tampoco aparece aunque esté visible.
4. Este campo permite preparar productos antes de publicarlos.

---

## 36. Campo: Producto destacado

Tipo: checkbox o switch.
Obligatorio: no.

Uso:

Permite marcar productos que podrían mostrarse primero o en una sección destacada futura.

Reglas:

1. No debe afectar disponibilidad.
2. No debe segmentar productos.
3. Puede influir en orden visual si el diseño lo contempla.

---

## 37. Campo: Orden de visualización

Tipo: numérico entero.
Obligatorio: opcional.

Reglas:

1. Debe permitir ordenar productos en la tienda.
2. No debe ser obligatorio.
3. Valores menores pueden mostrarse primero.
4. Si no se usa, ordenar por fecha de creación o nombre.

---

## 38. Pantalla: Editar producto

### Ruta

```txt
/admin/tienda/productos/[productoId]/editar
```

### Objetivo

Permitir modificar un producto existente.

### Reglas

1. Debe cargar datos actuales del producto.
2. Debe permitir editar nombre, descripción, marca, precio, stock, imagen y estado.
3. Debe validar permisos.
4. Debe guardar usuario y fecha de modificación.
5. Debe mostrar confirmación al guardar.
6. Si cambia el precio, los pedidos anteriores no deben cambiar.
7. Si cambia la imagen, los pedidos anteriores pueden conservar solo snapshot textual del producto, no necesariamente imagen.
8. Si se inactiva, debe dejar de mostrarse en tienda cliente.
9. Si se coloca stock en cero, debe mostrarse como no disponible.

---

## 39. Pantalla: Ver producto

### Ruta

```txt
/admin/tienda/productos/[productoId]
```

### Objetivo

Mostrar el detalle completo del producto sin edición directa.

### Información a mostrar

#### Información principal

* Imagen principal.
* Nombre.
* SKU.
* Marca.
* Categoría.
* Estado.
* Visible en tienda.
* Producto destacado.

#### Información comercial

* Precio.
* Stock disponible.
* Stock mínimo.
* Disponibilidad.

#### Descripción

* Descripción corta.
* Descripción completa.

#### Auditoría

* Fecha de creación.
* Usuario que creó.
* Fecha de última actualización.
* Usuario que actualizó.

### Acciones

* Volver a tabla.
* Editar.
* Activar/inactivar.
* Ver en tienda, si aplica.

---

## 40. Reglas de visibilidad en PWA Cliente

Un producto será visible para el cliente únicamente si cumple todas estas condiciones:

```txt
producto.estado = ACTIVO
producto.visible_en_tienda = true
marca.estado = ACTIVA
```

### Reglas adicionales

1. Si el producto tiene stock mayor a cero, se muestra como disponible.
2. Si el producto tiene stock cero, puede mostrarse como no disponible solo si se decide permitir vista sin compra.
3. Si se quiere evitar frustración al cliente, se recomienda no mostrar productos sin stock o mostrarlos al final.
4. El cliente no debe poder agregar al carrito productos sin stock.
5. El cliente no debe ver productos inactivos.
6. El cliente no debe ver productos de marcas inactivas.

---

## 41. Manejo de stock

### Regla general

El stock debe controlar la disponibilidad del producto.

### Momento recomendado para descontar stock

El stock debe descontarse cuando el admin confirma el pedido, no cuando el cliente lo solicita.

### Justificación

El cliente solo está solicitando el pedido. Como el admin debe revisar disponibilidad y programar entrega, no conviene descontar stock desde el primer momento para evitar bloquear inventario por pedidos no confirmados.

### Estados relacionados

* Pedido solicitado: no descuenta stock.
* Pedido confirmado por admin: descuenta stock.
* Pedido cancelado antes de confirmar: no afecta stock.
* Pedido cancelado después de confirmar: debe devolver stock si corresponde.
* Pedido no entregado: debe definirse si el producto vuelve a stock o queda en revisión.

---

## 42. Validaciones funcionales

### Validaciones de marca

1. Nombre obligatorio.
2. Código obligatorio.
3. Código único.
4. No permitir duplicado exacto de nombre.
5. Validar formato de logo.
6. Validar peso máximo de logo.
7. No eliminar marcas con productos asociados.
8. Solo permitir inactivar marcas.

### Validaciones de producto

1. Nombre obligatorio.
2. Marca obligatoria.
3. Precio obligatorio.
4. Precio mayor a cero.
5. Stock obligatorio.
6. Stock no negativo.
7. Imagen con formato válido.
8. Producto activo sin marca activa no debe publicarse.
9. Producto visible en tienda sin estado activo no debe publicarse.
10. No permitir cantidades decimales en stock.
11. No permitir precio negativo.
12. No permitir publicar producto sin precio.

---

## 43. Estados de producto

### Estado administrativo

```txt
ACTIVO
INACTIVO
```

### Estado de visibilidad

```txt
VISIBLE_EN_TIENDA
NO_VISIBLE_EN_TIENDA
```

### Estado calculado de disponibilidad

```txt
DISPONIBLE
SIN_STOCK
STOCK_BAJO
```

### Reglas

1. El estado administrativo lo define el admin.
2. La visibilidad la define el admin.
3. La disponibilidad se calcula según stock.
4. Stock bajo se calcula comparando stock disponible contra stock mínimo.

---

## 44. Modelo de datos sugerido

### Tabla: store_brands

```txt
id
name
code
description
logo_url
primary_color
website_url
display_order
status
created_by
updated_by
created_at
updated_at
```

### Tabla: store_products

```txt
id
brand_id
category_id
name
sku
short_description
full_description
price
stock_quantity
minimum_stock
main_image_url
is_active
is_visible_in_store
is_featured
display_order
created_by
updated_by
created_at
updated_at
```

### Tabla: store_product_images

```txt
id
product_id
image_url
display_order
is_main
created_at
updated_at
```

### Tabla: store_product_stock_movements

```txt
id
product_id
movement_type
quantity
previous_stock
new_stock
reference_type
reference_id
comment
created_by
created_at
```

---

## 45. Tipos de movimiento de stock

### Valores sugeridos

```txt
INITIAL_STOCK
MANUAL_ADJUSTMENT
ORDER_CONFIRMED
ORDER_CANCELLED
ORDER_RETURNED
```

### Reglas

1. Cada ajuste de stock debe generar movimiento.
2. Confirmar pedido debe generar movimiento de salida.
3. Cancelar pedido confirmado debe poder generar devolución de stock.
4. Los movimientos deben permitir auditoría.
5. No permitir stock negativo.

---

## 46. Servicios sugeridos

```txt
StoreBrandService
StoreProductService
StoreProductImageService
StoreStockService
StoreProductVisibilityService
```

### StoreBrandService

Responsabilidades:

* Crear marca.
* Editar marca.
* Consultar marcas.
* Activar/inactivar marca.
* Validar duplicados.

### StoreProductService

Responsabilidades:

* Crear producto.
* Editar producto.
* Consultar productos.
* Activar/inactivar producto.
* Validar publicación.
* Consultar productos visibles para cliente.

### StoreProductImageService

Responsabilidades:

* Validar imágenes.
* Guardar imagen principal.
* Actualizar imagen.
* Manejar galería.

### StoreStockService

Responsabilidades:

* Consultar stock.
* Ajustar stock.
* Registrar movimientos.
* Validar disponibilidad.

### StoreProductVisibilityService

Responsabilidades:

* Determinar si un producto puede mostrarse en tienda.
* Aplicar reglas de marca activa.
* Aplicar reglas de estado y visibilidad.

---

## 47. Endpoints sugeridos

### Marcas admin

```txt
GET /api/admin/store/brands
POST /api/admin/store/brands
GET /api/admin/store/brands/:id
PATCH /api/admin/store/brands/:id
PATCH /api/admin/store/brands/:id/status
```

### Productos admin

```txt
GET /api/admin/store/products
POST /api/admin/store/products
GET /api/admin/store/products/:id
PATCH /api/admin/store/products/:id
PATCH /api/admin/store/products/:id/status
PATCH /api/admin/store/products/:id/visibility
PATCH /api/admin/store/products/:id/stock
```

### Imágenes de producto

```txt
POST /api/admin/store/products/:id/images
DELETE /api/admin/store/products/:id/images/:imageId
PATCH /api/admin/store/products/:id/images/:imageId/main
```

### Productos visibles para cliente

```txt
GET /api/pwa-client/store/products
GET /api/pwa-client/store/products/:id
GET /api/pwa-client/store/brands
```

---

## 48. Respuesta esperada al crear producto

```json
{
  "success": true,
  "message": "Producto creado correctamente.",
  "product": {
    "id": "123",
    "name": "Zapato casual dama color negro",
    "sku": "NW-ZAP-001",
    "brandId": "45",
    "brandName": "Nine West",
    "price": 399.00,
    "stockQuantity": 10,
    "isActive": true,
    "isVisibleInStore": true
  }
}
```

---

## 49. Respuesta esperada al crear marca

```json
{
  "success": true,
  "message": "Marca creada correctamente.",
  "brand": {
    "id": "45",
    "name": "Nine West",
    "code": "NINE_WEST",
    "status": "ACTIVE"
  }
}
```

---

## 50. Componentes sugeridos frontend

### Marcas

```txt
BrandTable.tsx
BrandFilters.tsx
BrandSummaryCards.tsx
BrandForm.tsx
BrandStatusBadge.tsx
BrandLogoUploader.tsx
BrandDetail.tsx
```

### Productos

```txt
ProductTable.tsx
ProductFilters.tsx
ProductSummaryCards.tsx
ProductForm.tsx
ProductImageUploader.tsx
ProductGalleryUploader.tsx
ProductStatusBadge.tsx
ProductStockBadge.tsx
ProductDetail.tsx
ProductPriceInput.tsx
ProductStockInput.tsx
```

---

## 51. Estructura sugerida de archivos

```txt
app/
  admin/
    tienda/
      marcas/
        page.tsx
        nueva/
          page.tsx
        [marcaId]/
          page.tsx
          editar/
            page.tsx
        components/
          BrandTable.tsx
          BrandFilters.tsx
          BrandSummaryCards.tsx
          BrandForm.tsx
          BrandLogoUploader.tsx
          BrandStatusBadge.tsx
          BrandDetail.tsx
      productos/
        page.tsx
        nuevo/
          page.tsx
        [productoId]/
          page.tsx
          editar/
            page.tsx
        components/
          ProductTable.tsx
          ProductFilters.tsx
          ProductSummaryCards.tsx
          ProductForm.tsx
          ProductImageUploader.tsx
          ProductGalleryUploader.tsx
          ProductStatusBadge.tsx
          ProductStockBadge.tsx
          ProductDetail.tsx
          ProductPriceInput.tsx
          ProductStockInput.tsx

lib/
  services/
    store/
      storeBrandService.ts
      storeProductService.ts
      storeProductImageService.ts
      storeStockService.ts
      storeProductVisibilityService.ts

types/
  store/
    brand.ts
    product.ts
    stock.ts
```

---

## 52. Consideraciones de diseño visual

### Estilo general

1. Diseño compacto.
2. Formularios ordenados por secciones.
3. Botones pequeños y claros.
4. Campos con altura moderada.
5. No usar controles robustos.
6. Usar negrita únicamente en títulos o valores clave.
7. Mantener consistencia con el diseño actual del admin.
8. Usar badges para estado y stock.
9. Evitar saturar la pantalla con textos innecesarios.
10. Mantener acciones visibles y fáciles de identificar.

### Tabla

1. Miniatura de imagen pequeña.
2. Nombre de producto destacado.
3. Marca visible como badge o texto secundario.
4. Precio con formato GTQ.
5. Stock con indicador visual.
6. Acciones compactas.

### Formularios

1. Agrupar campos por secciones.
2. Evitar columnas excesivamente anchas.
3. Usar máximo 2 o 3 columnas en desktop según el ancho.
4. En móvil, mostrar una columna.
5. Mostrar errores debajo de cada campo.

---

## 53. Auditoría y trazabilidad

El sistema debe guardar:

* Usuario que creó la marca.
* Fecha de creación de la marca.
* Usuario que modificó la marca.
* Fecha de modificación de la marca.
* Usuario que creó el producto.
* Fecha de creación del producto.
* Usuario que modificó el producto.
* Fecha de modificación del producto.
* Cambios de stock.
* Cambios de estado.
* Cambios de visibilidad.

---

## 54. Casos de uso

### Caso de uso 1: Admin crea una marca

1. Admin ingresa a Tienda > Marcas.
2. Presiona Nueva marca.
3. Ingresa nombre, código y logo.
4. Guarda la marca.
5. El sistema valida duplicados.
6. El sistema crea la marca activa.

Resultado esperado:

La marca queda disponible para asociar productos.

---

### Caso de uso 2: Admin crea un producto

1. Admin ingresa a Tienda > Productos.
2. Presiona Nuevo producto.
3. Ingresa nombre, marca, precio, stock e imagen.
4. Marca el producto como visible en tienda.
5. Guarda el producto.

Resultado esperado:

El producto queda registrado y disponible para mostrarse en la tienda cliente si cumple las reglas de visibilidad.

---

### Caso de uso 3: Admin inactiva producto

1. Admin ingresa a la tabla de productos.
2. Selecciona producto.
3. Cambia estado a inactivo.
4. Confirma acción.
5. El sistema actualiza estado.

Resultado esperado:

El producto deja de aparecer en la PWA Cliente.

---

### Caso de uso 4: Admin actualiza stock

1. Admin entra a editar producto.
2. Cambia stock disponible.
3. Guarda cambios.
4. El sistema registra movimiento de stock.

Resultado esperado:

El stock actualizado se refleja en la tienda cliente.

---

### Caso de uso 5: Cliente no ve producto de marca inactiva

1. Admin inactiva una marca.
2. La marca tiene productos activos.
3. Cliente entra a tienda.

Resultado esperado:

Los productos asociados a esa marca no deben mostrarse.

---

## 55. Criterios de aceptación

1. El admin debe poder ver la opción Tienda en el menú.
2. El admin debe poder acceder a Marcas.
3. El admin debe poder crear una marca.
4. El admin debe poder editar una marca.
5. El admin debe poder ver el detalle de una marca.
6. El admin debe poder activar o inactivar una marca.
7. La tabla de marcas debe tener búsqueda por nombre.
8. La tabla de marcas debe tener filtro por estado.
9. Una marca inactiva no debe aparecer en el filtro de marca de la tienda cliente.
10. El admin debe poder acceder a Productos.
11. El admin debe poder crear un producto.
12. El admin debe poder editar un producto.
13. El admin debe poder ver detalle de un producto.
14. El admin debe poder activar o inactivar un producto.
15. El admin debe poder definir si un producto es visible en tienda.
16. Todo producto debe estar asociado a una marca activa para publicarse.
17. El producto debe tener precio mayor a cero.
18. El producto debe tener stock no negativo.
19. El sistema debe mostrar precio en quetzales.
20. El sistema debe permitir subir imagen principal.
21. El sistema debe validar formatos de imagen.
22. El sistema debe validar peso máximo de imagen.
23. La tabla de productos debe mostrar imagen, producto, marca, precio, stock, estado y acciones.
24. La tabla de productos debe tener paginación.
25. La tabla de productos debe permitir búsqueda.
26. La tabla de productos debe permitir filtro por marca.
27. La tabla de productos debe permitir filtro por estado.
28. La tabla de productos debe permitir filtro por disponibilidad.
29. Un producto inactivo no debe mostrarse en PWA Cliente.
30. Un producto no visible en tienda no debe mostrarse en PWA Cliente.
31. Un producto de una marca inactiva no debe mostrarse en PWA Cliente.
32. Un producto sin stock no debe poder agregarse al carrito.
33. El sistema debe registrar movimientos de stock.
34. El sistema debe guardar auditoría de creación y modificación.
35. El cambio de precio no debe afectar pedidos anteriores.
36. El cambio de nombre del producto no debe afectar snapshots de pedidos anteriores.
37. El diseño debe ser compacto.
38. Los botones deben ser pequeños y claros.
39. Cada pantalla debe tener su ruta propia.
40. Cada componente debe estar separado por responsabilidad.

---

## 56. Resultado esperado del FRD

Al finalizar este desarrollo, la plataforma administrativa contará con un módulo de **Productos y Marcas** que permitirá publicar productos en la tienda de la PWA Cliente.

Los clientes podrán ver productos activos, visibles y asociados a marcas activas. Los productos podrán filtrarse por marca, mostrarse con imagen, precio, disponibilidad y agregarse posteriormente al carrito para solicitud de pedido con pago en efectivo contra entrega.
