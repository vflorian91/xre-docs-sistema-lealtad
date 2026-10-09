# Banners Publicitarios P1

## Alcance implementado

El sistema ya permite administrar banners publicitarios basicos para la PWA Cliente.
Estos banners son contenido visual/comercial, no reglas de promocion automatica.

## Modelo

`MarketingBanner`

- `title`: titulo visible.
- `subtitle`: texto corto opcional.
- `badge`: etiqueta corta opcional.
- `imageUrl`: URL de imagen subida por el modulo de media.
- `ctaLabel` y `ctaUrl`: datos opcionales para una accion futura.
- `tone`: tono visual permitido.
- `isActive`: control de publicacion.
- `startsAt` y `endsAt`: ventana de vigencia.
- `sortOrder`: orden de aparicion.

## Endpoints

- `GET /api/marketing-banners`: listado administrativo protegido.
- `POST /api/marketing-banners`: creacion protegida.
- `PATCH /api/marketing-banners/:id`: actualizacion protegida.
- `GET /api/marketing-banners/public`: listado publico solo de banners activos y vigentes.

## Seguridad

- La administracion requiere sesion interna y permisos `marketing.read` o `marketing.manage`.
- Las subidas de imagen se hacen por `POST /api/media/assets` con `purpose: BANNER`.
- La metadata del archivo vive en base de datos y el archivo fisico queda fuera del repo.
- Creacion y actualizacion de banners quedan auditadas.

## Decisiones

- No se mezclo con promociones/campanas P2 para evitar que la tienda seleccione promociones
  manualmente.
- La PWA Cliente solo consume banners activos y vigentes desde backend.
- El motor automatico de promociones seguira siendo un modulo separado.
