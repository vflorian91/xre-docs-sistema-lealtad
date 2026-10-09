# FRD — Módulo de Catálogos

## 1. Objetivo del módulo

El módulo de **Catálogos** permitirá administrar todos los catálogos maestros utilizados por las tres plataformas del sistema de lealtad:

1. Plataforma Web Administrador.
2. PWA Tienda.
3. PWA Cliente.

Este módulo centralizará la creación, edición, consulta, activación e inactivación de registros maestros como países, departamentos, municipios, zonas, tiendas, productos, tipos de calzado y cualquier otro catálogo que el sistema necesite en el futuro.

La finalidad principal es evitar datos duplicados, errores de escritura, registros inconsistentes y mantener una única fuente de verdad para todas las plataformas.

---

## 2. Ubicación dentro del sistema

El módulo debe estar disponible dentro del menú lateral de la plataforma web administrativa, bajo el título **Configuración**.

La estructura del menú deberá ser la siguiente:

```text
Configuración
└── Catálogos
    ├── País
    ├── Departamentos
    ├── Municipios
    ├── Zona
    ├── Tiendas
    ├── Productos
    │   └── Tipos de calzado
```

Cada vez que se agregue un nuevo catálogo al sistema, debe integrarse dentro de esta misma lógica visual y funcional.

---

## 3. Alcance funcional

El módulo debe permitir administrar catálogos globales reutilizables en todo el sistema.

Cada catálogo deberá tener su propia vista, su propia tabla de registros y sus propios formularios de creación, edición y visualización.

Las acciones permitidas serán:

* Ver listado de registros.
* Buscar registros.
* Filtrar registros.
* Agregar nuevo registro.
* Ver detalle de un registro.
* Editar registro.
* Inactivar registro.
* Reactivar registro.

No debe existir eliminación definitiva de registros.

---

## 4. Regla principal de eliminación

Ningún registro de catálogo puede ser eliminado físicamente de la base de datos.

En lugar de eliminar, el sistema deberá manejar estados:

* Activo.
* Inactivo.

Cuando un registro sea inactivado:

* Ya no debe aparecer disponible para selección en ningún formulario de la Web Administrador, PWA Tienda o PWA Cliente.
* No debe mostrarse en buscadores, desplegables, autocompletados ni formularios nuevos.
* Debe mantenerse visible únicamente dentro del módulo administrativo de catálogos, con estado **Inactivo**.
* Debe poder reactivarse posteriormente.
* Al reactivarse, debe volver a estar disponible automáticamente en todos los módulos donde corresponda.

---

## 5. Comportamiento general de todos los catálogos

Todos los catálogos deberán compartir una lógica funcional estándar.

### 5.1 Listado

Cada catálogo debe tener una pantalla principal con una tabla de registros.

La tabla debe mostrar, como mínimo:

* Código.
* Nombre o descripción del registro.
* Relación padre, si aplica.
* Estado.
* Fecha de creación.
* Última actualización.
* Acciones.

Las acciones disponibles serán:

* Ver.
* Editar.
* Inactivar.
* Reactivar, cuando el registro esté inactivo.

No debe existir acción de eliminar.

---

### 5.2 Búsqueda

Cada tabla debe incluir un campo de búsqueda general.

La búsqueda debe permitir encontrar registros por:

* Código.
* Nombre.
* Descripción.
* Relación padre, cuando aplique.

La búsqueda debe soportar coincidencias parciales y exactas.

Ejemplo:

Si el usuario escribe `Guate`, el sistema debe poder sugerir o mostrar:

* Guatemala.
* Departamento de Guatemala.
* Municipio de Guatemala.
* Zona Municipal 1, si aplica según contexto.

---

### 5.3 Filtros

Cada catálogo debe permitir filtrar por:

* Estado: activo o inactivo.
* Relación padre, cuando aplique.
* País, cuando aplique.
* Departamento, cuando aplique.
* Municipio, cuando aplique.
* Tipo o categoría, cuando aplique.

---

### 5.4 Agregar registro

Cada catálogo debe permitir crear nuevos registros desde un botón visible llamado:

```text
+ Agregar registro
```

El formulario deberá validar que no exista duplicidad lógica.

Ejemplo:

No debe permitirse crear dos municipios con el mismo nombre dentro del mismo departamento, salvo que el negocio lo autorice expresamente.

---

### 5.5 Editar registro

El sistema debe permitir editar registros existentes, siempre que el usuario tenga permiso.

La edición debe actualizar automáticamente la información en todos los lugares donde ese catálogo sea utilizado.

Ejemplo:

Si se corrige el nombre de un municipio, el nuevo nombre debe reflejarse en todos los módulos donde aparezca ese municipio.

---

### 5.6 Ver registro

Cada catálogo debe tener una vista de detalle en modo solo lectura.

La vista deberá mostrar:

* Información general.
* Estado.
* Relaciones.
* Fecha de creación.
* Usuario que creó el registro.
* Última modificación.
* Usuario que modificó por última vez.
* Historial básico de cambios, si el sistema ya cuenta con auditoría.

---

### 5.7 Inactivar registro

Al presionar la acción de inactivar, el sistema debe solicitar confirmación.

Mensaje sugerido:

```text
¿Deseas inactivar este registro?
Al inactivarlo dejará de estar disponible para selección en todas las plataformas, pero los registros históricos que ya lo utilizan no serán eliminados.
```

El sistema no debe permitir inactivar un registro si la inactivación rompe una dependencia crítica sin advertencia.

Ejemplo:

Si se intenta inactivar un país que tiene departamentos activos, el sistema debe advertirlo y solicitar primero inactivar o revisar los registros dependientes.

---

### 5.8 Reactivar registro

Los registros inactivos podrán ser reactivados.

Al reactivar un registro:

* Debe volver a aparecer en formularios.
* Debe estar disponible en búsquedas.
* Debe poder utilizarse nuevamente en las tres plataformas.
* Debe respetar las relaciones padre activas.

Ejemplo:

No se debe poder reactivar un municipio si su departamento padre está inactivo, salvo que primero se reactive el departamento.

---

## 6. Catálogos iniciales requeridos

Los catálogos iniciales del sistema serán:

1. País.
2. Departamentos.
3. Municipios.
4. Zona.
5. Tiendas.
6. Productos.
7. Tipos de calzado.

---

# 7. Catálogo País

## 7.1 Objetivo

Administrar los países disponibles para el sistema.

Este catálogo será utilizado principalmente en registros de direcciones, tiendas, clientes, usuarios y cualquier entidad que requiera ubicación geográfica.

## 7.2 Campos mínimos

* Código del país.
* Nombre del país.
* Estado.
* Fecha de creación.
* Fecha de actualización.

## 7.3 Tabla de país

La tabla debe mostrar:

* Código.
* País.
* Estado.
* Acciones.

## 7.4 Reglas

* No se permite eliminar países.
* Solo se permite activar o inactivar.
* Un país inactivo no debe aparecer en formularios de direcciones.
* Un país con departamentos activos debe advertir dependencias antes de ser inactivado.
* El país debe ser el primer nivel de la jerarquía geográfica.

---

# 8. Catálogo Departamentos

## 8.1 Objetivo

Administrar los departamentos asociados a cada país.

Este catálogo será utilizado en direcciones de clientes, tiendas, usuarios y cualquier módulo que requiera ubicación.

## 8.2 Campos mínimos

* Código del departamento.
* País.
* Nombre del departamento.
* Estado.
* Fecha de creación.
* Fecha de actualización.

## 8.3 Tabla de departamentos

La tabla debe mostrar:

* Código.
* Departamento.
* País.
* Estado.
* Acciones.

## 8.4 Reglas

* Todo departamento debe pertenecer a un país.
* No debe poder crearse un departamento sin país.
* No debe aparecer disponible si el país padre está inactivo.
* Si el departamento se inactiva, no debe mostrarse en formularios.
* Un departamento inactivo no debe permitir seleccionar sus municipios en formularios nuevos.
* No se permite eliminación definitiva.

---

# 9. Catálogo Municipios

## 9.1 Objetivo

Administrar los municipios asociados a cada departamento.

Este catálogo será utilizado en registros de direcciones dentro de todas las plataformas.

## 9.2 Campos mínimos

* Código del municipio.
* País.
* Departamento.
* Nombre del municipio.
* Estado.
* Fecha de creación.
* Fecha de actualización.

## 9.3 Tabla de municipios

La tabla debe mostrar:

* Código.
* Municipio.
* Departamento.
* País.
* Estado.
* Acciones.

## 9.4 Reglas

* Todo municipio debe pertenecer a un departamento.
* El departamento debe pertenecer a un país activo.
* No se debe permitir crear municipios sin departamento.
* No se debe mostrar un municipio si está inactivo.
* No se debe mostrar un municipio si su departamento está inactivo.
* No se permite eliminación definitiva.

---

# 10. Catálogo Zona

## 10.1 Objetivo

Administrar zonas, comunidades, colonias, residenciales, aldeas o lugares poblados asociados a un municipio.

Este catálogo será utilizado en cualquier pantalla donde se registre una dirección.

El sistema debe permitir que el usuario escriba en el campo de zona y reciba coincidencias parciales o exactas.

## 10.2 Nombre funcional recomendado

Aunque el menú puede mostrar **Zona**, internamente este catálogo puede manejarse como:

```text
Zonas / Comunidades
```

Esto permite cubrir tanto zonas municipales como colonias, comunidades, residenciales, aldeas u otros lugares poblados.

## 10.3 Campos mínimos

* Código de zona/comunidad.
* País.
* Departamento.
* Municipio.
* Nombre de zona/comunidad.
* Estado.
* Fecha de creación.
* Fecha de actualización.

## 10.4 Tabla de zonas

La tabla debe mostrar:

* Código.
* Zona / Comunidad.
* Municipio.
* Departamento.
* País.
* Estado.
* Acciones.

## 10.5 Reglas

* Toda zona debe pertenecer a un municipio.
* Toda zona debe respetar la jerarquía: País > Departamento > Municipio > Zona.
* Si el país, departamento o municipio padre está inactivo, la zona no debe mostrarse en formularios.
* La zona puede ser inactivada y reactivada.
* No se permite eliminación definitiva.
* Las zonas deben poder buscarse por coincidencia parcial y exacta.

## 10.6 Comportamiento en formularios de dirección

En cualquier pantalla donde se registre una dirección, el sistema debe permitir seleccionar:

1. País.
2. Departamento.
3. Municipio.
4. Zona / Comunidad.
5. Dirección exacta.

El campo de zona debe funcionar como autocompletado.

Ejemplo:

Si el usuario escribe:

```text
Naranjo
```

El sistema debe mostrar coincidencias relacionadas, como:

```text
El Naranjo
San José El Naranjo
Vistas del Naranjo
```

El resultado debe mostrar suficiente contexto para evitar confusión.

Formato sugerido:

```text
El Naranjo — Mixco, Guatemala
San José El Naranjo — Mixco, Guatemala
El Naranjo — San José Pinula, Guatemala
```

## 10.7 Coincidencias

El buscador de zona debe soportar:

* Coincidencia exacta.
* Coincidencia parcial.
* Coincidencia sin importar mayúsculas o minúsculas.
* Coincidencia con o sin tildes, cuando sea técnicamente viable.
* Búsqueda por nombre de zona.
* Búsqueda por municipio.
* Búsqueda por departamento.

---

# 11. Catálogo Tiendas

## 11.1 Objetivo

Administrar las tiendas disponibles para el sistema.

Este catálogo será utilizado para asignación de usuarios de tienda, registro de clientes, registro de compras, reportes, filtros y cualquier operación relacionada con tiendas físicas.

## 11.2 Nota importante

Si ya existe un módulo completo de tiendas dentro de Gestión Empresarial, este catálogo no debe duplicar información.

Debe existir una única fuente de datos para tiendas.

El acceso desde:

```text
Configuración > Catálogos > Tiendas
```

puede abrir la misma administración de tiendas o consumir el mismo maestro de tiendas.

## 11.3 Campos mínimos

* Código de tienda.
* Nombre de tienda.
* País.
* Departamento.
* Municipio.
* Zona.
* Dirección exacta.
* Tipo de tienda, si aplica.
* Estado.
* Fecha de creación.
* Fecha de actualización.

## 11.4 Tabla de tiendas

La tabla debe mostrar:

* Código.
* Tienda.
* Departamento.
* Municipio.
* Zona.
* Estado.
* Acciones.

## 11.5 Reglas

* No se permite eliminar tiendas.
* Una tienda inactiva no debe poder asignarse a nuevos usuarios.
* Una tienda inactiva no debe aparecer como opción en registros nuevos.
* Los usuarios ya asignados a una tienda inactiva deben conservar el historial, pero el sistema debe alertar al administrador.
* Las compras históricas no deben perder la referencia de tienda.
* Si se reactiva una tienda, debe volver a estar disponible para asignaciones y registros.

---

# 12. Catálogo Productos

## 12.1 Objetivo

Administrar los productos o familias principales de productos utilizados por el sistema.

Este catálogo servirá como base para clasificaciones comerciales, promociones, reportes, reglas de acumulación de puntos y segmentaciones.

## 12.2 Estructura padre-hijo

El catálogo de productos debe permitir manejar productos padre y catálogos hijos.

Ejemplo:

```text
Producto padre: Calzado
Catálogo hijo: Tipos de calzado
```

Si el producto seleccionado es **Calzado**, el sistema debe permitir administrar y seleccionar tipos de calzado asociados.

## 12.3 Campos mínimos del producto padre

* Código del producto.
* Nombre del producto.
* Descripción.
* Estado.
* Permite subcatálogo: Sí / No.
* Nombre del subcatálogo, si aplica.
* Fecha de creación.
* Fecha de actualización.

## 12.4 Tabla de productos

La tabla debe mostrar:

* Código.
* Producto.
* Descripción.
* Tiene subcatálogo.
* Estado.
* Acciones.

## 12.5 Reglas

* No se permite eliminar productos.
* Un producto inactivo no debe estar disponible para nuevas configuraciones.
* Si un producto tiene subcatálogos activos, el sistema debe advertir antes de inactivarlo.
* Si se inactiva un producto padre, sus hijos no deben aparecer disponibles en formularios nuevos.
* Si se reactiva el producto padre, sus hijos activos deben volver a estar disponibles.

---

# 13. Catálogo Tipos de Calzado

## 13.1 Objetivo

Administrar los tipos de calzado asociados al producto padre **Calzado**.

Este catálogo será utilizado para promociones, reglas de puntos, filtros, reportes y clasificaciones comerciales.

## 13.2 Ubicación

Debe aparecer como hijo de Productos.

Estructura:

```text
Configuración
└── Catálogos
    └── Productos
        └── Tipos de calzado
```

## 13.3 Campos mínimos

* Código del tipo de calzado.
* Producto padre.
* Nombre del tipo de calzado.
* Descripción.
* Estado.
* Fecha de creación.
* Fecha de actualización.

## 13.4 Ejemplos de tipos de calzado

* Tacones.
* Sandalias.
* Botas.
* Tenis.
* Flats.
* Mocasines.
* Plataformas.
* Zapato formal.
* Zapato casual.

## 13.5 Tabla de tipos de calzado

La tabla debe mostrar:

* Código.
* Tipo de calzado.
* Producto padre.
* Estado.
* Acciones.

## 13.6 Reglas

* Todo tipo de calzado debe pertenecer al producto padre **Calzado**.
* No debe poder existir un tipo de calzado sin producto padre.
* Si el producto padre Calzado está inactivo, los tipos de calzado no deben mostrarse en formularios.
* Si un tipo de calzado está inactivo, no debe aparecer en promociones ni registros nuevos.
* No se permite eliminación definitiva.

---

# 14. Uso transversal en las tres plataformas

## 14.1 Plataforma Web Administrador

La Web Administrador debe utilizar estos catálogos en:

* Creación y edición de clientes.
* Creación y edición de usuarios.
* Creación y edición de tiendas.
* Configuración de promociones.
* Configuración de reglas de puntos.
* Reportes.
* Filtros.
* Formularios de dirección.
* Formularios de productos o clasificaciones comerciales.

## 14.2 PWA Tienda

La PWA Tienda debe utilizar estos catálogos en:

* Registro de clientes desde tienda.
* Registro de compras.
* Consulta de cliente.
* Formularios donde se requiera dirección.
* Selección de producto o tipo de calzado, si aplica para promociones o puntos.
* Filtros disponibles para usuario de tienda, cuando aplique.

La PWA Tienda no debe mostrar registros inactivos.

## 14.3 PWA Cliente

La PWA Cliente debe utilizar estos catálogos en:

* Registro del cliente.
* Edición de perfil, si aplica.
* Dirección del cliente.
* Selección de país, departamento, municipio y zona.
* Visualización de promociones por categoría, si aplica.

La PWA Cliente no debe mostrar registros inactivos.

---

# 15. Autocompletado en direcciones

## 15.1 Objetivo

Facilitar el registro de direcciones evitando errores de escritura y permitiendo encontrar coincidencias parciales o exactas.

## 15.2 Campos con autocompletado

El autocompletado debe aplicarse principalmente en:

* Departamento.
* Municipio.
* Zona / Comunidad.

## 15.3 Comportamiento esperado

Cuando el usuario escriba dentro del campo, el sistema debe mostrar resultados relacionados.

Ejemplo:

Usuario escribe:

```text
Villa
```

El sistema puede mostrar:

```text
Villa Nueva — Guatemala
Villa Canales — Guatemala
Villa Hermosa — San Miguel Petapa, Guatemala
```

## 15.4 Reglas del autocompletado

* Debe mostrar solo registros activos.
* Debe respetar la jerarquía seleccionada.
* Si ya se seleccionó país, solo debe mostrar departamentos de ese país.
* Si ya se seleccionó departamento, solo debe mostrar municipios de ese departamento.
* Si ya se seleccionó municipio, solo debe mostrar zonas de ese municipio.
* Debe permitir coincidencias parciales.
* Debe ser rápido y usable en móvil.
* Debe evitar mostrar resultados duplicados sin contexto.

---

# 16. Jerarquía geográfica obligatoria

El sistema debe respetar la siguiente jerarquía:

```text
País
└── Departamento
    └── Municipio
        └── Zona / Comunidad
            └── Dirección exacta
```

Cada nivel depende del anterior.

No debe permitirse seleccionar una zona sin municipio, ni un municipio sin departamento, ni un departamento sin país.

---

# 17. Estados de registros

Todos los catálogos deben manejar estado.

Estados mínimos:

```text
Activo
Inactivo
```

## 17.1 Estado activo

Un registro activo:

* Puede seleccionarse.
* Puede aparecer en formularios.
* Puede aparecer en autocompletados.
* Puede usarse en nuevas operaciones.
* Puede usarse en configuraciones.

## 17.2 Estado inactivo

Un registro inactivo:

* No puede seleccionarse en formularios nuevos.
* No aparece en autocompletados.
* No aparece como opción en PWA Tienda.
* No aparece como opción en PWA Cliente.
* Se conserva para historial.
* Puede consultarse desde la Web Administrador.
* Puede reactivarse.

---

# 18. Reglas de historial

Cuando un registro de catálogo sea usado en una operación histórica, el sistema debe conservar la referencia.

Ejemplo:

Si una compra fue registrada con una tienda que luego se inactiva, la compra histórica debe seguir mostrando la tienda utilizada.

La inactivación no debe alterar información histórica.

---

# 19. Auditoría

Cada acción sobre catálogos debe registrar auditoría básica.

Datos mínimos:

* Usuario que creó el registro.
* Fecha y hora de creación.
* Usuario que modificó el registro.
* Fecha y hora de modificación.
* Usuario que inactivó el registro.
* Fecha y hora de inactivación.
* Usuario que reactivó el registro.
* Fecha y hora de reactivación.

---

# 20. Permisos

El acceso al módulo debe depender del rol del usuario.

## 20.1 Permisos sugeridos

* Ver catálogos.
* Crear registros de catálogo.
* Editar registros de catálogo.
* Inactivar registros de catálogo.
* Reactivar registros de catálogo.

## 20.2 Restricción

Usuarios sin permisos administrativos no deben poder modificar catálogos.

La PWA Tienda y la PWA Cliente solo deben consumir catálogos activos, no administrarlos.

---

# 21. Validaciones generales

El sistema debe validar:

* Campos obligatorios.
* Duplicidad por código.
* Duplicidad por nombre dentro del mismo padre.
* Estado del registro padre.
* Relaciones obligatorias.
* Formato de código.
* Longitud máxima de nombres.
* No permitir espacios vacíos como nombres.
* No permitir registros sin jerarquía cuando aplique.

---

# 22. Manejo de duplicados

El sistema debe evitar duplicados lógicos.

Ejemplo válido:

```text
El Naranjo — Mixco, Guatemala
El Naranjo — San José Pinula, Guatemala
```

Esto puede existir porque pertenece a municipios diferentes.

Ejemplo no válido:

```text
El Naranjo — Mixco, Guatemala
El Naranjo — Mixco, Guatemala
```

Esto no debe permitirse como duplicado dentro del mismo municipio, salvo que se defina una regla especial.

---

# 23. Experiencia de usuario

## 23.1 Vista de catálogo

Cada catálogo debe tener una vista limpia y consistente.

Elementos mínimos:

* Título del catálogo.
* Descripción breve.
* Botón Agregar registro.
* Buscador.
* Filtros.
* Tabla.
* Paginación.
* Estados visuales.
* Acciones por fila.

## 23.2 Estados visuales

Los registros activos e inactivos deben diferenciarse visualmente.

Ejemplo:

* Activo: badge verde.
* Inactivo: badge gris o rojo suave.

## 23.3 Confirmaciones

Toda inactivación o reactivación debe pedir confirmación.

## 23.4 Mensajes del sistema

Ejemplos:

```text
Registro creado correctamente.
Registro actualizado correctamente.
Registro inactivado correctamente.
Registro reactivado correctamente.
No es posible inactivar este registro porque tiene registros dependientes activos.
```

---

---

# 25. Requerimientos técnicos funcionales

## 25.1 API / Backend

El backend debe exponer servicios para:

* Listar catálogos.
* Consultar registros activos.
* Consultar registros inactivos.
* Crear registros.
* Editar registros.
* Inactivar registros.
* Reactivar registros.
* Buscar registros por coincidencia.
* Consultar jerarquías.
* Consultar catálogos por plataforma.

## 25.2 Consumo desde plataformas

Las tres plataformas deben consumir los catálogos desde la misma fuente de datos.

No debe existir lógica separada ni catálogos quemados en frontend.

## 25.3 Rendimiento

Los catálogos grandes, especialmente zonas/comunidades, deben soportar búsqueda eficiente.

El sistema no debe cargar miles de registros completos en el frontend si no es necesario.

Debe usar búsqueda bajo demanda para autocompletado.

## 25.4 Respuesta sugerida para autocompletado

Cada resultado de zona debe devolver:

* ID.
* Código.
* Nombre.
* Municipio.
* Departamento.
* País.
* Estado.

Ejemplo:

```json
{
  "id": 123,
  "codigo": "0103042",
  "nombre": "El Naranjo",
  "municipio": "San José Pinula",
  "departamento": "Guatemala",
  "pais": "Guatemala",
  "estado": "Activo"
}
```

---

# 26. Modelo de datos sugerido

## 26.1 País

```text
pais
- id
- codigo
- nombre
- estado
- created_at
- updated_at
- created_by
- updated_by
```

## 26.2 Departamento

```text
departamento
- id
- pais_id
- codigo
- nombre
- estado
- created_at
- updated_at
- created_by
- updated_by
```

## 26.3 Municipio

```text
municipio
- id
- departamento_id
- codigo
- nombre
- estado
- created_at
- updated_at
- created_by
- updated_by
```

## 26.4 Zona / Comunidad

```text
zona
- id
- municipio_id
- codigo
- nombre
- estado
- created_at
- updated_at
- created_by
- updated_by
```

## 26.5 Producto

```text
producto
- id
- codigo
- nombre
- descripcion
- permite_subcatalogo
- nombre_subcatalogo
- estado
- created_at
- updated_at
- created_by
- updated_by
```

## 26.6 Tipo de calzado

```text
tipo_calzado
- id
- producto_id
- codigo
- nombre
- descripcion
- estado
- created_at
- updated_at
- created_by
- updated_by
```

---

# 27. Criterios de aceptación

## 27.1 Menú

* El menú lateral muestra la sección Configuración.
* Dentro de Configuración aparece Catálogos.
* Dentro de Catálogos aparecen los catálogos configurados.
* Productos puede tener catálogos hijos como Tipos de calzado.

## 27.2 CRUD sin eliminación

* El usuario puede crear registros.
* El usuario puede editar registros.
* El usuario puede ver registros.
* El usuario puede inactivar registros.
* El usuario puede reactivar registros.
* El usuario no puede eliminar registros.

## 27.3 Estados

* Un registro activo aparece en formularios.
* Un registro inactivo no aparece en formularios.
* Un registro inactivo sigue visible en la administración.
* Un registro reactivado vuelve a aparecer donde corresponde.

## 27.4 Dirección

* El sistema permite seleccionar país, departamento, municipio y zona.
* El campo de zona permite escribir y muestra coincidencias.
* Las coincidencias pueden ser parciales o exactas.
* Solo aparecen registros activos.
* Los resultados muestran contexto suficiente para distinguir ubicaciones repetidas.

## 27.5 Productos

* Existe catálogo de productos.
* El producto Calzado puede tener como hijo Tipos de calzado.
* Los tipos de calzado dependen del producto padre.
* Si Calzado está inactivo, sus tipos no aparecen disponibles.
* Si un tipo de calzado está inactivo, no aparece en promociones ni formularios nuevos.

## 27.6 Integración

* Web Administrador consume catálogos activos.
* PWA Tienda consume catálogos activos.
* PWA Cliente consume catálogos activos.
* Los registros inactivos no aparecen en las plataformas operativas.
* Los registros históricos conservan la información utilizada originalmente.

---

# 28. Fuera de alcance inicial

Para esta primera versión del módulo no se contempla:

* Eliminación definitiva de registros.
* Administración de catálogos desde PWA Tienda.
* Administración de catálogos desde PWA Cliente.
* Carga masiva avanzada, salvo que se defina como requerimiento adicional.
* Edición directa de datos históricos donde ya se usó un catálogo.
* Traducciones multidioma.

---

# 29. Consideraciones adicionales

El catálogo de zonas/comunidades puede ser grande, por lo que debe diseñarse pensando en rendimiento.

Se recomienda que el sistema tenga una funcionalidad futura de importación masiva para cargar zonas, municipios y comunidades desde archivos estructurados.

También se recomienda que cada catálogo permita exportar datos en XLSX para revisión administrativa, aunque esto puede manejarse como mejora posterior si no entra en la primera fase.

---

# 30. Resultado esperado

Al finalizar este módulo, el sistema deberá contar con una administración centralizada de catálogos que permita mantener información limpia, controlada y reutilizable en las tres plataformas.

La administración debe ser flexible para crecer con nuevos catálogos y suficientemente estricta para evitar duplicados, eliminaciones incorrectas o registros inconsistentes.

El principio general del módulo será:

```text
Todo catálogo se administra desde Web Administrador.
Todas las plataformas consumen únicamente registros activos.
Nada se elimina, solo se inactiva.
Todo registro puede reactivarse si vuelve a ser necesario.
```
