# Media y Storage P1

## Alcance implementado

El sistema ya cuenta con un modulo de media para subir imagenes sin guardarlas dentro del
codigo del proyecto. La metadata se guarda en PostgreSQL y el archivo fisico se guarda en un
storage local configurable fuera del repo.

## Storage local de desarrollo

Por defecto los archivos se guardan en:

```txt
~/sistema-lealtad-media
```

Se puede cambiar con:

```txt
MEDIA_STORAGE_DIR=/ruta/externa/media
```

## Modelo

`MediaAsset`

- `purpose`: `PROFILE_PHOTO`, `REWARD_IMAGE`, `BANNER` o `GENERAL`.
- `filename`: nombre original.
- `mimeType`: tipo de archivo.
- `sizeBytes`: tamano validado.
- `storageProvider`: actualmente `LOCAL`.
- `storageKey`: llave interna del archivo.
- `publicUrl`: URL servida por API.
- `uploadedByInternalUserId`: usuario interno que subio el archivo.
- `uploadedByCustomerId`: cliente que subio el archivo.

## Endpoints

- `POST /api/media/assets`: subida interna generica.
- `POST /api/media/rewards/image`: subida y asociacion de imagen a premio.
- `POST /api/media/customer/profile-photo`: subida de foto de perfil del cliente.
- `GET /api/media/assets/:id/content`: lectura publica del archivo.

## Validaciones

- Solo imagenes `jpeg`, `png`, `webp` o `gif`.
- Tamano maximo actual: 5 MB.
- Subidas internas requieren permiso `catalogs.manage`.
- Banners usan `POST /api/media/assets` con `purpose: BANNER`.
- Foto de perfil usa token de cliente y actualiza solo al cliente autenticado.
- Subidas quedan auditadas.

## Futuro S3/R2/MinIO

El modelo ya separa `storageProvider`, `storageKey` y `publicUrl`, por lo que se puede cambiar
el backend local por S3, Cloudflare R2, MinIO u otro storage compatible sin cambiar las tablas
principales de clientes o premios.
