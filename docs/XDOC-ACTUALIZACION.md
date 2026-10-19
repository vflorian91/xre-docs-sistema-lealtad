# Zapateria XDOC — actualización de octubre de 2026

Los portales de administración, clientes y mensajeros comparten una identidad minimalista y vintage: fondo crema, acentos café, tipografía editorial y tarjetas sencillas. La tienda presenta logos de marcas reconocidas. Los formularios, permisos, pagos, entrega y acceso conservan sus flujos.

El dashboard aplica el mes seleccionado a pagos, incluye pendientes sin fecha de pago y contempla todo el último día del período. La gráfica utiliza los días reales de cada mes y suma ventas con pago confirmado.

## Datos opcionales para una presentación

La carpeta `packages/database/prisma/demo/` contiene exclusivamente un catálogo y actividad ficticios. Incluye 70 productos (los 20 iniciales, 30 incorporaciones y 20 opciones adicionales para mujer), sus tallas, fotos y logos. Los precios y las existencias son ejemplos, sin relación comercial con las marcas.

La actividad agrega 12 clientes ficticios, 3 mensajeros, 108 pedidos, 48 compras de lealtad y 14 canjes para septiembre y octubre de 2026. No muestra etiquetas `[Demo]` en nombres. Los identificadores y la documentación permiten reconocer el origen de los datos. No incluye cuentas de clientes reales, contraseñas, hashes de acceso, sesiones ni copias de la base local.

Con las migraciones y el seed base aplicados, un usuario interno existente y el servicio API iniciado, ejecutar desde la raíz:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml exec -T -e XDOC_LOAD_DEMO=true api node packages/database/prisma/demo/seed-catalog.cjs
docker compose -f docker-compose.yml -f docker-compose.local.yml exec -T -e XDOC_LOAD_DEMO=true api node packages/database/prisma/demo/seed-dashboard.cjs
```

Las cargas son opcionales y no se ejecutan al arrancar la aplicación. El catálogo conserva productos existentes; la actividad valida importes, saldos y existencias, se carga en una transacción y reconoce el lote para evitar duplicados. No ejecutar la carga del catálogo sobre un SKU existente diferente que se pretenda sustituir: los registros existentes se conservan.

Las cuentas de mensajeros se crean sin contraseña. Un administrador debe habilitar el acceso desde **Tienda online → Mensajeros**, usando credenciales propias del entorno. Nunca reutilizar ni publicar las contraseñas de la instalación local.

Los archivos multimedia se conservan dentro del catálogo para poder reproducir la presentación sin depender de enlaces externos. Las fotografías son referencias de los modelos y los logos identifican las marcas; no implican afiliación con XDOC.

## Direcciones locales

- Administración: http://localhost:3000
- Clientes: http://localhost:3002
- Mensajeros: http://localhost:3003/login

La integración de GitHub con Azure DevOps ejecuta el pipeline de validación al actualizar `main`. Los resultados históricos permanecen documentados en `docs/AZURE-DEVOPS.md`; cada ejecución nueva se consulta por su propio identificador.
