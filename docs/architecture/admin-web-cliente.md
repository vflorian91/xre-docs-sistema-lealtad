# FRD — Módulo de Clientes

## Sistema de Lealtad — Plataforma Web Administrador

## 1. Objetivo

Mejorar el módulo de **Clientes** dentro de la plataforma web de administrador, permitiendo al usuario del sistema consultar, filtrar, exportar, crear, editar y visualizar clientes registrados en el sistema de lealtad.

El módulo debe centralizar todos los clientes registrados desde cualquiera de los canales disponibles:

* PWA Cliente.
* PWA Tienda.
* Plataforma Web Administrador.

El objetivo es que el administrador tenga una vista global y ordenada de la base de clientes, sin afectar la integridad de puntos, historial, origen ni datos sensibles del cliente.

---

## 2. Ubicación del módulo

El módulo de **Clientes** debe encontrarse dentro del menú lateral de la plataforma web de administrador.

Ubicación requerida:

**Menú lateral → Gestión Empresarial → Clientes**

El módulo debe conservar una estructura visual consistente con el resto del sistema.

---

## 3. Vista principal — Tabla de clientes

La vista principal del módulo debe mostrar una tabla con todos los clientes globales registrados en el sistema.

### 3.1 Columnas de la tabla

La tabla debe mostrar únicamente las siguientes columnas:

| Campo              | Descripción                                           |
| ------------------ | ----------------------------------------------------- |
| Código del cliente | Código único generado automáticamente por el sistema. |
| Nombre del cliente | Nombre completo del cliente.                          |
| Teléfono           | Número de teléfono registrado.                        |
| Correo             | Correo electrónico registrado.                        |
| Puntos             | Total actual de puntos acumulados.                    |
| Nivel              | Nivel actual del cliente.                             |
| Estado             | Activo o inactivo.                                    |
| Origen             | Canal o tienda desde donde fue creado el cliente.     |
| Acciones           | Opciones disponibles para el registro.                |

### 3.2 Acciones permitidas

En la tabla únicamente deben existir las siguientes acciones:

* Ver.
* Editar.

No debe existir acción de eliminar cliente.

---

## 4. Filtros de tabla

La tabla debe contar con filtros para facilitar la búsqueda de clientes.

### 4.1 Filtro por origen

Debe existir un filtro desplegable por **origen**.

El origen puede corresponder a:

* Administración.
* PWA Cliente.
* PWA Tienda.
* Tienda específica, cuando el cliente haya sido creado desde una tienda.

El filtro debe permitir consultar clientes según el canal o tienda de origen.

### 4.2 Buscador general

Debe existir un solo campo de búsqueda que permita buscar por cualquiera de los siguientes datos:

* Nombre del cliente.
* Correo electrónico.
* Teléfono.

El usuario no debe tener que seleccionar el tipo de búsqueda. El sistema debe interpretar el valor ingresado y buscar coincidencias en los tres campos.

---

## 5. Exportación de clientes

Debe existir un botón llamado **Exportar**.

Este botón debe permitir exportar la información de la tabla en formato **XLSX**.

### 5.1 Reglas de exportación

* La exportación debe respetar los filtros aplicados en pantalla.
* Si no existen filtros aplicados, debe exportar el listado global de clientes permitido para el usuario.
* La exportación debe realizarse desde backend para evitar cargar todos los registros en la tabla.
* La consulta visual de la tabla no debe verse afectada por la exportación.

---

## 6. Cards superiores de resumen

Arriba de la tabla deben mostrarse cards con totales generales.

### 6.1 Cards requeridas

Las cards deben mostrar:

* Total clientes.
* Clientes Oro.
* Clientes Plata.
* Clientes Bronce.
* Clientes Básico.

### 6.2 Comportamiento como filtro

Cada card debe funcionar como filtro al presionarla.

Reglas:

* Al presionar una card de nivel, la tabla debe mostrar únicamente clientes activos de ese nivel.
* Los clientes inactivos no deben aparecer cuando el filtro venga desde una card.
* La card de **Total clientes** debe mostrar clientes activos, salvo que el usuario aplique manualmente un filtro de estado.
* El filtro aplicado debe ser visible para el usuario y debe poder limpiarse.

---

## 7. Paginación de tabla

La tabla debe tener paginación.

### 7.1 Reglas de paginación

* Mostrar 10 registros por página.
* El usuario debe poder navegar presionando:

  * Número de página.
  * Botón siguiente.
  * Botón atrás.
* La tabla debe consultar únicamente 10 registros por petición.
* No debe cargarse la base completa de clientes en frontend.
* Los filtros, búsqueda y paginación deben ejecutarse del lado del servidor.

### 7.2 Objetivo técnico

Evitar consultas demasiado grandes cuando exista un volumen alto de clientes registrados.

---

## 8. Crear nuevo cliente desde administrador

En la parte superior de la vista ya existe el botón **Nuevo cliente**.

Este botón debe permitir registrar un cliente desde la plataforma web de administrador.

### 8.1 Campos del formulario

El formulario debe solicitar los campos de cliente que ya existen actualmente en el sistema.

Se debe respetar la estructura actual, pero aplicando los ajustes definidos en este FRD.

### 8.2 Foto del cliente

El usuario administrador no debe poder subir foto del cliente.

Regla:

* La foto del cliente solo puede ser cargada o modificada por el propio cliente desde su plataforma o perfil correspondiente.
* El formulario de administrador no debe mostrar carga de imagen para cliente.

### 8.3 Canal de origen

El campo **Canal de origen** debe funcionar como un catálogo desplegable.

Opciones requeridas:

* Administración.
* Tiendas activas registradas en el sistema.

Reglas:

* El usuario solo puede seleccionar una opción.
* Si una tienda está inactiva, no debe mostrarse en el catálogo.
* Si un cliente ya fue creado con una tienda que luego se inactiva, el valor histórico debe conservarse en el registro, pero no debe estar disponible para nuevas selecciones.

### 8.4 Contraseña temporal

El campo de contraseña temporal ya existe y debe mantenerse.

Ajuste requerido:

* El campo debe mostrarse vacío.
* No debe contener ningún valor precargado.
* Solo debe mostrar una máscara o placeholder con el texto: **Contraseña**.
* La contraseña temporal debe guardarse de forma segura.
* El cliente creado desde administrador debe estar obligado a cambiar su contraseña en el primer inicio de sesión.

### 8.5 Estado inicial del cliente

Todo cliente creado desde administrador debe nacer con estado **Activo**.

---

## 9. Catálogos geográficos administrables

Los campos de ubicación del cliente deben convertirse en catálogos administrables.

Campos involucrados:

* País.
* Departamento.
* Municipio / Ciudad.
* Zona.

### 9.1 Ubicación del módulo de catálogos

Debe existir una opción desplegable en el menú lateral llamada **Catálogos**.

Ubicación sugerida:

**Menú lateral → Configuración → Catálogos**

Dentro de esta opción deben listarse los diferentes catálogos disponibles, por ejemplo:

* País.
* Departamento.
* Municipio.
* Zona.

### 9.2 Relación entre catálogos

Los catálogos deben estar relacionados por código para permitir selección dependiente.

Reglas:

* Al seleccionar un país, el campo departamento debe mostrar únicamente departamentos asociados a ese país.
* Al seleccionar un departamento, el campo municipio debe mostrar únicamente municipios asociados a ese departamento.
* Al seleccionar un municipio, el campo zona debe mostrar únicamente zonas asociadas a ese municipio.
* Si un registro de catálogo está inactivo, no debe mostrarse para nuevas selecciones.
* Los valores históricos de clientes existentes deben conservarse aunque el catálogo sea inactivado posteriormente.

### 9.3 Administración de catálogos

Cada catálogo debe permitir como mínimo:

* Crear registros.
* Editar registros.
* Activar o inactivar registros.
* Asignar código.
* Asignar relación con catálogo padre cuando aplique.

Ejemplo:

* País: Guatemala.
* Departamento: Guatemala, asociado al país Guatemala.
* Municipio: Guatemala, asociado al departamento Guatemala.
* Zona: Zona 10, asociada al municipio Guatemala.

---

## 10. Editar cliente

Desde la tabla de clientes debe existir la acción **Editar**.

### 10.1 Campos editables

El usuario administrador debe poder editar todos los campos del cliente, excepto:

* Código del cliente.
* Puntos acumulados.

### 10.2 Código de cliente

El código del cliente debe ser automático.

Reglas:

* No debe poder editarse manualmente.
* Debe generarse con una lógica similar a la utilizada en el módulo de tiendas.
* Debe ser único.
* Debe mantenerse sin cambios durante toda la vida del cliente.

### 10.3 Puntos del cliente

Los puntos pueden mostrarse en la pantalla de edición, pero no pueden modificarse desde ese formulario.

Regla:

* Cualquier ajuste de puntos debe realizarse únicamente desde el perfil del cliente mediante las acciones específicas de sumar o quitar puntos.

### 10.4 Inactivar cliente

En edición debe existir la opción de inactivar cliente.

Reglas:

* El cliente nace activo al ser creado.
* El administrador puede inactivar al cliente.
* Un cliente inactivo no debe poder ingresar a la plataforma de cliente.
* La inactivación no debe eliminar su historial, puntos ni transacciones.
* El sistema debe permitir reactivar al cliente si el negocio así lo requiere.

### 10.5 Botones de acción

Los botones deben ubicarse al final de la pantalla.

Botones requeridos:

* Guardar cambios.
* Cancelar.

Comportamiento:

* Al guardar correctamente, el sistema debe regresar a la tabla de clientes.
* Al cancelar, el sistema debe regresar a la tabla de clientes sin guardar cambios.
* Debe existir también un botón de regresar en la pantalla.
* El botón de regresar debe llevar a la tabla de registro de clientes.

---

## 11. Cambio obligatorio de contraseña

Cuando un cliente sea creado desde:

* PWA Tienda.
* Plataforma Web Administrador.

El sistema debe marcar al cliente como pendiente de cambio de contraseña.

Regla:

* En el primer inicio de sesión, el cliente debe ser obligado a crear una nueva contraseña.
* No debe poder continuar usando la plataforma sin completar este cambio.
* Una vez realizado el cambio, el sistema debe actualizar el estado interno para no volver a solicitarlo.

---

## 12. Perfil del cliente

El perfil del cliente ya existe y debe mantenerse, aplicando mejoras.

Desde esta pantalla el usuario administrador debe poder visualizar toda la información actual del cliente.

### 12.1 Información visible

El perfil debe mostrar la información existente del cliente, incluyendo como mínimo:

* Código del cliente.
* Nombre.
* Teléfono.
* Correo.
* Estado.
* Origen.
* Nivel.
* Puntos actuales.
* Información de ubicación.
* Historial relacionado al cliente.

### 12.2 Botones disponibles en perfil

Deben existir únicamente los botones necesarios para gestión del cliente.

Botones permitidos:

* Editar.
* Sumar puntos.
* Quitar puntos.
* Regresar.

No deben existir:

* Botón de enviar beneficios.
* Botón de tres puntos.
* Acciones adicionales ocultas o no definidas.

### 12.3 Sumar puntos

Debe existir un botón para sumar puntos al cliente seleccionado.

Reglas:

* La suma debe aplicarse únicamente al cliente visualizado.
* El sistema debe solicitar motivo del ajuste.
* El ajuste debe quedar registrado en el historial del cliente.
* El ajuste debe identificar al usuario administrador que realizó la acción.
* El total de puntos debe actualizarse correctamente después de confirmar.

### 12.4 Quitar puntos

Debe existir un botón para quitar puntos al cliente seleccionado.

Este botón será utilizado cuando por error se hayan añadido puntos sin autorización o de forma incorrecta.

Reglas:

* La resta debe aplicarse únicamente al cliente visualizado.
* El sistema debe solicitar motivo del ajuste.
* No debe permitir dejar puntos en negativo.
* El ajuste debe quedar registrado en el historial del cliente.
* El ajuste debe identificar al usuario administrador que realizó la acción.
* El total de puntos debe actualizarse correctamente después de confirmar.

---

## 13. Historial del cliente

En el perfil del cliente ya existe una sección de historial.

Esta sección debe mostrar únicamente movimientos relacionados al cliente visualizado.

### 13.1 Movimientos permitidos en historial

El historial debe mostrar:

* Sumas de puntos.
* Restas de puntos.
* Canjes realizados.

No debe mostrar movimientos de otros clientes.

### 13.2 Información mínima del historial

Cada movimiento debe mostrar:

* Fecha.
* Tipo de movimiento.
* Cantidad de puntos.
* Descripción o motivo.
* Usuario o canal que generó el movimiento.
* Referencia de canje, cuando aplique.

---

## 14. Sección de canjes por categoría

La sección de **canjes por categoría** existente en el perfil del cliente debe corregirse visualmente.

Problema actual:

* Existen textos encima de la gráfica.
* La información se ve desordenada.
* La lectura visual no es clara.

Ajuste requerido:

* Separar correctamente textos y gráfica.
* Evitar superposición de etiquetas.
* Mantener márgenes adecuados.
* Asegurar que la gráfica sea legible en desktop y resoluciones medianas.
* Si no existen datos, mostrar un estado vacío claro en lugar de una gráfica rota o vacía.

---

## 15. Reglas de seguridad y auditoría

El módulo debe proteger la integridad de la información del cliente.

### 15.1 Puntos

Los puntos no deben modificarse directamente desde formularios generales.

Solo pueden alterarse por:

* Registro de compra.
* Canje.
* Ajuste manual autorizado desde perfil del cliente.

### 15.2 Auditoría

Toda acción sensible debe quedar auditada.

Acciones auditables:

* Creación de cliente.
* Edición de cliente.
* Inactivación o reactivación.
* Suma manual de puntos.
* Resta manual de puntos.
* Cambio de origen, si aplica.
* Cambio de estado.

Cada auditoría debe registrar:

* Usuario que ejecutó la acción.
* Fecha y hora.
* Cliente afectado.
* Acción realizada.
* Valor anterior y valor nuevo cuando aplique.

---

## 16. Reglas de validación

### 16.1 Datos obligatorios

El formulario debe validar los campos requeridos antes de permitir guardar.

Campos mínimos recomendados:

* Nombre.
* Teléfono.
* Correo.
* Canal de origen.
* País.
* Departamento.
* Municipio.
* Contraseña temporal, cuando el cliente sea creado desde administrador.

### 16.2 Correo

* Debe tener formato válido.
* No debe duplicarse si el correo se utiliza como credencial de acceso.

### 16.3 Teléfono

* Debe aceptar formato válido para Guatemala.
* No debe duplicarse si el negocio decide utilizar teléfono como dato único de identificación.

### 16.4 Contraseña temporal

* No debe mostrarse en texto plano.
* Debe cumplir reglas mínimas de seguridad definidas por el sistema.
* Debe obligar cambio en primer inicio de sesión.

---

## 17. Estados vacíos y mensajes

El módulo debe mostrar mensajes claros en los siguientes casos:

### 17.1 Tabla sin resultados

Cuando no existan registros según los filtros aplicados:

“Sin clientes para mostrar con los filtros seleccionados.”

### 17.2 Error de carga

Cuando falle la consulta:

“No fue posible cargar los clientes. Intente nuevamente.”

### 17.3 Exportación exitosa

Cuando se genere el archivo:

“Archivo XLSX generado correctamente.”

### 17.4 Guardado exitoso

Cuando se cree o edite un cliente:

“Cliente guardado correctamente.”

### 17.5 Ajuste de puntos exitoso

Cuando se sumen o resten puntos:

“Ajuste de puntos realizado correctamente.”

---

## 18. Criterios de aceptación

### CA-01 — Ubicación del módulo

Dado que el usuario ingresa a la plataforma web de administrador, cuando abra el menú lateral, entonces debe visualizar el módulo **Clientes** bajo el título **Gestión Empresarial**.

### CA-02 — Tabla de clientes

Dado que el usuario ingresa al módulo de clientes, entonces debe visualizar la tabla con las columnas definidas: código, nombre, teléfono, correo, puntos, nivel, estado, origen y acciones.

### CA-03 — Acciones limitadas

Dado que el usuario visualiza un cliente en la tabla, entonces solo debe poder ejecutar las acciones **Ver** y **Editar**.

### CA-04 — Buscador único

Dado que el usuario escribe en el campo de búsqueda, cuando ingrese nombre, correo o teléfono, entonces el sistema debe buscar coincidencias en esos tres campos desde un solo input.

### CA-05 — Filtro por origen

Dado que el usuario selecciona un origen, entonces la tabla debe mostrar únicamente clientes registrados bajo ese origen.

### CA-06 — Cards como filtros

Dado que el usuario presiona una card de nivel, entonces la tabla debe mostrar únicamente clientes activos correspondientes a ese nivel.

### CA-07 — Paginación eficiente

Dado que el usuario consulta la tabla, entonces el sistema debe cargar únicamente 10 registros por página desde backend.

### CA-08 — Exportar XLSX

Dado que el usuario presiona exportar, entonces el sistema debe generar un archivo XLSX respetando los filtros aplicados.

### CA-09 — Crear cliente sin foto

Dado que el usuario crea un cliente desde administrador, entonces el formulario no debe permitir subir foto del cliente.

### CA-10 — Canal de origen activo

Dado que el usuario crea un cliente, entonces el campo canal de origen debe mostrar Administración y tiendas activas disponibles.

### CA-11 — Tiendas inactivas ocultas

Dado que una tienda está inactiva, entonces no debe aparecer como opción disponible para nuevos clientes.

### CA-12 — Contraseña temporal vacía

Dado que el usuario abre el formulario de creación, entonces el campo contraseña debe estar vacío y mostrar únicamente el placeholder **Contraseña**.

### CA-13 — Cambio obligatorio de contraseña

Dado que un cliente fue creado desde tienda o administrador, cuando inicie sesión por primera vez, entonces debe ser obligado a cambiar su contraseña.

### CA-14 — Editar cliente

Dado que el usuario edita un cliente, entonces puede modificar todos los campos permitidos excepto código de cliente y puntos.

### CA-15 — Inactivar cliente

Dado que el usuario inactiva un cliente, entonces el cliente no debe poder ingresar a la plataforma de cliente.

### CA-16 — Guardar y regresar

Dado que el usuario guarda cambios correctamente, entonces el sistema debe regresar automáticamente a la tabla de clientes.

### CA-17 — Cancelar y regresar

Dado que el usuario presiona cancelar, entonces el sistema debe regresar a la tabla de clientes sin guardar cambios.

### CA-18 — Perfil del cliente

Dado que el usuario abre el perfil del cliente, entonces debe visualizar toda la información existente del cliente y sus movimientos relacionados.

### CA-19 — Ajuste de puntos

Dado que el usuario suma o quita puntos desde el perfil, entonces el sistema debe actualizar el saldo de puntos y registrar el movimiento en historial.

### CA-20 — Historial correcto

Dado que el usuario visualiza el historial del cliente, entonces solo debe ver sumas de puntos, restas de puntos y canjes realizados por ese cliente.

### CA-21 — Sin botones no permitidos

Dado que el usuario está en el perfil del cliente, entonces no debe visualizar botón de enviar beneficios ni botón de tres puntos.

### CA-22 — Gráfica de canjes por categoría

Dado que el usuario visualiza la sección de canjes por categoría, entonces la gráfica debe mostrarse sin textos encima y con distribución visual correcta.

---

## 19. Fuera de alcance

Para este FRD no se contempla:

* Eliminación definitiva de clientes.
* Carga de foto del cliente desde administrador.
* Edición manual directa de puntos desde formulario de cliente.
* Envío de beneficios desde perfil.
* Gestión avanzada de campañas promocionales.
* Integración con WhatsApp.
* Migración de clientes externos desde archivos masivos, salvo que se defina en otro FRD.

---

## 20. Consideraciones técnicas

* La tabla debe trabajar con paginación del lado del servidor.
* La consulta principal debe limitarse a 10 registros por página.
* Los filtros deben enviarse al backend como parámetros.
* La exportación debe ejecutarse como proceso independiente a la consulta visual.
* Los campos de puntos deben ser de solo lectura en formularios generales.
* Los ajustes de puntos deben generar registros transaccionales.
* Los catálogos deben soportar estado activo/inactivo.
* Los catálogos geográficos deben tener relación jerárquica por código.
* El sistema debe mantener datos históricos aunque un catálogo o tienda sea inactivado.
* Toda acción sensible debe quedar registrada en auditoría.

---

## 21. Resultado esperado

Al finalizar esta mejora, el módulo de clientes permitirá al administrador gestionar correctamente la base global de clientes del sistema de lealtad, con filtros eficientes, paginación optimizada, exportación XLSX, creación y edición controlada, gestión de estado, ajuste auditado de puntos y visualización clara del perfil e historial del cliente.
