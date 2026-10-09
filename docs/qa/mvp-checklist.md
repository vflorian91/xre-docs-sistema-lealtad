# Checklist QA MVP

## Seguridad

- Usuario sin sesion no accede a rutas protegidas.
- Usuario sin permiso no ejecuta acciones sensibles.
- Usuario de tienda no opera tiendas no asignadas.
- Usuario multi-tienda debe seleccionar tienda activa antes de operar.
- Tienda inactiva no puede quedar como tienda activa.
- Cliente solo consulta su propia informacion.

## Compras

- El formulario no muestra campo tienda.
- El formulario no muestra campo observaciones.
- El No. de factura acepta solo numeros.
- Factura duplicada en la misma tienda se bloquea.
- Compra sin cliente activo se bloquea.
- Compra sin regla de puntos activa se bloquea.
- El endpoint de compras no acepta `storeId` ni observaciones.
- La consulta de compras de tienda se limita a tienda activa o tiendas asignadas.
- Reversa de compra aprobada cambia estado a `REVERSED`.
- Reversa crea movimiento negativo y conserva historial.
- Segundo intento de reversa queda bloqueado.

## Clientes

- Registro rapido desde tienda usa tienda activa de sesion.
- Registro administrativo puede crear cliente sin tienda activa.
- Telefono duplicado se bloquea.
- Correo duplicado se bloquea.
- Codigo de cliente se genera en backend.
- PWA Cliente solo consulta datos del cliente autenticado.
- PWA Cliente no envia `customerId` para consultar puntos o compras.

## Configuracion y Catalogos

- Existe una regla activa de puntos.
- Solo una regla de puntos queda activa a la vez.
- Catalogos base existen y tienen valores activos.
- Cambios de catalogos generan auditoria.
- Cambios de reglas de puntos generan auditoria.

## Puntos

- Los puntos se calculan en backend.
- La compra confirmada genera movimiento de puntos.
- Compra bajo monto minimo queda registrada con cero puntos sin movimiento de puntos.
- El historial conserva la trazabilidad.
- No existe edicion directa de puntos finales desde PWA Tienda.

## Saldo Promocional

- Saldo promocional se calcula desde movimientos.
- Admin puede acreditar saldo promocional con permiso backend.
- Cliente ve su saldo promocional propio desde `/client/summary`.
- Acreditacion de saldo promocional queda auditada.
- Conversion de puntos a saldo descuenta puntos disponibles.
- Conversion de puntos a saldo crea saldo promocional.
- Conversion de puntos a saldo queda auditada.
- Uso de saldo en tienda no acepta `storeId` manual.
- Uso de saldo valida tienda activa asignada.
- Uso de saldo descuenta saldo promocional disponible.
- Uso de saldo queda auditado.
- Conversion de puntos a saldo usa parametros operativos de backend.
- Uso de saldo respeta limite operativo por compra cuando esta configurado.

## Parametros Operativos

- Admin puede consultar parametros operativos con permiso backend.
- Admin puede editar conversion de puntos a saldo.
- Admin puede editar dias de vencimiento de canjes.
- Admin puede editar limite de uso de saldo promocional por compra.
- Cambios de parametros operativos quedan auditados.

## Premios

- Premios basicos existen en base de datos.
- Admin puede consultar premios desde backend.
- Admin puede crear premios con permiso validado en backend.
- Admin puede subir imagen de premio sin guardarla en carpetas del codigo.
- Cliente consulta premios activos desde endpoint publico.
- Creacion y edicion de premios quedan auditadas.
- Subida de imagen de premio queda auditada.

## Media

- Metadata de archivos se guarda en base de datos.
- Archivo fisico se guarda en storage configurable fuera del repo.
- Imagenes se sirven por URL de API.
- Foto de perfil del cliente se sube con token de cliente.
- Cliente solo actualiza su propia foto de perfil.
- Imagenes se validan por tipo y tamano.

## Banners Publicitarios

- Admin puede crear banners con permiso validado en backend.
- Admin puede subir imagen de banner sin guardarla en carpetas del codigo.
- Banners activos y vigentes aparecen en endpoint publico.
- Banners inactivos o vencidos no aparecen en endpoint publico.
- PWA Cliente consume banners desde backend.
- Creacion y actualizacion de banners quedan auditadas.

## Notificaciones Internas

- Admin puede crear notificaciones con permiso validado en backend.
- Admin puede enviar notificaciones a todos los clientes.
- Admin puede enviar notificaciones a todos los usuarios internos.
- Admin puede enviar notificaciones a cliente, usuario interno o rol especifico.
- Cliente solo ve notificaciones globales de clientes o directas a su usuario.
- Usuario interno solo ve notificaciones globales internas, directas o de sus roles.
- Cliente puede marcar sus notificaciones como leidas.
- Usuario interno puede marcar sus notificaciones como leidas.
- Creacion y actualizacion de notificaciones quedan auditadas.

## Canjes

- Cliente puede solicitar canje de un premio activo.
- Solicitud de canje valida cliente activo, puntos suficientes y stock disponible.
- Solicitud descuenta/reserva puntos desde backend.
- Solicitud descuenta stock del premio cuando el stock es limitado.
- Cliente puede consultar sus propios canjes.
- Tienda valida canje usando tienda activa de sesion.
- Tienda no envia `storeId` manual para validar canjes.
- Canje ya validado no puede validarse de nuevo.
- Cliente puede cancelar canjes pendientes propios.
- Usuario interno autorizado puede cancelar canjes pendientes.
- Vencimiento por lote libera canjes pendientes vencidos.
- Cancelacion y vencimiento devuelven puntos.
- Cancelacion y vencimiento reponen stock cuando aplica.
- Fecha de vencimiento de nuevos canjes usa parametros operativos de backend.
- Solicitud y validacion de canje quedan auditadas.
- Cancelacion y vencimiento de canje quedan auditados.

## Auditoria

- Login exitoso y fallido queda registrado.
- Compra registrada queda auditada.
- Compra reversada queda auditada.
- Saldo promocional acreditado queda auditado.
- Canje solicitado queda auditado.
- Canje validado queda auditado.
- Canje cancelado queda auditado.
- Canje vencido queda auditado.
- Subida de media queda auditada.
- Intento de factura duplicada queda auditado.
- Cambios de roles, permisos y tiendas quedan auditados.

## Web Administrador

- Admin requiere sesion interna.
- Dashboard global requiere permiso `reports.read`.
- Metricas administrativas no dependen de tienda activa.
- Compras recientes se leen desde backend.
- Admin puede consultar clientes, tiendas, usuarios, catalogos y reglas de puntos.
- Admin puede crear tiendas desde backend.
- Admin puede editar datos y estado de tiendas desde backend.
- Admin puede editar datos y estado de clientes desde backend.
- Admin puede crear usuarios internos desde backend.
- Admin puede crear y activar reglas de puntos desde backend.
- Admin puede reversar compras aprobadas desde backend.
- Admin puede consultar y crear premios basicos desde backend.
- Admin puede subir imagenes de premios desde backend.
- Admin puede listar y filtrar canjes desde backend.
- Admin puede cancelar canjes pendientes desde backend.
- Admin puede ejecutar vencimiento de canjes pendientes desde backend.
- Admin puede crear y activar/desactivar banners publicitarios desde backend.
- Admin puede crear y activar/desactivar notificaciones internas desde backend.
- Admin puede consultar y editar parametros operativos desde backend.
