# Backups y restauracion

El servicio `backup` crea un respaldo al iniciar y luego cada 24 horas. Cada carpeta dentro de `backups/` contiene:

- `database.dump`: exportacion de PostgreSQL en formato custom.
- `storage/`: copia privada de los objetos de MinIO/S3.
- `metadata.txt`: origen y version del formato.
- `manifest.sha256`: checksums para detectar corrupcion.

La retencion local predeterminada es de 14 dias. Puede cambiarse con `BACKUP_INTERVAL_SECONDS` y `BACKUP_RETENTION_DAYS`.

## Operacion local

Crear un respaldo inmediatamente:

```sh
npm run backup:create
```

Probar el ultimo respaldo en una base y un bucket temporales:

```sh
npm run backup:test
```

La prueba elimina automaticamente los recursos temporales y nunca reemplaza la base principal ni el bucket principal.

## Produccion

El directorio `/backups` debe montarse en un volumen externo, cifrado y separado del servidor principal. Un respaldo guardado solamente en el mismo servidor no protege ante perdida total de la maquina.

Antes de cada despliegue importante y al menos una vez por semana, ejecute la prueba de restauracion y conserve su resultado en los logs del despliegue.
