# FRD 09 — Reportes de Tienda y Entregas

## 1. Información general del requerimiento

### Nombre del módulo

Reportes de Tienda y Entregas

### Plataforma

Web Administrador

### Tipo de módulo

Módulo administrativo de consulta, análisis y exportación de información relacionada con ventas de tienda, pedidos, marcas, productos, entregas, cobros en efectivo, motoristas y liquidaciones.

### Objetivo general

Permitir que la empresa pueda analizar el comportamiento del módulo de tienda mediante reportes operativos y comerciales, facilitando la revisión de ventas, pedidos, productos vendidos, marcas, entregas realizadas, entregas fallidas, efectivo cobrado, pagos pendientes a motoristas y liquidaciones realizadas.

El módulo debe servir como herramienta de seguimiento para la operación diaria, toma de decisiones y control interno.

---

## 2. Contexto funcional

El sistema contará con una tienda dentro de la PWA Cliente, donde los clientes podrán solicitar productos de diferentes marcas. El pago será únicamente efectivo contra entrega.

La empresa administrará productos, marcas, pedidos, programación de entregas, motoristas y liquidaciones. Debido a esto, se requiere un módulo de reportes que consolide la información generada por los diferentes flujos.

Los reportes deben enfocarse en:

* Ventas generadas por tienda.
* Pedidos por estado.
* Productos más solicitados.
* Marcas más vendidas.
* Entregas programadas.
* Entregas completadas.
* Entregas no entregadas.
* Efectivo cobrado.
* Motoristas asignados.
* Pagos pendientes a motoristas.
* Liquidaciones realizadas.

---

## 3. Alcance del FRD

Este FRD contempla:

* Dashboard de reportes de tienda.
* Reporte de pedidos.
* Reporte de ventas.
* Reporte por marca.
* Reporte por producto.
* Reporte de entregas.
* Reporte de motoristas.
* Reporte de cobros en efectivo.
* Reporte de pagos a motoristas.
* Reporte de liquidaciones.
* Filtros por fecha, estado, marca, producto, motorista y cliente.
* Exportación de reportes.
* Cards de resumen.
* Tablas detalladas.
* Gráficas básicas.
* Indicadores operativos.
* Validaciones de permisos.
* Modelo de datos sugerido.
* Endpoints sugeridos.
* Componentes sugeridos.
* Criterios de aceptación.

---

## 4. Fuera de alcance

Este FRD no contempla:

* Inteligencia artificial predictiva.
* Proyección automática de ventas.
* Integración contable.
* Conciliación bancaria.
* Facturación electrónica.
* Reportes fiscales.
* Reportes de nómina.
* Pago automático a motoristas.
* Reportes con ubicación GPS.
* Mapas de calor.
* Optimización de rutas.

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
/admin/tienda/reportes
```

---

## 6. Rutas sugeridas

```txt
/admin/tienda/reportes
/admin/tienda/reportes/pedidos
/admin/tienda/reportes/ventas
/admin/tienda/reportes/marcas
/admin/tienda/reportes/productos
/admin/tienda/reportes/entregas
/admin/tienda/reportes/motoristas
/admin/tienda/reportes/cobros
/admin/tienda/reportes/liquidaciones
```

Cada reporte puede estar en una ruta separada para mantener orden, escalabilidad y separación de responsabilidades.

---

## 7. Permisos del módulo

El módulo debe respetar la lógica de roles y permisos del sistema.

### Permisos sugeridos

* Ver reportes de tienda.
* Ver reporte de pedidos.
* Ver reporte de ventas.
* Ver reporte por marca.
* Ver reporte por producto.
* Ver reporte de entregas.
* Ver reporte de motoristas.
* Ver reporte de cobros.
* Ver reporte de liquidaciones.
* Exportar reportes.
* Ver montos financieros.
* Ver datos de clientes.
* Ver datos de motoristas.

### Reglas

1. Un usuario sin permiso de ver reportes no debe acceder al módulo.
2. Un usuario sin permiso de ver montos financieros no debe ver totales monetarios.
3. Un usuario sin permiso de exportar no debe ver botones de exportación.
4. Un usuario sin permiso de ver datos de motorista no debe ver información detallada de pagos.
5. Las validaciones deben aplicarse en frontend y backend.
6. Los reportes deben respetar las restricciones de seguridad existentes.

---

# SECCIÓN A — DASHBOARD GENERAL DE REPORTES

## 8. Pantalla principal de reportes

### Ruta

```txt
/admin/tienda/reportes
```

### Objetivo

Mostrar una vista general del comportamiento del módulo de tienda.

### Elementos principales

La pantalla debe contener:

1. Encabezado.
2. Filtros globales.
3. Cards de resumen.
4. Gráficas principales.
5. Tablas resumidas.
6. Accesos a reportes detallados.
7. Botón de exportación, si aplica.

---

## 9. Encabezado

### Título

```txt
Reportes de tienda
```

### Subtítulo sugerido

```txt
Consulta ventas, pedidos, entregas, cobros y desempeño de motoristas.
```

---

## 10. Filtros globales

Los filtros globales deben aplicar al dashboard general.

### Filtros requeridos

* Fecha desde.
* Fecha hasta.
* Marca.
* Estado del pedido.
* Estado de entrega.
* Motorista.
* Producto.
* Cliente.

### Rangos rápidos sugeridos

* Hoy.
* Ayer.
* Últimos 7 días.
* Últimos 30 días.
* Este mes.
* Mes anterior.
* Este año.

### Reglas

1. Los filtros deben ser compactos.
2. Deben poder combinarse.
3. Debe existir botón para limpiar filtros.
4. Los resultados deben actualizarse sin recargar toda la pantalla.
5. Por defecto, puede cargar el mes actual.
6. Las fechas deben validarse correctamente.
7. La fecha desde no puede ser mayor que la fecha hasta.

---

## 11. Cards de resumen general

Cards sugeridas:

1. **Total pedidos**
2. **Pedidos entregados**
3. **Pedidos pendientes**
4. **Pedidos cancelados**
5. **Pedidos no entregados**
6. **Ventas solicitadas**
7. **Efectivo cobrado**
8. **Pendiente de cobro**
9. **Pagos pendientes a motoristas**
10. **Pagos liquidados a motoristas**

### Reglas

1. Las cards deben ser compactas.
2. Los títulos deben ir en negrita.
3. Los montos deben mostrarse en quetzales.
4. Los usuarios sin permiso financiero no deben ver montos.
5. Las cards pueden funcionar como filtros rápidos.
6. No deben saturar visualmente la pantalla.

---

## 12. Gráficas sugeridas

### Gráficas de primera fase

1. Pedidos por estado.
2. Ventas por marca.
3. Entregas por estado.
4. Cobros por día.
5. Pagos a motoristas por estado.

### Reglas

1. Las gráficas deben ser simples.
2. No deben ser excesivamente grandes.
3. Deben respetar el diseño actual del admin.
4. Deben usar datos filtrados.
5. Deben permitir lectura rápida.
6. Si no hay datos, mostrar estado vacío.

---

# SECCIÓN B — REPORTE DE PEDIDOS

## 13. Reporte de pedidos

### Ruta

```txt
/admin/tienda/reportes/pedidos
```

### Objetivo

Permitir consultar todos los pedidos generados desde la tienda, segmentados por estado, fecha, cliente, marca y entrega.

### Información a mostrar

* Número de pedido.
* Cliente.
* Teléfono.
* Fecha de solicitud.
* Fecha sugerida.
* Fecha confirmada.
* Estado del pedido.
* Estado de entrega.
* Estado de pago del cliente.
* Total del pedido.
* Motorista asignado.
* Acciones.

---

## 14. Filtros del reporte de pedidos

### Filtros requeridos

* Fecha de solicitud.
* Fecha confirmada de entrega.
* Estado del pedido.
* Estado de entrega.
* Estado de pago.
* Cliente.
* Marca.
* Producto.
* Motorista.

### Reglas

1. Debe permitir búsqueda por número de pedido.
2. Debe permitir búsqueda por cliente.
3. Debe permitir búsqueda por teléfono.
4. Debe permitir filtros combinados.
5. Debe permitir exportar si el usuario tiene permiso.
6. Debe respetar paginación.

---

## 15. Indicadores del reporte de pedidos

Indicadores sugeridos:

* Total de pedidos.
* Pedidos solicitados.
* Pedidos confirmados.
* Pedidos reprogramados.
* Pedidos entregados.
* Pedidos no entregados.
* Pedidos cancelados.
* Tiempo promedio de confirmación.
* Tiempo promedio de entrega.

---

# SECCIÓN C — REPORTE DE VENTAS

## 16. Reporte de ventas

### Ruta

```txt
/admin/tienda/reportes/ventas
```

### Objetivo

Analizar los montos de pedidos generados y entregados dentro de la tienda.

### Diferencia importante

Se deben separar:

* **Ventas solicitadas:** pedidos creados por clientes.
* **Ventas confirmadas:** pedidos confirmados por admin.
* **Ventas entregadas/cobradas:** pedidos entregados y cobrados en efectivo.

---

## 17. Métricas de ventas

Métricas sugeridas:

* Total ventas solicitadas.
* Total ventas confirmadas.
* Total efectivo cobrado.
* Total pendiente de cobro.
* Total anulado.
* Ticket promedio.
* Cantidad de pedidos entregados.
* Cantidad de pedidos no entregados.

### Reglas

1. El reporte debe mostrar montos en quetzales.
2. No debe considerar como venta cobrada un pedido solo solicitado.
3. El efectivo cobrado debe venir de pedidos entregados y pagos confirmados.
4. Los pedidos cancelados deben separarse.
5. Los pedidos no entregados deben separarse.
6. Los usuarios sin permiso financiero no deben ver montos.

---

## 18. Tabla de ventas

Columnas sugeridas:

* Número de pedido.
* Fecha de solicitud.
* Fecha de entrega.
* Cliente.
* Marcas.
* Total pedido.
* Monto cobrado.
* Estado de pago.
* Estado de entrega.
* Motorista.

---

# SECCIÓN D — REPORTE POR MARCA

## 19. Reporte por marca

### Ruta

```txt
/admin/tienda/reportes/marcas
```

### Objetivo

Permitir analizar el desempeño de ventas y pedidos por marca.

### Información a mostrar

* Marca.
* Pedidos solicitados.
* Pedidos confirmados.
* Pedidos entregados.
* Productos vendidos.
* Total vendido.
* Total cobrado.
* Pedidos cancelados.
* Pedidos no entregados.

### Reglas

1. Un pedido puede contener productos de varias marcas.
2. El reporte debe calcular por ítems, no solo por pedido.
3. Si un pedido tiene varias marcas, cada marca debe recibir su proporción según sus productos.
4. El total por marca debe usar subtotales de productos.
5. Los usuarios sin permiso financiero no deben ver montos.

---

## 20. Indicadores por marca

Indicadores sugeridos:

* Marca con más pedidos.
* Marca con mayor monto cobrado.
* Marca con más productos vendidos.
* Marca con más cancelaciones.
* Marca con más no entregas.

---

# SECCIÓN E — REPORTE POR PRODUCTO

## 21. Reporte por producto

### Ruta

```txt
/admin/tienda/reportes/productos
```

### Objetivo

Permitir analizar qué productos se venden más, cuáles generan más ingresos y cuáles tienen mayor demanda.

### Información a mostrar

* Producto.
* Marca.
* SKU.
* Cantidad solicitada.
* Cantidad confirmada.
* Cantidad entregada.
* Cantidad cancelada.
* Total vendido.
* Stock actual.
* Estado actual del producto.

### Reglas

1. Debe usar snapshot del pedido para pedidos históricos.
2. Debe mostrar stock actual desde producto vigente.
3. Debe separar productos entregados de productos solo solicitados.
4. Debe permitir filtrar por marca.
5. Debe permitir filtrar por estado del producto.

---

## 22. Indicadores por producto

Indicadores sugeridos:

* Producto más solicitado.
* Producto más entregado.
* Producto con mayor ingreso.
* Producto con más cancelaciones.
* Producto con stock bajo.
* Producto sin stock.

---

# SECCIÓN F — REPORTE DE ENTREGAS

## 23. Reporte de entregas

### Ruta

```txt
/admin/tienda/reportes/entregas
```

### Objetivo

Analizar el comportamiento operativo de las entregas programadas.

### Información a mostrar

* Número de pedido.
* Cliente.
* Dirección resumida.
* Zona.
* Fecha programada.
* Rango horario.
* Motorista.
* Estado de entrega.
* Resultado.
* Motivo de no entrega.
* Tiempo total de entrega.

---

## 24. Métricas de entregas

Métricas sugeridas:

* Entregas programadas.
* Entregas asignadas.
* Entregas en ruta.
* Entregas completadas.
* Entregas no entregadas.
* Entregas canceladas.
* Porcentaje de entregas exitosas.
* Tiempo promedio desde programación hasta entrega.
* Tiempo promedio en ruta.
* Cantidad de reprogramaciones.

---

## 25. Reporte de no entregas

Debe existir una vista o filtro especial para no entregas.

### Información requerida

* Pedido.
* Cliente.
* Motorista.
* Fecha programada.
* Motivo de no entrega.
* Comentario.
* Estado de pago cliente.
* Estado de pago motorista.
* Acción posterior, si aplica.

### Motivos esperados

* Cliente no contestó.
* Cliente no se encontraba.
* Dirección incorrecta.
* Dirección incompleta.
* Cliente rechazó pedido.
* Cliente no tenía efectivo.
* Zona inaccesible.
* Producto no recibido por inconformidad.
* Problema operativo.
* Otro.

---

# SECCIÓN G — REPORTE DE MOTORISTAS

## 26. Reporte de motoristas

### Ruta

```txt
/admin/tienda/reportes/motoristas
```

### Objetivo

Analizar el desempeño operativo de cada motorista.

### Información a mostrar

* Motorista.
* Tipo.
* Entregas asignadas.
* Entregas en ruta.
* Entregas completadas.
* Entregas no entregadas.
* Entregas canceladas.
* Porcentaje de éxito.
* Total cobrado por entregas.
* Pago pendiente.
* Pago liquidado.
* Pago retenido.

### Reglas

1. Los montos de pago al motorista solo deben mostrarse a usuarios autorizados.
2. El cliente nunca debe ver esta información.
3. Debe permitir filtrar por motorista.
4. Debe permitir filtrar por fecha.
5. Debe permitir exportar.

---

## 27. Indicadores por motorista

Indicadores sugeridos:

* Motorista con más entregas.
* Motorista con mayor porcentaje de éxito.
* Motorista con más no entregas.
* Motorista con más pagos pendientes.
* Motorista con pagos retenidos.
* Tiempo promedio en ruta por motorista.

---

# SECCIÓN H — REPORTE DE COBROS EN EFECTIVO

## 28. Reporte de cobros en efectivo

### Ruta

```txt
/admin/tienda/reportes/cobros
```

### Objetivo

Controlar el efectivo que se cobró al cliente mediante entregas confirmadas.

### Información a mostrar

* Pedido.
* Cliente.
* Fecha de entrega.
* Motorista.
* Total del pedido.
* Monto cobrado.
* Estado de pago.
* Fecha de cobro.
* Usuario/motorista que confirmó cobro.

### Reglas

1. Solo debe considerar pedidos con pago confirmado.
2. El método de pago debe ser efectivo contra entrega.
3. Debe separar pendiente de cobro, cobrado, no cobrado y anulado.
4. No debe mezclar cobros del cliente con pagos al motorista.
5. Debe permitir exportar.
6. Los montos deben ocultarse si el usuario no tiene permiso financiero.

---

## 29. Métricas de cobros

Métricas sugeridas:

* Total efectivo cobrado.
* Total pendiente de cobro.
* Total no cobrado.
* Total anulado.
* Cantidad de pedidos cobrados.
* Cantidad de pedidos pendientes.
* Cobro promedio por pedido.

---

# SECCIÓN I — REPORTE DE LIQUIDACIONES

## 30. Reporte de liquidaciones

### Ruta

```txt
/admin/tienda/reportes/liquidaciones
```

### Objetivo

Permitir analizar pagos realizados, pendientes y retenidos a motoristas.

### Información a mostrar

* Número de liquidación.
* Motorista.
* Fecha de liquidación.
* Cantidad de pedidos liquidados.
* Total liquidado.
* Método interno de pago.
* Estado de liquidación.
* Usuario que liquidó.

---

## 31. Métricas de liquidaciones

Métricas sugeridas:

* Total pendiente de liquidar.
* Total liquidado.
* Total retenido.
* Total no aplica.
* Liquidaciones realizadas.
* Motoristas con saldo pendiente.
* Motoristas con pagos retenidos.

### Reglas

1. Solo usuarios autorizados deben ver montos.
2. Debe permitir filtrar por motorista.
3. Debe permitir filtrar por fecha.
4. Debe permitir ver detalle de liquidación.
5. Debe permitir exportar.

---

# SECCIÓN J — EXPORTACIONES

## 32. Exportación de reportes

El módulo debe permitir exportar reportes según permisos.

### Formatos sugeridos

```txt
XLSX
CSV
PDF, opcional
```

### Reportes exportables

* Pedidos.
* Ventas.
* Marcas.
* Productos.
* Entregas.
* No entregas.
* Motoristas.
* Cobros.
* Liquidaciones.

### Reglas

1. La exportación debe respetar filtros aplicados.
2. La exportación debe respetar permisos.
3. Si el usuario no puede ver montos, no debe exportar montos.
4. Debe incluir fecha de generación.
5. Debe incluir usuario que generó el reporte.
6. Debe incluir encabezados claros.
7. Debe incluir totales cuando aplique.
8. Debe evitar exportaciones vacías sin aviso.

---

# SECCIÓN K — MODELO DE DATOS SUGERIDO

## 33. Tablas fuente principales

Los reportes deben generarse a partir de tablas ya definidas en FRD anteriores:

```txt
store_brands
store_products
store_orders
store_order_items
store_order_timeline
store_delivery_schedule
store_delivery_schedule_history
store_drivers
store_driver_assignments
store_driver_liquidations
store_driver_liquidation_items
store_driver_payment_history
```

---

## 34. Vistas o consultas sugeridas

Para facilitar reportes, se pueden crear vistas o servicios de agregación.

### Vistas sugeridas

```txt
vw_store_orders_report
vw_store_sales_report
vw_store_brand_sales_report
vw_store_product_sales_report
vw_store_delivery_report
vw_store_driver_performance_report
vw_store_cash_collection_report
vw_store_driver_liquidation_report
```

### Reglas

1. Las vistas no son obligatorias en primera fase.
2. Pueden reemplazarse por consultas desde servicios.
3. Si el volumen crece, se recomienda optimizar con vistas o tablas materializadas.
4. Los reportes deben paginar tablas grandes.
5. Las consultas deben evitar cargar todos los registros sin filtros.

---

# SECCIÓN L — SERVICIOS SUGERIDOS

## 35. Servicios backend

```txt
StoreReportsService
StoreOrdersReportService
StoreSalesReportService
StoreBrandsReportService
StoreProductsReportService
StoreDeliveriesReportService
StoreDriversReportService
StoreCashCollectionsReportService
StoreLiquidationsReportService
StoreReportsExportService
StoreReportsPermissionService
```

---

## 36. Responsabilidades de servicios

### StoreReportsService

Coordina dashboard general y filtros globales.

### StoreOrdersReportService

Genera reporte de pedidos y estados.

### StoreSalesReportService

Genera reporte de ventas solicitadas, confirmadas y cobradas.

### StoreBrandsReportService

Genera análisis por marca.

### StoreProductsReportService

Genera análisis por producto.

### StoreDeliveriesReportService

Genera reporte operativo de entregas y no entregas.

### StoreDriversReportService

Genera desempeño por motorista.

### StoreCashCollectionsReportService

Genera control de efectivo cobrado.

### StoreLiquidationsReportService

Genera reporte de pagos a motoristas.

### StoreReportsExportService

Genera archivos exportables respetando filtros y permisos.

### StoreReportsPermissionService

Valida qué información puede ver cada usuario.

---

# SECCIÓN M — ENDPOINTS SUGERIDOS

## 37. Dashboard general

```txt
GET /api/admin/store/reports/dashboard
```

### Query params

```txt
dateFrom
dateTo
brandId
productId
driverId
orderStatus
deliveryStatus
paymentStatus
```

---

## 38. Reporte de pedidos

```txt
GET /api/admin/store/reports/orders
```

---

## 39. Reporte de ventas

```txt
GET /api/admin/store/reports/sales
```

---

## 40. Reporte por marcas

```txt
GET /api/admin/store/reports/brands
```

---

## 41. Reporte por productos

```txt
GET /api/admin/store/reports/products
```

---

## 42. Reporte de entregas

```txt
GET /api/admin/store/reports/deliveries
```

---

## 43. Reporte de motoristas

```txt
GET /api/admin/store/reports/drivers
```

---

## 44. Reporte de cobros en efectivo

```txt
GET /api/admin/store/reports/cash-collections
```

---

## 45. Reporte de liquidaciones

```txt
GET /api/admin/store/reports/liquidations
```

---

## 46. Exportar reporte

```txt
GET /api/admin/store/reports/export
```

### Query params sugeridos

```txt
reportType
format
dateFrom
dateTo
brandId
productId
driverId
orderStatus
deliveryStatus
paymentStatus
```

### reportType sugeridos

```txt
orders
sales
brands
products
deliveries
drivers
cash_collections
liquidations
```

---

# SECCIÓN N — COMPONENTES FRONTEND

## 47. Componentes sugeridos

```txt
StoreReportsPage.tsx
StoreReportsFilters.tsx
StoreReportsSummaryCards.tsx
StoreReportsChartCard.tsx
StoreOrdersReportTable.tsx
StoreSalesReportTable.tsx
StoreBrandsReportTable.tsx
StoreProductsReportTable.tsx
StoreDeliveriesReportTable.tsx
StoreDriversReportTable.tsx
StoreCashCollectionsReportTable.tsx
StoreLiquidationsReportTable.tsx
StoreReportExportButton.tsx
StoreReportEmptyState.tsx
StoreReportPermissionGuard.tsx
```

---

## 48. Estructura sugerida de archivos

```txt
app/
  admin/
    tienda/
      reportes/
        page.tsx
        pedidos/
          page.tsx
        ventas/
          page.tsx
        marcas/
          page.tsx
        productos/
          page.tsx
        entregas/
          page.tsx
        motoristas/
          page.tsx
        cobros/
          page.tsx
        liquidaciones/
          page.tsx
        components/
          StoreReportsFilters.tsx
          StoreReportsSummaryCards.tsx
          StoreReportsChartCard.tsx
          StoreOrdersReportTable.tsx
          StoreSalesReportTable.tsx
          StoreBrandsReportTable.tsx
          StoreProductsReportTable.tsx
          StoreDeliveriesReportTable.tsx
          StoreDriversReportTable.tsx
          StoreCashCollectionsReportTable.tsx
          StoreLiquidationsReportTable.tsx
          StoreReportExportButton.tsx
          StoreReportEmptyState.tsx
          StoreReportPermissionGuard.tsx

lib/
  services/
    store/
      reports/
        storeReportsService.ts
        storeOrdersReportService.ts
        storeSalesReportService.ts
        storeBrandsReportService.ts
        storeProductsReportService.ts
        storeDeliveriesReportService.ts
        storeDriversReportService.ts
        storeCashCollectionsReportService.ts
        storeLiquidationsReportService.ts
        storeReportsExportService.ts
        storeReportsPermissionService.ts

types/
  store/
    reports/
      storeReports.ts
      storeOrdersReport.ts
      storeSalesReport.ts
      storeBrandsReport.ts
      storeProductsReport.ts
      storeDeliveriesReport.ts
      storeDriversReport.ts
      storeCashCollectionsReport.ts
      storeLiquidationsReport.ts
```

---

# SECCIÓN O — DISEÑO VISUAL

## 49. Consideraciones visuales

1. El diseño debe ser compacto.
2. Las cards deben ser de baja altura.
3. Las tablas deben tener paginación.
4. Los filtros no deben ser robustos.
5. Los botones deben ser pequeños y claros.
6. Los montos deben mostrarse en quetzales.
7. Los estados deben mostrarse como badges.
8. Las gráficas deben ser simples.
9. Debe existir estado vacío cuando no haya datos.
10. Debe existir loading al consultar información.
11. Los títulos deben ir en negrita.
12. La exportación debe estar visible solo si el usuario tiene permiso.
13. No debe saturarse la pantalla con demasiadas gráficas.
14. El dashboard debe priorizar información accionable.

---

## 50. Badges sugeridos

### Pedidos

```txt
Solicitado
En revisión
Confirmado
Reprogramado
Preparando
Asignado
En ruta
Entregado
No entregado
Cancelado
```

### Pagos cliente

```txt
Pendiente de cobro
Cobrado en efectivo
No cobrado
Anulado
```

### Pagos motorista

```txt
Pendiente de liquidar
Liquidado
Retenido
No aplica
```

---

# SECCIÓN P — VALIDACIONES

## 51. Validaciones generales

1. Usuario debe estar autenticado.
2. Usuario debe tener permiso para ver reportes.
3. Usuario debe tener permiso para ver montos financieros.
4. Usuario debe tener permiso para exportar.
5. Fecha desde no puede ser mayor a fecha hasta.
6. Los filtros deben validarse.
7. Los reportes deben paginar resultados.
8. No debe cargar todos los registros si no hay límite.
9. No debe exportar información no autorizada.
10. Debe manejar estado sin datos.
11. Debe manejar errores de consulta.
12. Debe evitar cálculos duplicados o inconsistentes.

---

# SECCIÓN Q — CASOS DE USO

## 52. Caso de uso 1: Admin consulta dashboard general

1. Admin ingresa a Tienda > Reportes.
2. El sistema muestra resumen general.
3. Admin aplica filtro de fechas.
4. El sistema actualiza cards, gráficas y tablas.

### Resultado esperado

El admin obtiene panorama general del módulo de tienda.

---

## 53. Caso de uso 2: Admin consulta ventas por marca

1. Admin entra a Reportes > Marcas.
2. Selecciona rango de fechas.
3. El sistema muestra pedidos, productos y montos por marca.
4. Admin exporta el reporte.

### Resultado esperado

El admin identifica qué marcas tienen mejor desempeño.

---

## 54. Caso de uso 3: Admin revisa entregas no completadas

1. Admin entra a Reportes > Entregas.
2. Filtra por estado No entregada.
3. El sistema muestra motivos y motoristas relacionados.
4. Admin revisa detalle de pedidos.

### Resultado esperado

El admin identifica problemas operativos de entrega.

---

## 55. Caso de uso 4: Admin consulta desempeño de motorista

1. Admin entra a Reportes > Motoristas.
2. Selecciona motorista.
3. Revisa entregas asignadas, completadas y fallidas.
4. Consulta pagos pendientes y liquidados.

### Resultado esperado

El admin evalúa desempeño operativo y pagos del motorista.

---

## 56. Caso de uso 5: Admin exporta reporte de cobros

1. Admin entra a Reportes > Cobros.
2. Selecciona rango de fechas.
3. Presiona Exportar.
4. El sistema genera archivo con cobros en efectivo.

### Resultado esperado

El admin obtiene control del efectivo cobrado contra entrega.

---

# SECCIÓN R — CRITERIOS DE ACEPTACIÓN

## 57. Criterios funcionales

1. Debe existir opción **Reportes** dentro del menú Tienda.
2. Debe existir dashboard general de reportes.
3. Deben existir filtros globales.
4. Debe permitir filtrar por fecha.
5. Debe permitir filtrar por marca.
6. Debe permitir filtrar por producto.
7. Debe permitir filtrar por motorista.
8. Debe permitir filtrar por estado de pedido.
9. Debe permitir filtrar por estado de entrega.
10. Debe permitir filtrar por estado de pago.
11. Debe mostrar total de pedidos.
12. Debe mostrar pedidos entregados.
13. Debe mostrar pedidos pendientes.
14. Debe mostrar pedidos cancelados.
15. Debe mostrar ventas solicitadas.
16. Debe mostrar efectivo cobrado.
17. Debe mostrar pagos pendientes a motoristas.
18. Debe mostrar pagos liquidados a motoristas.
19. Debe existir reporte de pedidos.
20. Debe existir reporte de ventas.
21. Debe existir reporte por marca.
22. Debe existir reporte por producto.
23. Debe existir reporte de entregas.
24. Debe existir reporte de motoristas.
25. Debe existir reporte de cobros en efectivo.
26. Debe existir reporte de liquidaciones.
27. Los reportes deben mostrar montos en quetzales.
28. Los usuarios sin permiso financiero no deben ver montos.
29. Debe permitir exportar reportes.
30. La exportación debe respetar filtros.
31. La exportación debe respetar permisos.
32. Debe existir paginación en tablas.
33. Debe existir estado vacío cuando no haya datos.
34. Deben existir badges de estado.
35. Los reportes deben separar venta solicitada, confirmada y cobrada.
36. El efectivo cobrado debe venir de pedidos entregados y pago confirmado.
37. El reporte por marca debe calcularse por ítems de pedido.
38. El reporte por producto debe usar snapshots históricos.
39. El reporte de motoristas debe mostrar desempeño operativo.
40. El reporte de liquidaciones debe mostrar pagos pendientes, liquidados y retenidos.
41. No debe mezclarse pago del cliente con pago al motorista.
42. El cliente nunca debe ver estos reportes.
43. La PWA Motorista no debe ver reportes globales.
44. Las validaciones deben aplicarse en frontend y backend.
45. Cada pantalla debe tener ruta propia.
46. Cada componente debe estar separado por responsabilidad.
47. El diseño debe ser compacto.
48. Los filtros no deben ser robustos.
49. Los botones deben ser pequeños y claros.
50. El módulo debe integrarse con pedidos, entregas, motoristas y liquidaciones.

---

## 58. Resultado esperado del FRD

Al finalizar este desarrollo, la plataforma administrativa contará con un módulo de **Reportes de Tienda y Entregas** que permitirá analizar ventas, pedidos, marcas, productos, entregas, cobros en efectivo, desempeño de motoristas y liquidaciones.

Este módulo permitirá controlar la operación completa de la tienda, desde la solicitud del cliente hasta la entrega, cobro y liquidación interna del motorista.
