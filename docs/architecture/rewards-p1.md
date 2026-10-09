# Premios Basicos P1

## Alcance implementado

El sistema ya cuenta con catalogo basico de premios administrado desde backend y persistido en
PostgreSQL. La Web Administrador puede consultar y crear premios, y la PWA Cliente consume la
lista publica de premios activos. La Web Administrador tambien puede subir imagen de premio
desde el modulo de media.

## Modelo

`Reward`

- `code`: codigo unico interno del premio.
- `name`: nombre visible.
- `description`: descripcion opcional.
- `pointsCost`: costo en puntos.
- `stock`: existencia opcional.
- `imageUrl`: URL de imagen servida por el modulo de media.
- `isActive`: controla visibilidad publica.
- `isFeatured`: prioriza premios destacados.
- `sortOrder`: orden de despliegue.

## Endpoints

- `GET /api/rewards/public`: lista publica de premios activos.
- `GET /api/rewards`: lista administrativa protegida.
- `POST /api/rewards`: crea premio protegido.
- `PATCH /api/rewards/:id`: actualiza premio protegido.
- `POST /api/media/rewards/image`: sube imagen y la asocia al premio.

## Seguridad

- La administracion inicial usa permisos `catalogs.read` y `catalogs.manage`.
- El backend valida permisos antes de crear o editar premios.
- La creacion y edicion de premios generan auditoria.
- La subida de imagenes queda auditada desde el modulo de media.
- Los clientes solo ven premios activos desde el endpoint publico.

## Pendiente

- Edicion completa desde Admin Web.
- Migracion de storage local a S3/R2/MinIO.
- Mejoras visuales de cards de premio en PWA Cliente.
