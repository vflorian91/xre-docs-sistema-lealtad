# FRD — Módulo de Banners

## 1. Objetivo del módulo

El módulo de **Banners** permitirá administrar los banners promocionales que aparecerán dentro de la **PWA / App del Cliente**.

El sistema debe permitir crear, visualizar, editar, activar, inactivar y controlar la vigencia de los banners, asegurando que únicamente se muestren al cliente final los banners que estén **activos**, **vigentes** y dentro de las reglas de publicación definidas.

Este módulo ya cuenta con una base de código y frontend, por lo que el alcance principal es **ajustar, ordenar y mejorar la lógica existente**, no construirlo completamente desde cero.

---

## 2. Ubicación del módulo

El módulo debe estar disponible dentro de la plataforma web administrativa.

Nombre sugerido en menú:

**Gestión de Contenido**

* Banners

O, si ya existe una sección relacionada:

**Configuración**

* Banners

---

## 3. Pantalla principal — Tabla de registro de banners

La pantalla principal debe mostrar el listado de banners registrados en el sistema.

### 3.1 Encabezado de la tabla

En la parte superior de la tabla debe mostrarse el título:

**Registro de Banners**

A la misma altura del título, alineado a la derecha, debe colocarse el botón:

**Nuevo Banner**

Este botón debe abrir la pantalla de creación de banner.

### 3.2 Diseño visual de la pantalla

La pantalla debe ser limpia, compacta y estilizada.

Reglas visuales:

* Los botones no deben ser robustos ni ocupar demasiado espacio.
* Los campos de búsqueda y filtros deben ser compactos.
* El texto general debe ser normal.
* Únicamente los títulos, encabezados o nombres de secciones deben usar negrita.
* La tabla debe tener buen espaciado visual, pero sin verse pesada.
* Las acciones deben mostrarse de forma ordenada, preferiblemente con íconos y tooltip.
* El diseño debe mantener coherencia con el estilo visual actual del sistema de lealtad.

---

## 4. Tabla de banners

La tabla debe contener las siguientes columnas:

| Columna          | Descripción                                          |
| ---------------- | ---------------------------------------------------- |
| Título de banner | Nombre o título interno del banner.                  |
| Vigencia         | Rango de fechas en el que el banner puede mostrarse. |
| Estado           | Estado actual del banner.                            |
| Acciones         | Opciones disponibles para cada registro.             |

### 4.1 Columna: Título de banner

Debe mostrar el título registrado para el banner.

Ejemplo:

“Promoción Bono 14”

### 4.2 Columna: Vigencia

Debe mostrar la fecha de inicio y fecha fin.

Formato sugerido:

`15/06/2026 - 30/06/2026`

También puede mostrarse un indicador visual discreto:

* Vigente
* Programado
* Vencido

Este indicador debe ser calculado por el sistema según las fechas, no ingresado manualmente por el usuario.

### 4.3 Columna: Estado

El estado principal del banner debe poder ser:

* Activo
* Inactivo
* Borrador

Reglas:

* Solo los banners activos y dentro de vigencia pueden mostrarse en la app del cliente.
* Los banners inactivos no deben mostrarse.
* Los banners en borrador no deben mostrarse.
* Un banner activo fuera de vigencia tampoco debe mostrarse.

### 4.4 Columna: Acciones

Cada registro debe tener las siguientes acciones:

| Acción            | Descripción                                                       |
| ----------------- | ----------------------------------------------------------------- |
| Ver               | Permite consultar la información del banner en modo solo lectura. |
| Editar            | Permite modificar la información del banner.                      |
| Activar/Inactivar | Botón de alternancia para cambiar el estado del banner.           |

El botón de alternancia debe funcionar como switch:

* Si el banner está activo, permite inactivarlo.
* Si el banner está inactivo o en borrador, permite activarlo únicamente si cumple las reglas del sistema.

---

## 5. Filtros de la tabla

La pantalla principal debe incluir filtros compactos.

Filtros requeridos:

| Filtro           | Descripción                                |
| ---------------- | ------------------------------------------ |
| Búsqueda general | Buscar por título de banner.               |
| Estado           | Filtrar por activo, inactivo o borrador.   |
| Vigencia         | Filtrar por vigente, programado o vencido. |
| Fecha inicio     | Filtrar banners desde una fecha inicial.   |
| Fecha fin        | Filtrar banners hasta una fecha final.     |

La búsqueda debe funcionar sin necesidad de presionar un botón adicional, o bien con un botón compacto de “Buscar”.

Debe existir también un botón compacto de:

**Limpiar filtros**

---

## 6. Pantalla de crear banner

La pantalla de creación debe permitir registrar un nuevo banner.

### 6.1 Campos requeridos

La pantalla debe contener únicamente los siguientes campos:

| Campo                       | Tipo             | Requerido | Descripción                                                   |
| --------------------------- | ---------------- | --------- | ------------------------------------------------------------- |
| Título                      | Texto            | Sí        | Nombre interno del banner.                                    |
| Fecha de inicio             | Fecha            | Sí        | Fecha desde la cual el banner puede mostrarse.                |
| Fecha fin                   | Fecha            | Sí        | Fecha hasta la cual el banner puede mostrarse.                |
| Número de orden             | Numérico         | Sí        | Posición en la que aparecerá el banner en la app del cliente. |
| Imagen                      | Carga de archivo | Sí        | Imagen del banner.                                            |
| URL de destino de la imagen | URL              | No        | Enlace al que será enviado el cliente al presionar el banner. |

### 6.2 Campo: Título

Validaciones:

* No debe estar vacío.
* Debe tener un máximo recomendado de 100 caracteres.
* Debe ser claro para uso interno del administrador.

### 6.3 Campo: Fecha de inicio

Validaciones:

* Es obligatoria.
* Debe ser una fecha válida.
* Puede ser igual o mayor a la fecha actual.
* Si se permite crear banners programados, puede tener fecha futura.

### 6.4 Campo: Fecha fin

Validaciones:

* Es obligatoria.
* Debe ser una fecha válida.
* No puede ser menor que la fecha de inicio.
* Cuando la fecha fin ya haya pasado, el banner no debe mostrarse en la app del cliente.

### 6.5 Campo: Número de orden

El número de orden define la posición visual del banner dentro de la app del cliente.

Reglas:

* Debe ser obligatorio.
* Debe aceptar únicamente números enteros.
* El rango permitido debe ser de 1 a 7.
* No pueden existir dos banners activos con el mismo número de orden.
* Los banners inactivos sí pueden conservar un número de orden repetido.
* Los banners en borrador también pueden conservar un número de orden repetido.
* La validación fuerte aplica únicamente al momento de activar o publicar un banner.

Ejemplo:

Si ya existe un banner activo con número de orden 3, no se puede activar otro banner con número de orden 3.

### 6.6 Campo: Imagen

Validaciones:

* La imagen es obligatoria.
* No se puede guardar un banner sin imagen.
* El archivo debe ser de tipo imagen.
* Formatos permitidos sugeridos:

  * JPG
  * JPEG
  * PNG
  * WEBP
* El peso máximo permitido debe ser de 10 MB.
* Si el archivo supera 10 MB, el sistema debe mostrar un mensaje de error.
* El sistema debe mostrar una vista previa de la imagen antes de guardar.

Mensaje sugerido:

“No se pudo cargar la imagen. El archivo debe ser una imagen válida y no debe superar los 10 MB.”

### 6.7 Campo: URL de destino de la imagen

Este campo representa el enlace al que será dirigido el cliente cuando presione el banner en la app.

Validaciones:

* Puede ser opcional.
* Si se ingresa, debe tener formato de URL válido.
* Debe aceptar enlaces internos o externos.
* Si el campo queda vacío, el banner se mostrará como imagen informativa sin redirección.
* Si tiene URL, al presionar el banner desde la app del cliente se debe abrir el enlace configurado.

Nombre recomendado del campo en pantalla:

**URL de destino**

No se recomienda llamarlo “URL de imagen”, porque la imagen se carga desde archivo. El campo realmente representa la redirección al hacer clic sobre el banner.

---

## 7. Botones de la pantalla crear banner

La pantalla de creación debe tener los siguientes botones:

| Botón                 | Descripción                                        |
| --------------------- | -------------------------------------------------- |
| Guardar               | Guarda el banner intentando dejarlo activo.        |
| Guardar como borrador | Guarda el banner como borrador.                    |
| Cancelar              | Regresa a la tabla de banners sin guardar cambios. |

### 7.1 Botón Guardar

Al presionar **Guardar**, el sistema debe intentar crear el banner como activo.

Sin embargo, el sistema debe validar:

* Que tenga imagen.
* Que tenga título.
* Que tenga fecha inicio.
* Que tenga fecha fin.
* Que tenga número de orden.
* Que no existan más de 7 banners activos.
* Que no exista otro banner activo con el mismo número de orden.

Reglas especiales:

* Si no existen 7 banners activos y el número de orden está disponible, el banner se guarda como activo.
* Si ya existen 7 banners activos, el banner debe guardarse automáticamente como borrador.
* Si el número de orden ya está ocupado por otro banner activo, el banner debe guardarse como borrador o bloquear la activación, según la lógica definida.
* El sistema debe mostrar un mensaje claro indicando qué ocurrió.

Mensaje sugerido cuando se guarda como activo:

“Banner creado correctamente.”

Mensaje sugerido cuando se guarda como borrador por límite de activos:

“El banner fue guardado como borrador porque ya existen 7 banners activos.”

Mensaje sugerido cuando se guarda como borrador por número de orden ocupado:

“El banner fue guardado como borrador porque ya existe un banner activo con el mismo número de orden.”

### 7.2 Botón Guardar como borrador

Este botón solo debe aparecer en la pantalla de creación.

Reglas:

* Guarda el registro en estado borrador.
* No publica el banner.
* No lo muestra en la app del cliente.
* Aunque sea borrador, debe requerir imagen.
* Puede tener número de orden repetido.
* Puede existir aunque ya haya 7 banners activos.

### 7.3 Botón Cancelar

Debe regresar a la tabla de registro de banners sin guardar cambios.

---

## 8. Pantalla de ver banner

La pantalla de ver banner debe mostrar toda la información registrada del banner en modo solo lectura.

Debe mostrar:

* Título
* Fecha de inicio
* Fecha fin
* Número de orden
* Estado
* Imagen
* URL de destino
* Fecha de creación
* Fecha de última actualización, si existe
* Usuario que creó el banner, si el sistema ya maneja auditoría
* Usuario que modificó el banner, si el sistema ya maneja auditoría

### 8.1 Botón regresar

La pantalla de ver debe tener un botón:

**Regresar**

Este botón debe retornar a la tabla de registro de banners.

---

## 9. Pantalla de editar banner

La pantalla de edición debe mostrar toda la información registrada del banner y permitir editar sus campos.

### 9.1 Campos editables

En edición se deben poder modificar:

* Título
* Fecha de inicio
* Fecha fin
* Número de orden
* Imagen
* URL de destino
* Estado

### 9.2 Botones de edición

La pantalla de edición debe tener los siguientes botones:

| Botón           | Descripción                                        |
| --------------- | -------------------------------------------------- |
| Guardar cambios | Actualiza la información del banner.               |
| Cancelar        | Regresa a la tabla de banners sin aplicar cambios. |

Importante:

El botón **Guardar como borrador** no debe aparecer en la pantalla de edición.

### 9.3 Activar o inactivar desde edición

Desde la pantalla de edición debe poder activarse o inactivarse el banner.

Al activar un banner, el sistema debe validar:

* Que tenga imagen.
* Que no existan ya 7 banners activos.
* Que no exista otro banner activo con el mismo número de orden.
* Que tenga fecha inicio y fecha fin válidas.
* Que la fecha fin no sea menor que la fecha inicio.

Si no cumple las reglas, no debe activarse y debe mostrar un mensaje claro.

Mensaje sugerido:

“No se puede activar el banner porque ya existe otro banner activo con el mismo número de orden.”

O:

“No se puede activar el banner porque ya existen 7 banners activos.”

---

## 10. Lógica de visibilidad en la app del cliente

La app del cliente debe mostrar únicamente banners que cumplan todas las siguientes condiciones:

* Estado activo.
* Fecha actual mayor o igual a la fecha de inicio.
* Fecha actual menor o igual a la fecha fin.
* Tiene imagen cargada.
* Cumple orden válido.
* No está en borrador.
* No está inactivo.

Los banners deben mostrarse ordenados por el campo:

**Número de orden**

Orden ascendente:

1, 2, 3, 4, 5, 6, 7

Si un banner activo está fuera de vigencia, no debe mostrarse aunque su estado sea activo.

---

## 11. Reglas de negocio

### 11.1 Máximo de banners activos

Solo pueden existir hasta 7 banners activos al mismo tiempo.

Si el usuario intenta crear un banner nuevo cuando ya existen 7 activos:

* El sistema debe permitir guardar el registro.
* El registro debe quedar en estado borrador.
* El sistema debe informar al usuario que no se activó por límite de banners activos.

### 11.2 Número de orden único entre activos

No pueden existir dos banners activos con el mismo número de orden.

Aplica en:

* Crear banner.
* Editar banner.
* Activar banner desde tabla.
* Activar banner desde edición.

No aplica en:

* Banners inactivos.
* Banners en borrador.

### 11.3 Imagen obligatoria

No se puede guardar un banner sin imagen.

Aplica para:

* Guardar como activo.
* Guardar como borrador.
* Editar banner.
* Activar banner.

### 11.4 Fechas válidas

La fecha fin no puede ser menor que la fecha de inicio.

Si la fecha fin ya venció, el banner puede existir, pero no debe aparecer en la app del cliente.

### 11.5 Inactivación

Los banners no deben eliminarse físicamente de la base de datos.

En lugar de eliminar, deben inactivarse.

Un banner inactivo:

* No aparece en la app del cliente.
* Permanece en la tabla administrativa.
* Puede volver a activarse si cumple las reglas.

### 11.6 Borrador

Un banner en borrador:

* No aparece en la app del cliente.
* Puede existir aunque ya haya 7 activos.
* Puede tener número de orden repetido.
* Puede ser editado posteriormente.
* Puede activarse después si cumple las reglas.

---

## 12. Estados del banner

El sistema debe manejar los siguientes estados:

| Estado   | Descripción                                                   | Visible en app cliente               |
| -------- | ------------------------------------------------------------- | ------------------------------------ |
| Activo   | Banner publicado y disponible para mostrarse si está vigente. | Sí, solo si está dentro de vigencia. |
| Inactivo | Banner deshabilitado manualmente.                             | No                                   |
| Borrador | Banner guardado sin publicación activa.                       | No                                   |

Adicionalmente, el sistema puede calcular visualmente una condición de vigencia:

| Condición calculada | Descripción                                        |
| ------------------- | -------------------------------------------------- |
| Programado          | La fecha de inicio aún no llega.                   |
| Vigente             | La fecha actual está dentro del rango de vigencia. |
| Vencido             | La fecha fin ya pasó.                              |

Esta condición no reemplaza el estado principal; solo ayuda al usuario a entender si el banner puede mostrarse o no.

---

## 13. Validaciones generales

El sistema debe validar:

* Título obligatorio.
* Fecha inicio obligatoria.
* Fecha fin obligatoria.
* Fecha fin no menor que fecha inicio.
* Número de orden obligatorio.
* Número de orden entre 1 y 7.
* Imagen obligatoria.
* Imagen con formato válido.
* Imagen con peso máximo de 10 MB.
* URL válida si el campo URL de destino tiene información.
* Máximo 7 banners activos.
* Número de orden único entre banners activos.
* No permitir activar banners sin imagen.
* No permitir activar banners con orden duplicado.
* No permitir activar banners si ya hay 7 activos.

---

## 14. Mensajes del sistema

### 14.1 Creación exitosa

“Banner creado correctamente.”

### 14.2 Guardado como borrador

“Banner guardado como borrador.”

### 14.3 Límite de banners activos

“El banner fue guardado como borrador porque ya existen 7 banners activos.”

### 14.4 Orden ocupado

“No se puede activar el banner porque ya existe un banner activo con el mismo número de orden.”

### 14.5 Imagen obligatoria

“Debe cargar una imagen para guardar el banner.”

### 14.6 Imagen inválida

“El archivo debe ser una imagen válida en formato JPG, JPEG, PNG o WEBP.”

### 14.7 Imagen excede peso máximo

“La imagen no debe superar los 10 MB.”

### 14.8 Fechas inválidas

“La fecha fin no puede ser menor que la fecha de inicio.”

### 14.9 URL inválida

“La URL ingresada no tiene un formato válido.”

### 14.10 Inactivación exitosa

“Banner inactivado correctamente.”

### 14.11 Activación exitosa

“Banner activado correctamente.”

---

## 15. Comportamiento del botón de alternancia en tabla

El switch de estado debe comportarse de esta forma:

### Si el banner está activo

Al apagar el switch:

* Cambia a inactivo.
* Deja de aparecer en la app del cliente.
* Muestra mensaje de confirmación.

Mensaje:

“Banner inactivado correctamente.”

### Si el banner está inactivo o en borrador

Al encender el switch:

El sistema valida:

* Imagen cargada.
* Fechas válidas.
* Número de orden disponible.
* Menos de 7 banners activos.

Si cumple:

* Cambia a activo.
* Aparece en la app del cliente únicamente si está dentro de vigencia.

Si no cumple:

* No cambia el estado.
* Muestra mensaje explicando el motivo.

---

## 16. Consideraciones para la app del cliente

Los banners deben consumirse desde la app del cliente mediante la lógica de publicación definida.

La app debe recibir únicamente banners:

* Activos.
* Vigentes.
* Ordenados por número de orden.
* Con imagen disponible.
* Máximo 7.

La app no debe encargarse de filtrar borradores o inactivos si el backend ya puede entregar los banners filtrados. Lo recomendable es que el backend entregue únicamente los banners publicables.

Si la imagen tiene URL de destino:

* Al presionarla, el cliente debe ser dirigido al enlace configurado.

Si la imagen no tiene URL de destino:

* El banner debe mostrarse sin acción de redirección.

---

## 17. Consideraciones técnicas recomendadas

### 17.1 Base de datos

La tabla de banners debe contener como mínimo:

| Campo        | Tipo sugerido                 |
| ------------ | ----------------------------- |
| id           | UUID o ID autoincremental     |
| title        | String                        |
| start_date   | Date                          |
| end_date     | Date                          |
| order_number | Integer                       |
| image_url    | String                        |
| redirect_url | String nullable               |
| status       | Enum: active, inactive, draft |
| created_by   | ID usuario nullable           |
| updated_by   | ID usuario nullable           |
| created_at   | Timestamp                     |
| updated_at   | Timestamp                     |

### 17.2 Índices recomendados

Crear índices para mejorar consultas:

* status
* start_date
* end_date
* order_number

### 17.3 Restricción lógica

No se recomienda crear una restricción única global sobre `order_number`, porque los banners inactivos y borradores sí pueden repetir número de orden.

La validación de orden único debe aplicar únicamente entre banners activos.

Si la base de datos permite índices parciales, se puede crear un índice único parcial sobre:

`order_number WHERE status = 'active'`

Si no, esta validación debe manejarse desde backend antes de guardar o activar.

---

## 18. Reglas de permisos

Solo usuarios administrativos con permiso para gestionar contenido deben poder:

* Ver banners.
* Crear banners.
* Editar banners.
* Activar banners.
* Inactivar banners.

Los usuarios de tienda y clientes no deben tener acceso a esta administración.

---

## 19. Criterios de aceptación

### CA-01 — Tabla de banners

Dado que el usuario ingresa al módulo de banners, debe visualizar una tabla con:

* Título de banner.
* Vigencia.
* Estado.
* Acciones.

### CA-02 — Botón Nuevo Banner

El botón **Nuevo Banner** debe estar alineado a la derecha, a la altura del título de la tabla.

### CA-03 — Crear banner activo

Dado que el usuario completa todos los campos correctamente, carga una imagen válida, no existen 7 banners activos y el número de orden está disponible, el sistema debe guardar el banner como activo.

### CA-04 — Crear banner como borrador por límite

Dado que ya existen 7 banners activos, cuando el usuario guarde un nuevo banner, el sistema debe guardarlo como borrador e informar el motivo.

### CA-05 — Guardar como borrador

Dado que el usuario presiona **Guardar como borrador**, el sistema debe guardar el banner en estado borrador y no mostrarlo en la app del cliente.

### CA-06 — Imagen obligatoria

Dado que el usuario intenta guardar un banner sin imagen, el sistema debe bloquear la acción y mostrar un mensaje de error.

### CA-07 — Peso máximo de imagen

Dado que el usuario carga una imagen mayor a 10 MB, el sistema debe rechazarla.

### CA-08 — Formato de imagen

Dado que el usuario carga un archivo que no es imagen, el sistema debe rechazarlo.

### CA-09 — Número de orden duplicado entre activos

Dado que existe un banner activo con número de orden 2, el sistema no debe permitir activar otro banner con número de orden 2.

### CA-10 — Inactivar banner

Dado que el usuario inactiva un banner, este debe dejar de aparecer en la app del cliente.

### CA-11 — Activar banner

Dado que el usuario activa un banner inactivo o en borrador, el sistema debe validar todas las reglas antes de cambiarlo a activo.

### CA-12 — Ver banner

Dado que el usuario presiona **Ver**, debe visualizar toda la información registrada en modo solo lectura.

### CA-13 — Editar banner

Dado que el usuario presiona **Editar**, debe poder modificar todos los campos del registro.

### CA-14 — Botón regresar en ver

Dado que el usuario está en la pantalla de ver banner, al presionar **Regresar** debe volver a la tabla de banners.

### CA-15 — Botón cancelar en editar

Dado que el usuario está editando un banner, al presionar **Cancelar** debe volver a la tabla sin guardar cambios.

### CA-16 — Visibilidad por vigencia

Dado que un banner está activo pero fuera de vigencia, no debe mostrarse en la app del cliente.

### CA-17 — Orden en app cliente

Dado que existen banners activos y vigentes, la app del cliente debe mostrarlos ordenados de menor a mayor según número de orden.

---

## 20. Alcance funcional actualizado

Incluido:

* Tabla administrativa de banners.
* Filtros de búsqueda.
* Crear banner.
* Guardar como borrador.
* Ver banner.
* Editar banner.
* Activar banner.
* Inactivar banner.
* Validación de imagen obligatoria.
* Validación de formato de imagen.
* Validación de peso máximo de imagen.
* Validación de vigencia.
* Validación de máximo 7 banners activos.
* Validación de número de orden único entre banners activos.
* Lógica para mostrar banners en la app del cliente.
* Métricas de clics por banner.
* Estadísticas de visualización por banner.
* Cálculo de tasa de clics del banner.
* Visualización de métricas desde la tabla administrativa o desde la vista de detalle del banner.

No incluido en esta fase:

* A/B testing de banners.
* Segmentación avanzada por tipo de cliente.
* Segmentación por tienda.
* Segmentación por nivel de cliente.
* Programación personalizada por perfil de usuario.

Estas funciones pueden considerarse para una fase futura.

---

## 23. Métricas y estadísticas de banners

El sistema debe registrar métricas básicas de rendimiento para cada banner publicado en la app del cliente.

Estas métricas permitirán que el administrador pueda conocer cuántas veces fue visto un banner, cuántas veces fue presionado y qué tan efectivo fue.

### 23.1 Métricas requeridas

Cada banner debe manejar las siguientes métricas:

| Métrica              | Descripción                                                        |
| -------------------- | ------------------------------------------------------------------ |
| Visualizaciones      | Cantidad de veces que el banner fue mostrado al cliente en la app. |
| Clics                | Cantidad de veces que el cliente presionó el banner.               |
| CTR                  | Porcentaje de clics en relación con las visualizaciones.           |
| Última visualización | Última fecha y hora en la que el banner fue mostrado.              |
| Último clic          | Última fecha y hora en la que el banner fue presionado.            |

### 23.2 Fórmula de CTR

El sistema debe calcular el CTR de la siguiente forma:

CTR = clics / visualizaciones * 100

Ejemplo:

Si un banner tuvo 1,000 visualizaciones y 50 clics:

CTR = 5%

Si el banner no tiene visualizaciones, el CTR debe mostrarse como 0%.

---

## 24. Visualización de métricas en la tabla de banners

La tabla principal de banners puede mantener las columnas compactas solicitadas inicialmente:

* Título de banner
* Vigencia
* Estado
* Acciones

Sin embargo, se recomienda agregar indicadores compactos de métricas dentro de la tabla o en la vista de detalle.

Opción recomendada para tabla:

| Columna          | Descripción                     |
| ---------------- | ------------------------------- |
| Título de banner | Nombre del banner.              |
| Vigencia         | Fecha inicio y fecha fin.       |
| Estado           | Activo, inactivo o borrador.    |
| Visualizaciones  | Total de veces mostrado.        |
| Clics            | Total de veces presionado.      |
| CTR              | Porcentaje de efectividad.      |
| Acciones         | Ver, editar, activar/inactivar. |

Si se desea mantener la tabla más limpia, las métricas pueden mostrarse únicamente en la pantalla de **Ver banner**.

Recomendación final:

* En tabla: mostrar visualizaciones, clics y CTR de forma compacta.
* En pantalla Ver: mostrar el detalle completo de métricas.

---

## 25. Métricas dentro de la pantalla Ver banner

La pantalla de ver banner debe incluir una sección llamada:

**Rendimiento del banner**

Esta sección debe mostrar:

| Campo                   | Descripción                                    |
| ----------------------- | ---------------------------------------------- |
| Visualizaciones totales | Total de veces que el banner fue mostrado.     |
| Clics totales           | Total de veces que el banner fue presionado.   |
| CTR                     | Porcentaje de clics sobre visualizaciones.     |
| Última visualización    | Fecha y hora de la última vez que se mostró.   |
| Último clic             | Fecha y hora de la última vez que se presionó. |

También se recomienda mostrar cards compactas:

* Visualizaciones
* Clics
* CTR

Estas cards deben ser pequeñas, limpias y no robustas.

---

## 26. Registro de visualizaciones

El sistema debe registrar una visualización cuando el banner sea mostrado efectivamente en la app del cliente.

Reglas:

* Solo deben registrarse visualizaciones de banners activos y vigentes.
* No deben registrarse visualizaciones de banners inactivos.
* No deben registrarse visualizaciones de banners en borrador.
* No deben registrarse visualizaciones de banners vencidos.
* La visualización debe registrarse cuando el banner aparezca en pantalla del cliente.

Para evitar métricas infladas, se recomienda que el sistema no registre múltiples visualizaciones del mismo banner de forma repetida durante una misma carga de pantalla.

Regla sugerida:

* Registrar máximo una visualización por banner por carga de pantalla.
* Si el cliente refresca o vuelve a entrar a la pantalla, puede registrarse una nueva visualización.

---

## 27. Registro de clics

El sistema debe registrar un clic cuando el cliente presione el banner desde la app.

Reglas:

* Solo deben registrarse clics sobre banners activos y vigentes.
* Si el banner no tiene URL de destino, puede registrarse el clic igualmente como interacción, pero no debe redirigir.
* Si el banner tiene URL de destino, primero debe registrarse el clic y luego redirigir al cliente.
* Si ocurre un error al registrar el clic, el sistema no debe bloquear la navegación del usuario.

---

## 28. Datos técnicos recomendados para métricas

Se recomienda manejar una tabla separada para eventos de banner, especialmente si se desea analizar rendimiento a futuro.

Tabla sugerida:

**banner_events**

| Campo       | Tipo sugerido          | Descripción                                                |
| ----------- | ---------------------- | ---------------------------------------------------------- |
| id          | UUID o autoincremental | Identificador del evento.                                  |
| banner_id   | Relación               | Banner relacionado.                                        |
| event_type  | Enum                   | view o click.                                              |
| customer_id | Nullable               | Cliente que vio o presionó el banner, si está autenticado. |
| session_id  | Nullable               | Identificador de sesión, si existe.                        |
| created_at  | Timestamp              | Fecha y hora del evento.                                   |

Tipos de evento:

* view
* click

También puede manejarse una tabla resumen para optimizar rendimiento:

**banner_metrics**

| Campo         | Tipo sugerido      | Descripción               |
| ------------- | ------------------ | ------------------------- |
| banner_id     | Relación           | Banner relacionado.       |
| total_views   | Integer            | Total de visualizaciones. |
| total_clicks  | Integer            | Total de clics.           |
| last_view_at  | Timestamp nullable | Última visualización.     |
| last_click_at | Timestamp nullable | Último clic.              |

Recomendación:

Usar `banner_events` para trazabilidad y `banner_metrics` para consulta rápida.

---

## 29. Criterios de aceptación adicionales para métricas

### CA-18 — Registro de visualización

Dado que un banner activo y vigente aparece en la app del cliente, el sistema debe registrar una visualización.

### CA-19 — No registrar visualización de banner no publicable

Dado que un banner está inactivo, en borrador o vencido, el sistema no debe registrar visualizaciones.

### CA-20 — Registro de clic

Dado que el cliente presiona un banner activo y vigente, el sistema debe registrar un clic.

### CA-21 — Redirección por clic

Dado que el banner tiene una URL de destino, cuando el cliente lo presione, el sistema debe registrar el clic y dirigirlo al enlace configurado.

### CA-22 — Banner sin URL

Dado que el banner no tiene URL de destino, cuando el cliente lo presione, el sistema puede registrar el clic, pero no debe realizar redirección.

### CA-23 — Cálculo de CTR

Dado que un banner tiene visualizaciones y clics registrados, el sistema debe calcular correctamente el CTR.

### CA-24 — Métricas visibles en administración

Dado que el administrador consulta la tabla o el detalle del banner, debe poder visualizar visualizaciones, clics y CTR.

### CA-25 — Métricas no editables

Dado que el administrador edita un banner, no debe poder modificar manualmente las métricas de visualización, clics o CTR.

### CA-26 — Métricas históricas

Dado que un banner es inactivado, sus métricas históricas deben conservarse.

### CA-27 — Reactivación de banner con métricas previas

Dado que un banner inactivo es reactivado, debe conservar sus métricas anteriores y continuar acumulando nuevas visualizaciones y clics.

---

## 30. Ajuste a pantalla de edición

En la pantalla de edición del banner, las métricas no deben ser editables.

La edición debe permitir modificar:

* Título
* Fecha de inicio
* Fecha fin
* Número de orden
* Imagen
* URL de destino
* Estado

Pero no debe permitir modificar:

* Visualizaciones
* Clics
* CTR
* Última visualización
* Último clic

Las métricas deben ser únicamente informativas.

---

## 31. Ajuste a pantalla de ver banner

La pantalla de ver banner debe mostrar toda la información registrada y además una sección de métricas.

Secciones recomendadas:

1. Información general
2. Imagen del banner
3. Configuración de publicación
4. Rendimiento del banner

La sección **Rendimiento del banner** debe mostrar:

* Visualizaciones
* Clics
* CTR
* Última visualización
* Último clic

---

## 32. Resultado esperado actualizado

Al finalizar la implementación, el administrador podrá crear, editar, activar, inactivar y consultar banners, además de revisar su rendimiento.

La app del cliente mostrará únicamente banners activos y vigentes, registrando visualizaciones y clics para que el administrador pueda medir la efectividad de cada banner.
