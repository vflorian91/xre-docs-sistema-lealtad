# FRD — Módulo de Tiendas

## Plataforma Web de Administrador — Sistema de Lealtad

---

## 1. Objetivo del módulo

El módulo de tiendas permitirá al administrador crear, consultar, editar, inactivar y administrar las tiendas disponibles dentro del sistema de lealtad.

Estas tiendas funcionarán como un catálogo operativo para otros procesos del sistema, principalmente para:

* Asignar una tienda a cada usuario de tienda.
* Registrar automáticamente la tienda relacionada al momento en que un usuario de tienda cree un cliente.
* Asociar compras, clientes y usuarios a una tienda específica.
* Consultar información operativa de cada tienda desde una vista tipo perfil.
* Generar métricas administrativas sobre tiendas activas, inactivas, capital y departamentos.

El módulo deberá estar disponible desde el menú lateral de la plataforma web de administrador.

---

## 2. Ubicación dentro del sistema

El módulo deberá mostrarse en el menú lateral principal de la plataforma web de administrador con el nombre:

**Tiendas**

Al ingresar, el administrador será dirigido a la pantalla principal del módulo, donde podrá visualizar el resumen general y la tabla de tiendas registradas.

---

## 3. Alcance funcional

El módulo de tiendas deberá permitir:

1. Ver resumen general de tiendas mediante cards.
2. Consultar tabla paginada de tiendas.
3. Buscar tiendas.
4. Filtrar tiendas.
5. Ordenar registros de la tabla.
6. Crear una nueva tienda.
7. Generar automáticamente un código único de tienda.
8. Editar una tienda existente.
9. Inactivar una tienda.
10. Ver el perfil de una tienda.
11. Consultar usuarios actualmente asignados a una tienda.
12. Exportar los registros de tiendas en formato XLSX.
13. Utilizar las tiendas como catálogo desplegable al crear o editar usuarios.
14. Registrar automáticamente la tienda asignada cuando un usuario de tienda cree clientes.
15. Registrar automáticamente la tienda asignada cuando un usuario de tienda registre compras.
16. Conservar historial operativo sin eliminar tiendas físicamente.
17. Registrar auditoría básica de creación, actualización e inactivación.

---

## 4. Reglas generales del módulo

### 4.1 Creación de tiendas

El administrador podrá crear tiendas desde el botón:

**Nueva tienda**

Este botón deberá ubicarse en la parte superior derecha de la pantalla principal del módulo, alineado con el diseño actual de las demás pantallas administrativas.

Al presionar el botón, el usuario será dirigido al formulario de creación de tienda.

---

### 4.2 Código automático de tienda

Al crear una tienda, el sistema deberá generar automáticamente un código único.

Formato requerido:

**4 letras + 6 números**

Ejemplo:

**ABCD123456**

Reglas del código:

* Debe generarse automáticamente.
* No debe ser editable por el usuario.
* Debe ser único en todo el sistema.
* No debe repetirse con tiendas activas ni inactivas.
* Debe generarse al iniciar el formulario o al momento de guardar.
* En caso de colisión, el sistema deberá generar otro código hasta obtener uno disponible.
* El código será visible para el administrador y podrá utilizarse en reportes o búsquedas.
* El código no deberá utilizarse como llave primaria de base de datos.

---

### 4.3 ID interno vs código visible

El sistema deberá manejar dos identificadores diferentes:

1. **ID interno**

   * Será utilizado por la base de datos.
   * No será visible para el usuario final.
   * Será la llave principal técnica del registro.

2. **Código de tienda**

   * Será visible para el administrador.
   * Será utilizado en consultas, reportes y exportaciones.
   * No será editable.
   * No será la llave primaria principal de la base de datos.

Esto evita problemas técnicos si en el futuro se requiere ajustar la lógica de códigos visibles sin afectar relaciones internas.

---

## 5. Datos requeridos de tienda

Cada tienda deberá registrar como mínimo:

* Código de tienda.
* Nombre de tienda.
* Dirección.
* Ubicación.
* Estado.
* Fecha de creación.
* Fecha de última actualización.

Para la ubicación, el sistema deberá manejar una clasificación simple:

* Capital.
* Departamento.

Este campo es necesario porque la dirección escrita manualmente no garantiza que el sistema pueda calcular correctamente si una tienda pertenece a capital o departamento.

---

## 6. Estados de tienda

Cada tienda deberá tener un estado:

* Activa.
* Inactiva.

---

### 6.1 Tienda activa

Una tienda activa puede:

* Ser asignada a usuarios.
* Recibir registros de clientes.
* Recibir registros de compras.
* Aparecer en catálogos desplegables.
* Aparecer como opción disponible en formularios operativos.

---

### 6.2 Tienda inactiva

Una tienda inactiva:

* No debe aparecer como opción para asignar a nuevos usuarios.
* No debe permitir nuevos registros operativos si el usuario asignado intenta usarla.
* Debe conservar su historial de clientes y compras.
* Debe seguir apareciendo en reportes y consultas históricas.
* Debe seguir apareciendo en la tabla administrativa de tiendas.
* Debe poder consultarse desde el perfil de tienda.

---

### 6.3 Regla de no eliminación física

El sistema no deberá permitir eliminar tiendas físicamente.

En lugar de eliminar una tienda, el administrador deberá poder inactivarla.

Motivo:

* Una tienda puede tener usuarios asociados.
* Una tienda puede tener clientes registrados.
* Una tienda puede tener compras históricas.
* Una tienda puede formar parte de reportes.
* La eliminación física podría afectar la integridad de la información.

Por lo tanto:

* No existirá acción de eliminar tienda.
* La acción permitida será cambiar estado a inactiva.
* El historial deberá conservarse.

---

## 7. Pantalla principal del módulo de tiendas

La pantalla principal deberá contener:

1. Encabezado del módulo.
2. Botón **Nueva tienda**.
3. Cards de resumen.
4. Buscador.
5. Filtros.
6. Botón **Exportar XLSX**.
7. Tabla de tiendas.
8. Controles de paginación.

---

## 8. Cards de resumen

En la vista principal de la tabla de tiendas deberán mostrarse únicamente las siguientes cards:

1. **Tiendas registradas total**

   * Cantidad total de tiendas creadas en el sistema.

2. **Tiendas activas**

   * Cantidad total de tiendas con estado activo.

3. **Tiendas inactivas**

   * Cantidad total de tiendas con estado inactivo.

4. **Tiendas en departamentos**

   * Cantidad total de tiendas clasificadas como departamento.

5. **Tiendas en capital**

   * Cantidad total de tiendas clasificadas como capital.

No deberán agregarse otras cards en esta vista.

---

## 9. Buscador de tiendas

La pantalla principal deberá incluir un buscador para localizar tiendas.

El buscador deberá permitir buscar por:

* Código de tienda.
* Nombre de tienda.
* Dirección.

Reglas:

* La búsqueda deberá aplicarse sobre el listado de tiendas.
* La búsqueda deberá funcionar junto con la paginación.
* La búsqueda deberá consultar los datos desde backend o base de datos, no filtrar únicamente los 10 registros visibles en frontend.
* Al aplicar una búsqueda, la tabla deberá regresar a la página 1.
* Si no hay resultados, deberá mostrarse un estado vacío informativo.

---

## 10. Filtros de tiendas

La pantalla principal deberá incluir filtros para facilitar la consulta.

Filtros requeridos:

1. **Estado**

   * Todas.
   * Activas.
   * Inactivas.

2. **Ubicación**

   * Todas.
   * Capital.
   * Departamento.

Reglas:

* Los filtros deberán poder combinarse con el buscador.
* Los filtros deberán respetar la paginación.
* Al aplicar un filtro, la tabla deberá regresar a la página 1.
* Los filtros aplicados deberán afectar la exportación XLSX.

---

## 11. Ordenamiento de tabla

La tabla deberá permitir ordenamiento por columnas principales.

Columnas ordenables sugeridas:

* Código de tienda.
* Nombre de tienda.
* Estado.
* Ubicación.
* Fecha de creación.

Ordenamiento por defecto:

* Fecha de creación descendente.

Esto significa que las tiendas creadas más recientemente deberán aparecer primero.

---

## 12. Tabla de tiendas

La tabla principal deberá mostrar el listado de tiendas registradas.

### 12.1 Columnas requeridas

La tabla deberá mostrar como mínimo:

* Código de tienda.
* Nombre de tienda.
* Dirección.
* Ubicación.
* Estado.
* Fecha de creación.
* Acciones.

---

### 12.2 Acciones disponibles

Las acciones disponibles serán:

* Ver perfil.
* Editar.

No deberá existir acción de eliminar.

---

### 12.3 Estado visual

El estado de la tienda deberá mostrarse con un indicador visual tipo badge.

Estados sugeridos:

* **Activa**

  * Badge verde o visual positivo.

* **Inactiva**

  * Badge gris o rojo suave.

El objetivo es que el administrador pueda identificar rápidamente el estado de cada tienda.

---

## 13. Paginación de tabla

La tabla de tiendas deberá ser paginada.

Reglas de paginación:

* Mostrar únicamente 10 registros por página.
* El sistema deberá consultar únicamente los 10 registros correspondientes a la página solicitada.
* No debe cargar todos los registros en frontend para luego paginarlos visualmente.
* La paginación debe ser del lado del servidor o desde la consulta a base de datos.
* El usuario podrá navegar usando:

  * Botón siguiente.
  * Botón anterior.
  * Número de página.

Ejemplo:

Página 1: registros 1 al 10.
Página 2: registros 11 al 20.
Página 3: registros 21 al 30.

---

## 14. Exportación XLSX

Desde la pantalla principal del módulo, el usuario podrá exportar los registros de la tabla mediante el botón:

**Exportar XLSX**

Reglas:

* El archivo debe descargarse en formato `.xlsx`.
* Debe incluir encabezados claros.
* Si no hay filtros aplicados, deberá exportar todas las tiendas.
* Si hay filtros o búsqueda aplicada, deberá exportar únicamente el resultado filtrado.
* No debe exportar únicamente los 10 registros visibles en pantalla, salvo que en el futuro se agregue una opción específica para ello.
* La exportación deberá respetar búsqueda, filtros y ordenamiento aplicado.

Columnas mínimas del archivo:

* Código de tienda.
* Nombre de tienda.
* Dirección.
* Ubicación.
* Estado.
* Fecha de creación.
* Fecha de última actualización.

Columnas recomendadas adicionales:

* Creado por.
* Actualizado por.
* Fecha de inactivación.
* Inactivado por.

---

## 15. Formulario de creación de tienda

### 15.1 Acceso

El administrador ingresará al formulario desde el botón:

**Nueva tienda**

---

### 15.2 Campos

El formulario deberá contener:

1. **Código de tienda**

   * Generado automáticamente.
   * Solo lectura.
   * Obligatorio.

2. **Nombre de tienda**

   * Campo obligatorio.

3. **Dirección**

   * Campo obligatorio.

4. **Ubicación**

   * Capital o Departamento.
   * Campo obligatorio.

5. **Estado**

   * Activa por defecto.

---

### 15.3 Botones

El formulario deberá tener dos botones:

1. **Guardar**
2. **Cancelar**

---

### 15.4 Comportamiento del botón Guardar

Al presionar **Guardar**:

* El sistema deberá validar los campos obligatorios.
* El sistema deberá verificar que el código generado no exista.
* El sistema deberá crear el registro de tienda.
* El sistema deberá registrar auditoría de creación.
* El sistema deberá mostrar una confirmación visual.
* El usuario deberá ser redirigido a la tabla de tiendas.

---

### 15.5 Comportamiento del botón Cancelar

Al presionar **Cancelar**:

* No se debe guardar ningún registro.
* No se deben conservar cambios no guardados.
* El usuario deberá ser redirigido a la tabla de tiendas.

---

## 16. Edición de tienda

Desde la tabla de tiendas, el administrador podrá editar una tienda ya creada.

También podrá acceder a la edición desde el perfil de la tienda mediante el botón:

**Editar**

---

### 16.1 Campos editables

El administrador podrá modificar:

* Nombre de la tienda.
* Dirección.
* Ubicación.
* Estado de la tienda.

---

### 16.2 Campos no editables

El administrador no podrá modificar:

* Código de tienda.

El código deberá mostrarse como solo lectura o no mostrarse como campo editable.

---

### 16.3 Botones

La pantalla de edición deberá tener:

1. **Guardar**
2. **Cancelar**

---

### 16.4 Comportamiento al guardar

Al presionar **Guardar**:

* El sistema deberá validar los campos obligatorios.
* El sistema deberá actualizar la información permitida.
* El sistema deberá conservar el mismo código de tienda.
* El sistema deberá registrar auditoría de actualización.
* El usuario deberá ser redirigido a la tabla de tiendas.

---

### 16.5 Comportamiento al cancelar

Al presionar **Cancelar**:

* No se deberán guardar cambios.
* El usuario deberá ser redirigido a la tabla de tiendas.

---

## 17. Inactivación de tienda

El administrador podrá cambiar una tienda de estado activa a inactiva desde la edición de tienda.

---

### 17.1 Confirmación antes de inactivar

Cuando el administrador intente cambiar una tienda de activa a inactiva, el sistema deberá mostrar una advertencia de confirmación.

Mensaje sugerido:

**Al inactivar esta tienda, ya no podrá asignarse a nuevos usuarios ni registrar nuevas compras o clientes desde usuarios asociados a esta tienda. El historial se conservará.**

Botones sugeridos:

* Confirmar inactivación.
* Cancelar.

---

### 17.2 Reglas al inactivar una tienda

Al inactivar una tienda:

* La tienda no debe eliminarse.
* La tienda debe conservar su historial.
* La tienda no debe aparecer como opción para asignar a nuevos usuarios.
* Si existen usuarios asignados actualmente a esa tienda, la relación debe conservarse.
* Los usuarios activos asignados a una tienda inactiva no deberán poder registrar nuevas compras o clientes hasta ser reasignados a una tienda activa.
* El sistema deberá registrar auditoría de inactivación.

---

### 17.3 Tiendas inactivas con usuarios asignados

El sistema deberá permitir inactivar una tienda aunque tenga usuarios asignados.

Sin embargo, deberá mostrar una advertencia visual en el perfil de tienda si existen usuarios activos asignados a una tienda inactiva.

Mensaje sugerido:

**Esta tienda se encuentra inactiva y todavía tiene usuarios asignados. Estos usuarios deberán ser reasignados a una tienda activa para continuar operando.**

---

## 18. Perfil de tienda

Desde la tabla de tiendas, el administrador podrá ingresar a una vista tipo perfil de cada tienda.

Esta vista deberá mostrar información general, métricas principales y usuarios actualmente asignados.

---

### 18.1 Información general del perfil

El perfil deberá mostrar:

* Estado de la tienda.
* Nombre de la tienda.
* Dirección.
* Código de tienda.
* Ubicación.
* Fecha de creación.
* Fecha de última actualización.

También deberá incluir un botón:

**Editar**

Este botón deberá redirigir al formulario de edición de la tienda.

---

## 19. Cards del perfil de tienda

Dentro del perfil de la tienda deberán mostrarse cards tipo dashboard con cantidades totales.

Cards requeridas:

1. **Usuarios asociados a esta tienda**

   * Total de usuarios cuya tienda asignada actual sea esta tienda.

2. **Clientes registrados**

   * Total de clientes cuya tienda de creación sea esta tienda.

3. **Compras realizadas**

   * Total de compras cuya tienda registrada al momento de la compra sea esta tienda.

Estas métricas deben ser acumuladas y consultadas desde la base de datos.

---

### 19.1 Definición exacta de métricas

Para evitar confusiones por reasignaciones futuras de usuarios, las métricas deberán calcularse de la siguiente manera:

#### Usuarios asociados

Debe contar únicamente usuarios cuya tienda asignada vigente sea la tienda consultada.

No debe contar usuarios que estuvieron asignados anteriormente pero ya fueron reasignados.

#### Clientes registrados

Debe contar clientes que fueron creados originalmente desde esta tienda.

Si el usuario que creó el cliente luego fue reasignado a otra tienda, el cliente debe seguir contando para la tienda donde fue creado.

#### Compras realizadas

Debe contar compras registradas en esta tienda al momento de la operación.

Si el usuario que registró la compra luego fue reasignado a otra tienda, la compra debe seguir contando para la tienda donde se realizó originalmente.

---

## 20. Tabla de usuarios asignados a la tienda

Dentro del perfil de tienda deberá existir una tabla que muestre los usuarios actualmente asignados a esa tienda.

Esta tabla no debe mostrar historial.

Es decir:

* Si un usuario estuvo asignado antes a esta tienda, pero actualmente ya no lo está, no debe aparecer.
* Solo deben aparecer usuarios cuya tienda asignada vigente sea la tienda consultada.

---

### 20.1 Columnas de la tabla

La tabla deberá mostrar únicamente:

* Nombre de usuario.
* Correo.
* Estado.

El estado puede ser:

* Activo.
* Inactivo.

Un usuario inactivo puede seguir apareciendo si actualmente continúa asignado a esa tienda.

---

## 21. Relación con el módulo de usuarios

Las tiendas creadas en este módulo deberán estar disponibles como catálogo desplegable dentro del formulario de creación y edición de usuarios.

Cuando el administrador cree un usuario de tienda, deberá poder asignarle una tienda desde un selector.

Reglas:

* El selector debe mostrar únicamente tiendas activas.
* El usuario de tienda solo podrá tener una tienda asignada.
* La tienda asignada será utilizada por el módulo web de tienda para registrar clientes y compras.
* Si una tienda se inactiva, no deberá poder asignarse a nuevos usuarios.
* Si ya existen usuarios asignados a una tienda que luego se inactiva, el sistema deberá conservar la relación, pero deberá advertirlo visualmente en el perfil de la tienda o del usuario.
* Si el usuario tiene una tienda inactiva asignada, no deberá poder operar registros nuevos hasta ser reasignado.

---

## 22. Relación con creación de clientes desde usuario de tienda

Cuando un usuario de tienda cree un cliente desde el módulo web de tienda, el sistema deberá registrar automáticamente la tienda asignada a ese usuario.

Reglas:

* El usuario de tienda no debe seleccionar manualmente la tienda.
* La tienda se obtiene desde la sesión del usuario.
* El cliente creado debe quedar asociado a la tienda asignada del usuario al momento de creación.
* Esta asociación debe conservarse aunque el usuario sea reasignado posteriormente a otra tienda.
* La tienda registrada en el cliente debe representar la tienda donde fue creado originalmente.
* Si la tienda asignada al usuario está inactiva, el sistema no debe permitir crear el cliente.

---

## 23. Relación con compras

Cuando se registre una compra desde el módulo web de tienda, el sistema deberá asociar automáticamente la compra a la tienda asignada al usuario que realiza el registro.

Reglas:

* La tienda no debe ingresarse manualmente.
* La tienda debe tomarse desde el usuario autenticado.
* La compra debe quedar relacionada con la tienda vigente al momento del registro.
* Esta información será usada para calcular el total de compras realizadas por tienda.
* Si la tienda asignada al usuario está inactiva, el sistema no debe permitir registrar compras.

---

## 24. Validaciones

### 24.1 Validaciones de creación

El sistema deberá validar:

* Nombre de tienda obligatorio.
* Dirección obligatoria.
* Ubicación obligatoria.
* Código único obligatorio.
* Estado obligatorio.

---

### 24.2 Validaciones de edición

El sistema deberá validar:

* Nombre de tienda obligatorio.
* Dirección obligatoria.
* Ubicación obligatoria.
* Estado obligatorio.
* Código no editable.

---

### 24.3 Validaciones de duplicidad

El sistema no deberá permitir duplicar el código de tienda.

Opcionalmente, el sistema puede advertir si existe una tienda con el mismo nombre o un nombre muy similar, pero no debe bloquear automáticamente si la dirección es diferente.

Mensaje sugerido:

**Ya existe una tienda con un nombre similar. Verifica la información antes de guardar.**

Ejemplo:

* Nine West Oakland.
* Oakland Nine West.
* NINE WEST OAKLAND.

---

## 25. Auditoría de cambios

El sistema deberá registrar información básica de auditoría para cada tienda.

Campos sugeridos:

* Creado por.
* Fecha de creación.
* Actualizado por.
* Fecha de última actualización.
* Inactivado por.
* Fecha de inactivación.

Reglas:

* Al crear una tienda, se deberá guardar el usuario administrador que creó el registro.
* Al editar una tienda, se deberá guardar el usuario administrador que realizó la modificación.
* Al inactivar una tienda, se deberá guardar el usuario administrador que realizó la inactivación.
* La auditoría no necesariamente deberá mostrarse completa en la tabla principal, pero sí deberá quedar disponible para consulta interna o reportes futuros.

---

## 26. Pantallas vacías

El sistema deberá manejar estados vacíos cuando no existan registros o resultados.

---

### 26.1 Sin tiendas registradas

Cuando no existan tiendas registradas, la pantalla deberá mostrar un mensaje informativo.

Mensaje sugerido:

**Aún no hay tiendas registradas. Crea tu primera tienda para poder asignarla a usuarios y registrar operaciones.**

Debe mostrarse el botón:

**Nueva tienda**

---

### 26.2 Sin resultados por búsqueda o filtros

Cuando el usuario aplique búsqueda o filtros y no existan resultados, el sistema deberá mostrar un mensaje.

Mensaje sugerido:

**No se encontraron tiendas con los criterios seleccionados.**

Debe existir opción para limpiar filtros o búsqueda.

---

## 27. Manejo de errores

El sistema deberá mostrar mensajes claros cuando ocurra un error.

Mensajes sugeridos:

* **No se pudieron cargar las tiendas. Intenta nuevamente.**
* **No se pudo crear la tienda. Verifica la información e intenta nuevamente.**
* **No se pudo actualizar la tienda. Intenta nuevamente.**
* **No se pudo inactivar la tienda. Intenta nuevamente.**
* **El código generado ya existe. El sistema generará uno nuevo automáticamente.**
* **No se pudo exportar el archivo XLSX. Intenta nuevamente.**
* **No se pudieron cargar los usuarios asignados a esta tienda.**

Los errores no deben mostrar mensajes técnicos al usuario final.

---

## 28. Responsive y comportamiento visual

Aunque el módulo pertenece a la plataforma web de administrador, deberá adaptarse correctamente a diferentes tamaños de pantalla.

Reglas sugeridas:

* En desktop, las cards deberán mostrarse en fila o grilla.
* En móvil, las cards deberán acomodarse en una columna o grilla compacta.
* La tabla podrá convertirse en cards o usar scroll horizontal.
* Los botones principales deberán mantenerse visibles y accesibles.
* El botón **Nueva tienda** deberá mantenerse como acción principal.
* Las acciones de tabla no deberán saturar la pantalla.
* Los formularios deberán ser claros, con campos bien separados y botones visibles.

---

## 29. Permisos

El módulo estará disponible para usuarios administradores con permisos de gestión.

Permisos sugeridos:

* Ver tiendas.
* Crear tiendas.
* Editar tiendas.
* Inactivar tiendas.
* Ver perfil de tienda.
* Exportar tiendas.

Los usuarios de tienda no tendrán acceso al módulo administrativo de tiendas.

---

## 30. Requerimientos técnicos sugeridos

### 30.1 Modelo de datos sugerido

Entidad: **Store**

Campos sugeridos:

* id
* code
* name
* address
* location_type
* status
* created_by
* updated_by
* deactivated_by
* created_at
* updated_at
* deactivated_at

Valores de `location_type`:

* capital
* departamento

Valores de `status`:

* active
* inactive

---

### 30.2 Relaciones sugeridas

Una tienda puede tener muchos usuarios asociados.

Un usuario de tienda puede tener solo una tienda asignada.

Una tienda puede tener muchos clientes registrados.

Una tienda puede tener muchas compras registradas.

Relaciones sugeridas:

* Store 1 — N Users
* Store 1 — N Customers
* Store 1 — N Purchases

---

### 30.3 Consulta paginada sugerida

La consulta de tiendas deberá aceptar parámetros como:

* page
* limit
* search
* status
* location_type
* sort_by
* sort_direction

El valor de `limit` deberá ser 10 para la tabla principal.

---

## 31. Criterios de aceptación

### CA-01 — Acceso al módulo

Dado que el administrador está autenticado,
cuando ingrese a la plataforma web,
entonces deberá ver el módulo **Tiendas** dentro del menú lateral.

---

### CA-02 — Visualización de cards

Dado que el administrador ingresa al módulo de tiendas,
cuando cargue la pantalla principal,
entonces deberá visualizar únicamente las cards de:

* Tiendas registradas total.
* Tiendas activas.
* Tiendas inactivas.
* Tiendas en departamentos.
* Tiendas en capital.

---

### CA-03 — Tabla paginada

Dado que existen más de 10 tiendas registradas,
cuando el administrador ingrese a la tabla,
entonces el sistema deberá mostrar únicamente 10 registros por página.

---

### CA-04 — Consulta por página

Dado que el administrador navega a la página 2,
cuando el sistema consulte los registros,
entonces deberá traer únicamente los 10 registros correspondientes a esa página.

---

### CA-05 — Crear tienda

Dado que el administrador presiona **Nueva tienda**,
cuando ingrese al formulario,
entonces deberá poder registrar nombre, dirección y ubicación de la tienda.

---

### CA-06 — Código automático

Dado que el administrador crea una nueva tienda,
cuando se genere el formulario o se guarde el registro,
entonces el sistema deberá generar automáticamente un código único compuesto por 4 letras y 6 números.

---

### CA-07 — Código no editable

Dado que una tienda ya fue creada,
cuando el administrador edite la tienda,
entonces el código de tienda no deberá poder modificarse.

---

### CA-08 — Guardar tienda

Dado que el administrador completa correctamente los campos obligatorios,
cuando presione **Guardar**,
entonces el sistema deberá crear la tienda y redirigir a la tabla de tiendas.

---

### CA-09 — Cancelar creación

Dado que el administrador está creando una tienda,
cuando presione **Cancelar**,
entonces el sistema deberá descartar los cambios y redirigir a la tabla de tiendas.

---

### CA-10 — Editar tienda

Dado que existe una tienda registrada,
cuando el administrador presione **Editar**,
entonces podrá modificar nombre, dirección, ubicación y estado, pero no el código.

---

### CA-11 — Confirmación de inactivación

Dado que el administrador intenta inactivar una tienda,
cuando cambie el estado de activa a inactiva,
entonces el sistema deberá mostrar una confirmación antes de aplicar el cambio.

---

### CA-12 — Inactivar tienda

Dado que el administrador confirma la inactivación de una tienda,
cuando el sistema guarde el cambio,
entonces la tienda deberá quedar inactiva, conservar su historial y dejar de estar disponible para nuevas asignaciones.

---

### CA-13 — No eliminación física

Dado que el administrador consulta una tienda,
cuando revise las acciones disponibles,
entonces no deberá existir una opción para eliminar físicamente la tienda.

---

### CA-14 — Perfil de tienda

Dado que el administrador presiona **Ver perfil**,
cuando ingrese al perfil de la tienda,
entonces deberá visualizar estado, nombre, dirección, código, ubicación, cards de métricas y tabla de usuarios asignados.

---

### CA-15 — Usuarios actuales asignados

Dado que una tienda tiene usuarios asignados,
cuando el administrador consulte el perfil,
entonces la tabla deberá mostrar únicamente usuarios actualmente asignados a esa tienda.

---

### CA-16 — Usuario inactivo asignado

Dado que un usuario inactivo sigue asignado actualmente a una tienda,
cuando el administrador consulte el perfil de esa tienda,
entonces el usuario deberá aparecer en la tabla con estado inactivo.

---

### CA-17 — Catálogo en usuarios

Dado que el administrador crea o edita un usuario de tienda,
cuando seleccione la tienda asignada,
entonces el sistema deberá mostrar las tiendas activas disponibles como catálogo desplegable.

---

### CA-18 — Registro automático de tienda en clientes

Dado que un usuario de tienda crea un cliente,
cuando guarde el registro,
entonces el sistema deberá asociar automáticamente el cliente a la tienda asignada del usuario.

---

### CA-19 — Registro automático de tienda en compras

Dado que un usuario de tienda registra una compra,
cuando guarde el registro,
entonces el sistema deberá asociar automáticamente la compra a la tienda asignada del usuario.

---

### CA-20 — Bloqueo operativo por tienda inactiva

Dado que un usuario tiene asignada una tienda inactiva,
cuando intente crear clientes o registrar compras,
entonces el sistema no deberá permitir la operación.

---

### CA-21 — Búsqueda de tiendas

Dado que el administrador ingresa un término de búsqueda,
cuando el sistema consulte la información,
entonces deberá mostrar tiendas que coincidan por código, nombre o dirección.

---

### CA-22 — Filtros de tiendas

Dado que el administrador aplica filtros de estado o ubicación,
cuando el sistema consulte la información,
entonces deberá mostrar únicamente las tiendas que cumplan con los filtros seleccionados.

---

### CA-23 — Exportación XLSX

Dado que el administrador está en la tabla de tiendas,
cuando presione **Exportar XLSX**,
entonces el sistema deberá descargar un archivo Excel con los registros de tiendas.

---

### CA-24 — Exportación con filtros

Dado que el administrador tiene búsqueda o filtros aplicados,
cuando presione **Exportar XLSX**,
entonces el archivo deberá incluir únicamente los registros que coincidan con esos criterios.

---

### CA-25 — Estado vacío sin registros

Dado que no existen tiendas registradas,
cuando el administrador ingrese al módulo,
entonces el sistema deberá mostrar un mensaje informativo y el botón **Nueva tienda**.

---

### CA-26 — Estado vacío sin resultados

Dado que el administrador aplica búsqueda o filtros sin coincidencias,
cuando el sistema no encuentre resultados,
entonces deberá mostrar un mensaje indicando que no se encontraron tiendas.

---

### CA-27 — Auditoría de creación

Dado que el administrador crea una tienda,
cuando el registro se guarde,
entonces el sistema deberá guardar quién creó la tienda y la fecha de creación.

---

### CA-28 — Auditoría de edición

Dado que el administrador edita una tienda,
cuando el registro se actualice,
entonces el sistema deberá guardar quién hizo la modificación y la fecha de actualización.

---

### CA-29 — Auditoría de inactivación

Dado que el administrador inactiva una tienda,
cuando el cambio se confirme,
entonces el sistema deberá guardar quién inactivó la tienda y la fecha de inactivación.

---

## 32. Fuera de alcance

Para esta versión del módulo no se contempla:

* Historial de asignaciones de usuarios por tienda.
* Geolocalización GPS de tiendas.
* Inventario por tienda.
* Metas de venta por tienda.
* Horarios de atención.
* Asignación múltiple de tiendas a un mismo usuario.
* Registro manual de tienda al crear clientes desde el módulo web de tienda.
* Registro manual de tienda al registrar compras desde el módulo web de tienda.
* Eliminación física de tiendas.
* Administración de encargados de tienda.
* Gestión de teléfonos o correos de tienda.
* Reporte avanzado por tienda.
* Dashboard financiero por tienda.

---

## 33. Posibles mejoras futuras

En futuras versiones se podrían agregar los siguientes campos o funcionalidades:

* Teléfono de tienda.
* Correo de tienda.
* Encargado de tienda.
* Departamento.
* Municipio.
* Centro comercial.
* Horario de atención.
* Meta mensual.
* Código externo de tienda.
* Historial de usuarios asignados.
* Historial de cambios de tienda.
* Reporte detallado de compras por tienda.
* Ranking de tiendas por puntos generados.
* Ranking de tiendas por clientes registrados.
* Mapa de tiendas.
* Geolocalización.
* Importación masiva de tiendas desde XLSX.

---

## 34. Observación funcional importante

Para poder mostrar correctamente las cards de **tiendas en capital** y **tiendas en departamentos**, el sistema necesita guardar una clasificación de ubicación.

Si solo se guarda una dirección en texto libre, el sistema no podrá calcular con certeza esta métrica.

Por eso se recomienda agregar un campo simple llamado **Ubicación**, con las opciones:

* Capital.
* Departamento.

Este campo debe formar parte del registro de tienda, aunque visualmente el formulario se mantenga limpio y simple.

---

## 35. Resumen de reglas críticas

1. Las tiendas se crean únicamente desde la plataforma web de administrador.
2. El código de tienda se genera automáticamente.
3. El código de tienda no se puede editar.
4. Una tienda no se elimina, solo se inactiva.
5. La tabla muestra 10 registros por página.
6. La paginación debe consultar únicamente los 10 registros requeridos.
7. Las tiendas activas pueden asignarse a usuarios.
8. Las tiendas inactivas no pueden asignarse a nuevos usuarios.
9. El usuario de tienda solo puede tener una tienda asignada.
10. La tienda se registra automáticamente al crear clientes.
11. La tienda se registra automáticamente al registrar compras.
12. La tienda no se selecciona manualmente desde el módulo web de tienda.
13. El perfil de tienda muestra métricas y usuarios actualmente asignados.
14. La tabla de usuarios asignados no debe mostrar historial.
15. La exportación XLSX debe respetar filtros y búsqueda.
16. El sistema debe conservar historial operativo de clientes y compras.
17. El sistema debe registrar auditoría básica de creación, edición e inactivación.
