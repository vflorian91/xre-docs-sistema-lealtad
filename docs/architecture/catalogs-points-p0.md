# Catalogos y Reglas de Puntos P0

## Alcance construido

- Administracion backend de catalogos.
- Administracion backend de valores de catalogo.
- Consulta de catalogos activos para formularios operativos.
- Seed de catalogos base:
  - `SHOE_TYPES`
  - `PRODUCT_CATEGORIES`
  - `BRANDS`
- Consulta de reglas de puntos.
- Consulta de regla activa.
- Creacion de reglas de puntos.
- Activacion de regla unica de puntos.
- Auditoria de cambios en catalogos y reglas.

## Endpoints de catalogos

```txt
GET   /api/catalogs
POST  /api/catalogs
GET   /api/catalogs/:code
PATCH /api/catalogs/:code
POST  /api/catalogs/:code/items
PATCH /api/catalogs/items/:itemId
```

## Endpoints de reglas de puntos

```txt
GET  /api/points/rules
GET  /api/points/rules/active
POST /api/points/rules
POST /api/points/rules/:id/activate
```

## Regla activa P0

El MVP mantiene una sola regla activa para evitar ambiguedad al registrar compras.

La regla inicial del seed es:

```txt
Q1 = 1 punto
redondeo = FLOOR
monto minimo = 0
```

El frontend no debe calcular puntos como fuente de verdad. La PWA Tienda puede mostrar una
vista previa, pero el calculo final debe ejecutarse en backend durante el registro de compra.

## Catalogos para compras

El registro de compra debera usar valores activos de:

```txt
SHOE_TYPES
PRODUCT_CATEGORIES
BRANDS
```

Si un valor esta inactivo, el backend no debe aceptarlo en nuevas compras.
