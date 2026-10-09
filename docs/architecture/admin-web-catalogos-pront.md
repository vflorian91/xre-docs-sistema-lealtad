Actúa como desarrollador senior full-stack. Necesito que analices primero todo el repositorio del proyecto `sistema-lealtad` antes de modificar código. Identifica la arquitectura actual, rutas, componentes, estilos, modelos, servicios, estructura de base de datos y convenciones existentes. No rompas funcionalidades existentes.

Quiero que implementes el **Módulo de Catálogos** para la plataforma Web Administrador del sistema de lealtad.

## Objetivo general

Crear un módulo administrativo centralizado para manejar los catálogos maestros utilizados por las tres plataformas del sistema:

1. Web Administrador.
2. PWA Tienda.
3. PWA Cliente.

Los catálogos deben ser administrados únicamente desde la Web Administrador, pero deben ser consumidos por las tres plataformas únicamente cuando los registros estén activos.

## Ubicación en menú lateral

Agregar el módulo dentro del menú lateral bajo la sección:

Configuración
└── Catálogos
    ├── País
    ├── Departamentos
    ├── Municipios
    ├── Zona
    ├── Tiendas
    └── Productos
        └── Tipos de calzado

No implementar lógica dinámica para catálogos futuros. Solo implementar los catálogos descritos en este prompt.

## Reglas generales del módulo

Todos los catálogos deben permitir:

* Ver listado de registros.
* Buscar registros.
* Filtrar registros.
* Agregar registro.
* Ver detalle de registro.
* Editar registro.
* Inactivar registro.
* Reactivar registro.

No debe existir eliminación definitiva de registros.

Ningún registro puede ser eliminado de la base de datos. En lugar de eliminar, debe manejarse por estado:

* Activo.
* Inactivo.

Cuando un registro esté inactivo:

* No debe aparecer en formularios.
* No debe aparecer en autocompletados.
* No debe aparecer en selectores.
* No debe estar disponible en Web Administrador, PWA Tienda ni PWA Cliente para registros nuevos.
* Debe seguir visible únicamente en el módulo administrativo de catálogos.
* Debe poder reactivarse.
* Al reactivarse, debe volver a estar disponible automáticamente donde corresponda.

Los registros históricos que ya usaron un catálogo no deben perder la referencia aunque el catálogo sea inactivado.

## Permisos

Solo usuarios administrativos con permisos de configuración deben poder crear, editar, inactivar o reactivar catálogos.

La PWA Tienda y la PWA Cliente solo deben consumir registros activos. No deben poder administrar catálogos.

## Catálogo País

Crear vista para administrar países.

Campos mínimos:

* Código.
* Nombre del país.
* Estado.
* Fecha de creación.
* Fecha de actualización.

Tabla:

* Código.
* País.
* Estado.
* Acciones: Ver, Editar, Inactivar/Reactivar.

Reglas:

* No permitir eliminar.
* Un país inactivo no debe aparecer en formularios de dirección.
* Si tiene departamentos activos, mostrar advertencia antes de inactivar.

## Catálogo Departamentos

Crear vista para administrar departamentos.

Campos mínimos:

* Código.
* País.
* Nombre del departamento.
* Estado.
* Fecha de creación.
* Fecha de actualización.

Tabla:

* Código.
* Departamento.
* País.
* Estado.
* Acciones.

Reglas:

* Todo departamento debe pertenecer a un país.
* No se puede crear un departamento sin país.
* No mostrar departamentos cuyo país esté inactivo.
* Si un departamento se inactiva, sus municipios no deben estar disponibles en formularios nuevos.
* No permitir eliminar.

## Catálogo Municipios

Crear vista para administrar municipios.

Campos mínimos:

* Código.
* País.
* Departamento.
* Nombre del municipio.
* Estado.
* Fecha de creación.
* Fecha de actualización.

Tabla:

* Código.
* Municipio.
* Departamento.
* País.
* Estado.
* Acciones.

Reglas:

* Todo municipio debe pertenecer a un departamento.
* El departamento debe pertenecer a un país activo.
* No se puede crear municipio sin departamento.
* No mostrar municipios inactivos.
* No mostrar municipios cuyo departamento o país estén inactivos.
* No permitir eliminar.

## Catálogo Zona

Crear vista para administrar zonas, comunidades, colonias, residenciales, aldeas o lugares poblados.

Aunque el menú debe mostrar “Zona”, internamente puede manejarse como “Zona / Comunidad”.

Campos mínimos:

* Código.
* País.
* Departamento.
* Municipio.
* Nombre de zona/comunidad.
* Estado.
* Fecha de creación.
* Fecha de actualización.

Tabla:

* Código.
* Zona / Comunidad.
* Municipio.
* Departamento.
* País.
* Estado.
* Acciones.

Reglas:

* Toda zona debe pertenecer a un municipio.
* Respetar jerarquía: País > Departamento > Municipio > Zona.
* Si país, departamento o municipio padre está inactivo, la zona no debe aparecer en formularios.
* La zona puede ser inactivada y reactivada.
* No permitir eliminar.

## Uso de zonas en direcciones

En cualquier pantalla donde se registre dirección, debe poder utilizarse la jerarquía:

País
└── Departamento
    └── Municipio
        └── Zona / Comunidad
            └── Dirección exacta

El usuario debe poder escribir en los campos de dirección y recibir coincidencias parciales o exactas, especialmente en zona/comunidad.

El autocompletado debe:

* Mostrar solo registros activos.
* Respetar la jerarquía seleccionada.
* Permitir coincidencias parciales.
* Permitir coincidencias exactas.
* Ignorar mayúsculas y minúsculas.
* Ignorar tildes si técnicamente es viable.
* Mostrar contexto suficiente para evitar confusión.

Ejemplo:

Si el usuario escribe “Naranjo”, mostrar resultados como:

* El Naranjo — San José Pinula, Guatemala.
* San José El Naranjo — Mixco, Guatemala.
* Vistas del Naranjo — Mixco, Guatemala.

No mostrar resultados inactivos.

## Catálogo Tiendas

Crear o conectar la vista de catálogo de tiendas con el maestro de tiendas existente.

Importante: si ya existe un módulo completo de tiendas en el sistema, no duplicar la información. Debe existir una sola fuente de datos.

El acceso desde:

Configuración > Catálogos > Tiendas

puede abrir la misma administración de tiendas o consumir el mismo modelo/servicio existente.

Campos mínimos:

* Código de tienda.
* Nombre de tienda.
* País.
* Departamento.
* Municipio.
* Zona.
* Dirección exacta.
* Estado.
* Fecha de creación.
* Fecha de actualización.

Tabla:

* Código.
* Tienda.
* Departamento.
* Municipio.
* Zona.
* Estado.
* Acciones.

Reglas:

* No permitir eliminar tiendas.
* Una tienda inactiva no debe asignarse a nuevos usuarios.
* Una tienda inactiva no debe aparecer en registros nuevos.
* Las compras históricas deben conservar la tienda usada.
* Si se reactiva una tienda, vuelve a estar disponible.

## Catálogo Productos

Crear vista para administrar productos o familias principales de productos.

Este catálogo será usado para promociones, reglas de puntos, reportes y clasificaciones comerciales.

Campos mínimos:

* Código.
* Nombre del producto.
* Descripción.
* Estado.
* Permite subcatálogo: Sí/No.
* Fecha de creación.
* Fecha de actualización.

Tabla:

* Código.
* Producto.
* Descripción.
* Tiene subcatálogo.
* Estado.
* Acciones.

Reglas:

* No permitir eliminar.
* Un producto inactivo no debe estar disponible para nuevas configuraciones.
* Si un producto padre tiene hijos activos, mostrar advertencia antes de inactivarlo.
* Si se inactiva un producto padre, sus hijos no deben aparecer disponibles en formularios nuevos.

## Catálogo Tipos de Calzado

Crear submódulo hijo dentro de Productos.

Ubicación:

Configuración
└── Catálogos
    └── Productos
        └── Tipos de calzado

Campos mínimos:

* Código.
* Producto padre.
* Nombre del tipo de calzado.
* Descripción.
* Estado.
* Fecha de creación.
* Fecha de actualización.

Ejemplos iniciales sugeridos:

* Tacones.
* Sandalias.
* Botas.
* Tenis.
* Flats.
* Mocasines.
* Plataformas.
* Zapato formal.
* Zapato casual.

Tabla:

* Código.
* Tipo de calzado.
* Producto padre.
* Estado.
* Acciones.

Reglas:

* Todo tipo de calzado debe pertenecer al producto padre Calzado.
* No debe existir tipo de calzado sin producto padre.
* Si el producto padre Calzado está inactivo, sus tipos no deben aparecer disponibles.
* Si un tipo de calzado está inactivo, no debe aparecer en promociones ni registros nuevos.
* No permitir eliminar.

## UX/UI requerida

Todas las vistas de catálogo deben mantener el diseño visual actual del sistema.

Cada vista debe tener:

* Título del catálogo.
* Descripción corta.
* Botón “+ Agregar registro”.
* Buscador.
* Filtros.
* Tabla.
* Paginación.
* Badges visuales de estado.
* Acciones por fila.

Estados visuales:

* Activo: badge verde.
* Inactivo: badge gris o rojo suave.

Todas las acciones de inactivar/reactivar deben pedir confirmación.

Mensajes esperados:

* Registro creado correctamente.
* Registro actualizado correctamente.
* Registro inactivado correctamente.
* Registro reactivado correctamente.
* No es posible inactivar este registro porque tiene dependencias activas.

## Validaciones generales

Validar:

* Campos obligatorios.
* Código único.
* Nombre obligatorio.
* Duplicidad lógica.
* Relación padre obligatoria cuando aplique.
* Estado del registro padre.
* No permitir espacios vacíos como nombre.
* No permitir registros hijos si el padre está inactivo.

Duplicados válidos:

Puede existir “El Naranjo” en municipios diferentes.

Duplicado inválido:

No debe existir dos veces “El Naranjo” dentro del mismo municipio.

## Auditoría

Registrar como mínimo:

* Usuario que creó.
* Fecha de creación.
* Usuario que modificó.
* Fecha de modificación.
* Usuario que inactivó.
* Fecha de inactivación.
* Usuario que reactivó.
* Fecha de reactivación.

Si el sistema ya tiene auditoría, usar la lógica existente.

## Backend/API

Crear o ajustar endpoints/servicios para:

* Listar registros.
* Buscar registros.
* Crear registros.
* Ver detalle.
* Editar registros.
* Inactivar registros.
* Reactivar registros.
* Consultar solo activos para formularios.
* Consultar jerarquía geográfica.
* Autocompletar zonas/comunidades.

La respuesta del autocompletado de zona debe incluir suficiente contexto:

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

## Base de datos sugerida

Ajustar al ORM o estructura actual del proyecto.

Modelo sugerido para país:

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

Modelo sugerido para departamento:

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

Modelo sugerido para municipio:

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

Modelo sugerido para zona:

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

Modelo sugerido para producto:

```text
producto
- id
- codigo
- nombre
- descripcion
- permite_subcatalogo
- estado
- created_at
- updated_at
- created_by
- updated_by
```

Modelo sugerido para tipo_calzado:

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

## Data inicial

Crear seed inicial para:

* País Guatemala.
* Producto padre Calzado.
* Tipos de calzado básicos.

Si se proporciona archivo con zonas/comunidades, preparar importación inicial respetando estructura similar a:

```js
{
  codigo: '0103042',
  pais_id: 1,
  departamento: 'Guatemala',
  municipio: 'San José Pinula',
  comunidad: 'El Naranjo'
}
```

Esta data debe mapearse a:

* País.
* Departamento.
* Municipio.
* Zona / Comunidad.

Evitar duplicados durante la carga.

## Criterios de aceptación

1. El menú lateral muestra Configuración > Catálogos.
2. Dentro de Catálogos aparecen País, Departamentos, Municipios, Zona, Tiendas y Productos.
3. Dentro de Productos aparece Tipos de calzado.
4. Cada catálogo tiene tabla propia.
5. Cada catálogo permite crear, ver, editar, inactivar y reactivar.
6. No existe botón ni acción de eliminar.
7. Los registros inactivos no aparecen en formularios ni autocompletados.
8. Los registros inactivos sí aparecen en administración.
9. Los registros reactivados vuelven a estar disponibles.
10. País, Departamento, Municipio y Zona funcionan como jerarquía de dirección.
11. El campo Zona permite búsqueda por coincidencias parciales o exactas.
12. Productos permite manejar Calzado como padre.
13. Tipos de calzado depende de Calzado.
14. PWA Tienda y PWA Cliente solo consumen registros activos.
15. Los registros históricos conservan referencias aunque el catálogo sea inactivado.
16. No se implementa lógica genérica ni dinámica para catálogos futuros.

## Instrucciones finales

Antes de modificar:

1. Analiza el proyecto completo.
2. Detecta el stack real utilizado.
3. Reutiliza componentes existentes.
4. Reutiliza estilos existentes.
5. Reutiliza patrones actuales de rutas, tablas, formularios y servicios.
6. No dupliques el módulo de tiendas si ya existe.
7. No rompas funcionalidades actuales.
8. Implementa migraciones o modelos según corresponda.
9. Implementa seeds básicos.
10. Deja el código ordenado, consistente y funcional.

Al finalizar, entrega resumen de:

* Archivos creados.
* Archivos modificados.
* Modelos/tablas agregadas.
* Rutas agregadas.
* Endpoints agregados.
* Seeds agregados.
* Cómo probar el módulo.
