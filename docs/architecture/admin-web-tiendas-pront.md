Actúa como desarrollador senior full-stack dentro de este repositorio.

Necesito que analices primero la estructura actual del proyecto, el stack, rutas, componentes, estilos, autenticación, modelos, servicios, API routes, base de datos y patrones existentes. Después implementa el **Módulo de Tiendas** para la plataforma web de administrador del sistema de lealtad.

No hagas una implementación aislada ni inventes una arquitectura nueva si ya existe una en el proyecto. Usa los patrones actuales del código.

## Objetivo

Crear el módulo administrativo de **Tiendas**, disponible desde el menú lateral de la plataforma web de administrador.

Este módulo debe permitir:

* Ver resumen de tiendas.
* Listar tiendas en tabla paginada.
* Buscar tiendas.
* Filtrar tiendas.
* Ordenar tiendas.
* Crear tiendas.
* Editar tiendas.
* Inactivar tiendas.
* Ver perfil de tienda.
* Ver usuarios actualmente asignados a una tienda.
* Exportar tiendas a XLSX.
* Usar las tiendas como catálogo para asignarlas a usuarios de tienda.
* Asociar automáticamente la tienda del usuario cuando se creen clientes o se registren compras desde el módulo web de tienda.

---

# 1. Ubicación en menú lateral

Agregar el módulo al menú lateral de administrador con el nombre:

**Tiendas**

Debe llevar a la pantalla principal del módulo de tiendas.

No afectar el resto de opciones existentes del menú.

---

# 2. Modelo de datos

Revisar cómo se manejan actualmente los modelos y la base de datos.

Crear o adaptar una entidad equivalente a:

## Store / Tienda

Campos requeridos:

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

Valores permitidos para `location_type`:

* capital
* departamento

Valores permitidos para `status`:

* active
* inactive

Reglas:

* `id` debe ser el identificador interno.
* `code` será el código visible de tienda.
* `code` debe ser único.
* `code` no debe ser editable.
* No usar `code` como llave primaria.
* Las tiendas no se eliminan físicamente.
* Solo se inactivan.

Si el proyecto usa Prisma, Drizzle, Sequelize, SQL directo u otro ORM, crear la migración y modelo siguiendo el patrón actual del proyecto.

---

# 3. Código automático de tienda

Al crear una tienda, el sistema debe generar automáticamente un código único con este formato:

**4 letras + 6 números**

Ejemplo:

**ABCD123456**

Reglas:

* Debe generarse automáticamente.
* No debe ser editable por el usuario.
* Debe ser único.
* No debe repetirse con tiendas activas ni inactivas.
* Si existe colisión, generar otro código.
* El código debe mostrarse en el formulario como solo lectura o generarse al guardar y luego mostrarse en la tabla/perfil.

---

# 4. Pantalla principal de tiendas

Crear una pantalla principal del módulo con:

* Título del módulo.
* Botón **Nueva tienda** ubicado arriba a la derecha.
* Cards de resumen.
* Buscador.
* Filtros.
* Botón **Exportar XLSX**.
* Tabla de tiendas.
* Paginación.

---

# 5. Cards de resumen

Mostrar únicamente estas cards:

1. **Tiendas registradas total**
2. **Tiendas activas**
3. **Tiendas inactivas**
4. **Tiendas en departamentos**
5. **Tiendas en capital**

Las cards deben calcularse desde base de datos.

---

# 6. Tabla de tiendas

La tabla debe mostrar:

* Código de tienda.
* Nombre de tienda.
* Dirección.
* Ubicación.
* Estado.
* Fecha de creación.
* Acciones.

Acciones:

* Ver perfil.
* Editar.

No debe existir acción de eliminar.

El estado debe mostrarse con badge visual:

* Activa.
* Inactiva.

---

# 7. Paginación

La tabla debe estar paginada a 10 registros por página.

Reglas obligatorias:

* Mostrar solo 10 registros por página.
* Consultar únicamente los 10 registros correspondientes desde backend/base de datos.
* No cargar todos los registros en frontend para paginar visualmente.
* Debe permitir:

  * Página anterior.
  * Página siguiente.
  * Selección por número de página.

Parámetros sugeridos para API o consulta:

* page
* limit
* search
* status
* location_type
* sort_by
* sort_direction

`limit` debe ser 10 en la tabla principal.

---

# 8. Buscador

Agregar buscador por:

* Código de tienda.
* Nombre de tienda.
* Dirección.

Reglas:

* La búsqueda debe consultar desde backend/base de datos.
* No debe buscar únicamente dentro de los 10 registros visibles.
* Al buscar, regresar a página 1.
* Si no hay resultados, mostrar mensaje vacío.

Mensaje sugerido:

**No se encontraron tiendas con los criterios seleccionados.**

---

# 9. Filtros

Agregar filtros por:

## Estado

* Todas.
* Activas.
* Inactivas.

## Ubicación

* Todas.
* Capital.
* Departamento.

Reglas:

* Los filtros deben combinarse con el buscador.
* Los filtros deben respetar paginación.
* Al aplicar filtros, regresar a página 1.
* Los filtros deben afectar la exportación XLSX.

---

# 10. Ordenamiento

Permitir ordenamiento por:

* Código de tienda.
* Nombre de tienda.
* Estado.
* Ubicación.
* Fecha de creación.

Orden por defecto:

* Fecha de creación descendente.

---

# 11. Exportación XLSX

Agregar botón:

**Exportar XLSX**

Reglas:

* Debe descargar un archivo `.xlsx`.
* Si no hay filtros ni búsqueda, exportar todas las tiendas.
* Si hay búsqueda o filtros aplicados, exportar únicamente los resultados filtrados.
* No exportar solo los 10 registros visibles, salvo que no existan más.
* Respetar búsqueda, filtros y ordenamiento.
* Usar una librería compatible con el proyecto. Si no existe, instalar una librería adecuada.

Columnas mínimas del XLSX:

* Código de tienda.
* Nombre de tienda.
* Dirección.
* Ubicación.
* Estado.
* Fecha de creación.
* Fecha de última actualización.
* Creado por.
* Actualizado por.
* Fecha de inactivación.
* Inactivado por.

---

# 12. Crear tienda

El botón **Nueva tienda** debe llevar al formulario de creación.

Campos:

* Código de tienda.

  * Automático.
  * Solo lectura.
* Nombre de tienda.

  * Obligatorio.
* Dirección.

  * Obligatorio.
* Ubicación.

  * Capital / Departamento.
  * Obligatorio.
* Estado.

  * Activa por defecto.

Botones:

* **Guardar**
* **Cancelar**

Comportamiento de **Guardar**:

* Validar campos obligatorios.
* Crear tienda.
* Registrar auditoría de creación.
* Mostrar confirmación visual.
* Redirigir a la tabla de tiendas.

Comportamiento de **Cancelar**:

* No guardar nada.
* Redirigir a la tabla de tiendas.

---

# 13. Editar tienda

Desde la tabla y desde el perfil debe existir opción de editar.

Campos editables:

* Nombre de tienda.
* Dirección.
* Ubicación.
* Estado.

Campos no editables:

* Código de tienda.

Botones:

* **Guardar**
* **Cancelar**

Comportamiento:

* Guardar cambios permitidos.
* Mantener el mismo código.
* Registrar auditoría de actualización.
* Redirigir a la tabla de tiendas.
* Si cancela, no guardar cambios y redirigir a la tabla.

---

# 14. Inactivar tienda

El sistema no debe eliminar tiendas.

Cuando el administrador cambie una tienda de activa a inactiva, debe mostrar confirmación.

Mensaje sugerido:

**Al inactivar esta tienda, ya no podrá asignarse a nuevos usuarios ni registrar nuevas compras o clientes desde usuarios asociados a esta tienda. El historial se conservará.**

Botones:

* Confirmar inactivación.
* Cancelar.

Reglas:

* La tienda queda inactiva.
* Conserva historial.
* No aparece para nuevas asignaciones.
* No permite operaciones nuevas.
* Conserva usuarios actualmente asignados.
* Registrar `deactivated_by` y `deactivated_at`.

Si una tienda inactiva tiene usuarios activos asignados, mostrar alerta en el perfil:

**Esta tienda se encuentra inactiva y todavía tiene usuarios asignados. Estos usuarios deberán ser reasignados a una tienda activa para continuar operando.**

---

# 15. Perfil de tienda

Desde la tabla debe existir acción **Ver perfil**.

El perfil debe mostrar:

* Estado de tienda.
* Nombre de tienda.
* Dirección.
* Código de tienda.
* Ubicación.
* Fecha de creación.
* Fecha de última actualización.
* Botón **Editar**.

También debe mostrar cards tipo dashboard:

1. **Usuarios asociados a esta tienda**

   * Total de usuarios cuya tienda asignada actual sea esta tienda.

2. **Clientes registrados**

   * Total de clientes cuya tienda de creación sea esta tienda.

3. **Compras realizadas**

   * Total de compras cuya tienda registrada al momento de la compra sea esta tienda.

Importante:

* Si un usuario fue reasignado luego a otra tienda, los clientes/compras históricas deben seguir contando para la tienda donde se registraron originalmente.
* La métrica de usuarios asociados solo cuenta asignación vigente.

---

# 16. Tabla de usuarios asignados en perfil de tienda

Dentro del perfil debe existir una tabla con usuarios actualmente asignados a esa tienda.

No debe ser historial.

Debe mostrar únicamente:

* Nombre de usuario.
* Correo.
* Estado.

Reglas:

* Mostrar usuarios activos e inactivos si actualmente siguen asignados.
* No mostrar usuarios que antes estuvieron asignados pero ya no lo están.

---

# 17. Relación con módulo de usuarios

Al crear o editar un usuario de tienda, debe existir un selector de tienda.

Reglas:

* Mostrar únicamente tiendas activas.
* El usuario de tienda solo puede tener una tienda asignada.
* Si una tienda se inactiva, no debe aparecer para nuevas asignaciones.
* Si un usuario ya tenía una tienda y luego esa tienda se inactiva, conservar la relación.
* Si el usuario tiene tienda inactiva, no debe poder operar en el módulo web de tienda hasta ser reasignado.

Revisar el módulo actual de usuarios y adaptar el selector sin romper funcionalidad existente.

---

# 18. Relación con creación de clientes desde el módulo web de tienda

Cuando un usuario de tienda cree un cliente:

* No debe seleccionar tienda manualmente.
* La tienda debe tomarse desde la sesión o usuario autenticado.
* El cliente debe quedar asociado a la tienda asignada del usuario al momento de creación.
* Si luego el usuario cambia de tienda, el cliente conserva la tienda original.
* Si la tienda del usuario está inactiva, bloquear creación del cliente.

---

# 19. Relación con compras desde el módulo web de tienda

Cuando un usuario de tienda registre una compra:

* No debe seleccionar tienda manualmente.
* La tienda debe tomarse desde la sesión o usuario autenticado.
* La compra debe quedar asociada a la tienda asignada al momento del registro.
* Si luego el usuario cambia de tienda, la compra conserva la tienda original.
* Si la tienda del usuario está inactiva, bloquear registro de compra.

---

# 20. Validaciones

Validar en frontend y backend:

* Nombre obligatorio.
* Dirección obligatoria.
* Ubicación obligatoria.
* Estado obligatorio.
* Código único obligatorio.
* Código no editable.
* No permitir duplicidad de código.

Opcional:

* Advertir si existe una tienda con nombre similar.
* No bloquear automáticamente si la dirección es diferente.

Mensaje sugerido:

**Ya existe una tienda con un nombre similar. Verifica la información antes de guardar.**

---

# 21. Auditoría

Guardar auditoría básica:

* Creado por.
* Fecha de creación.
* Actualizado por.
* Fecha de última actualización.
* Inactivado por.
* Fecha de inactivación.

Usar el usuario autenticado actual para registrar quién creó, editó o inactivó.

---

# 22. Estados vacíos

Agregar estados vacíos.

## Sin tiendas registradas

Mensaje:

**Aún no hay tiendas registradas. Crea tu primera tienda para poder asignarla a usuarios y registrar operaciones.**

Debe mostrar botón:

**Nueva tienda**

## Sin resultados

Mensaje:

**No se encontraron tiendas con los criterios seleccionados.**

Debe permitir limpiar filtros o búsqueda.

---

# 23. Errores

Agregar manejo de errores claro para usuario final.

Mensajes sugeridos:

* **No se pudieron cargar las tiendas. Intenta nuevamente.**
* **No se pudo crear la tienda. Verifica la información e intenta nuevamente.**
* **No se pudo actualizar la tienda. Intenta nuevamente.**
* **No se pudo inactivar la tienda. Intenta nuevamente.**
* **El código generado ya existe. El sistema generará uno nuevo automáticamente.**
* **No se pudo exportar el archivo XLSX. Intenta nuevamente.**
* **No se pudieron cargar los usuarios asignados a esta tienda.**

No mostrar errores técnicos crudos al usuario final.

---

# 24. Responsive

Asegurar que el módulo funcione correctamente en desktop y móvil.

Reglas:

* En desktop, cards en fila o grilla.
* En móvil, cards en una columna o grilla compacta.
* Tabla puede usar cards o scroll horizontal.
* Botón **Nueva tienda** debe seguir siendo visible.
* Acciones no deben saturar la tabla.
* Formularios deben ser claros y responsivos.

---

# 25. Permisos

Implementar usando el sistema de permisos actual si existe.

Permisos sugeridos:

* Ver tiendas.
* Crear tiendas.
* Editar tiendas.
* Inactivar tiendas.
* Ver perfil de tienda.
* Exportar tiendas.

Los usuarios de tienda no deben tener acceso al módulo administrativo de tiendas.

---

# 26. Criterios de aceptación

La implementación debe cumplir:

1. El módulo **Tiendas** aparece en el menú lateral del administrador.
2. La pantalla principal muestra las 5 cards definidas.
3. La tabla lista tiendas con paginación real de 10 registros.
4. La paginación consulta solo los registros necesarios.
5. El buscador funciona por código, nombre y dirección.
6. Los filtros funcionan por estado y ubicación.
7. El ordenamiento funciona en columnas principales.
8. El botón **Nueva tienda** está arriba a la derecha.
9. El formulario crea tiendas correctamente.
10. El código se genera automáticamente con 4 letras y 6 números.
11. El código no puede editarse.
12. La tienda puede editarse excepto el código.
13. La tienda puede inactivarse con confirmación.
14. No existe eliminación física.
15. El perfil muestra datos generales, cards y usuarios asignados.
16. La tabla del perfil muestra solo usuarios actualmente asignados.
17. El selector de tiendas en usuarios muestra solo tiendas activas.
18. Clientes creados desde el módulo web de tienda quedan asociados automáticamente a la tienda del usuario.
19. Compras registradas desde el módulo web de tienda quedan asociadas automáticamente a la tienda del usuario.
20. Si la tienda está inactiva, no permite crear clientes ni compras.
21. La exportación XLSX descarga correctamente.
22. La exportación respeta búsqueda y filtros.
23. Los errores se muestran de forma clara.
24. Existen estados vacíos.
25. La pantalla es responsiva.
26. La auditoría queda registrada.

---

# 27. Restricciones importantes

No hacer lo siguiente:

* No eliminar tiendas físicamente.
* No permitir editar el código de tienda.
* No permitir que el módulo web de tienda seleccione tienda manualmente.
* No cargar todos los registros para paginar en frontend.
* No romper módulos existentes.
* No cambiar estilos globales innecesariamente.
* No crear una arquitectura paralela.
* No dejar datos mock si ya existe backend/base de datos.
* No implementar solo UI sin persistencia.

---

# 28. Entregables esperados

Al finalizar, entrega:

1. Resumen de cambios realizados.
2. Archivos modificados.
3. Migraciones creadas, si aplica.
4. Nuevas rutas o endpoints creados.
5. Componentes nuevos.
6. Validaciones agregadas.
7. Cómo probar manualmente el módulo.
8. Comandos que ejecutaste.
9. Errores encontrados y cómo los resolviste.
10. Cualquier punto pendiente si no se pudo completar algo.

Antes de terminar, ejecuta validaciones del proyecto según el stack existente, por ejemplo:

* lint
* typecheck
* build
* tests, si existen

Si alguno falla por errores previos no relacionados, indícalo claramente.
