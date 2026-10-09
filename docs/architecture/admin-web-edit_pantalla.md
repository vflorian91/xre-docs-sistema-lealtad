Necesito que ajustes el módulo de Usuarios en la plataforma web de administración del sistema de lealtad.

Objetivo principal:
La pantalla de **Crear usuario** debe quedar igual a la pantalla de **Editar usuario**, tanto en diseño visual como en estructura de campos, distribución, estilos, tamaños, botones, cards, secciones y lógica de formulario.

Cambios requeridos:

1. Igualar Crear Usuario con Editar Usuario

* La pantalla de Crear usuario debe utilizar los mismos campos que actualmente tiene la pantalla de Editar usuario.
* Debe conservar el mismo diseño, orden visual, espaciado, estilos, componentes, botones, encabezados y distribución.
* No debe verse como una pantalla diferente.
* Ambas pantallas deben mantener una experiencia consistente.

2. Campos que deben existir en Crear Usuario y Editar Usuario
   Ambas pantallas deben contener los siguientes campos:

* Nombre completo
* Correo electrónico
* Rol
* Tienda asignada
* Estado del usuario / checkbox de inactivar
* Contraseña temporal o generación de contraseña temporal, según la lógica actual
* Cambio obligatorio de contraseña
* País
* Departamento
* Municipio
* Zona

3. Agregar campos de ubicación
   Agregar en ambas pantallas los campos:

* País
* Departamento
* Municipio
* Zona

Estos campos deben alimentarse desde los catálogos existentes del sistema.

Lógica esperada:

* El campo País debe mostrar únicamente países activos del catálogo de País.
* El campo Departamento debe depender del país seleccionado y mostrar únicamente departamentos activos relacionados con ese país.
* El campo Municipio debe depender del departamento seleccionado y mostrar únicamente municipios activos relacionados con ese departamento.
* El campo Zona debe depender del municipio seleccionado y mostrar únicamente zonas activas relacionadas con ese municipio.
* Si el usuario cambia el país, deben limpiarse departamento, municipio y zona.
* Si el usuario cambia el departamento, deben limpiarse municipio y zona.
* Si el usuario cambia el municipio, debe limpiarse zona.
* No deben mostrarse registros inactivos.
* Los selectores deben permitir búsqueda para facilitar al usuario encontrar país, departamento, municipio y zona.
* La búsqueda debe funcionar por coincidencia parcial del texto.
* Si no existen datos relacionados, mostrar un mensaje claro como “No hay registros disponibles”.

4. Quitar permisos de Crear Usuario
   Actualmente la pantalla de Crear usuario no debe mostrar configuración de permisos.

Eliminar de la pantalla Crear usuario cualquier sección, card, tabla, pestaña, checkbox o componente relacionado con permisos.

La lógica correcta es:

* Los permisos no se configuran al crear usuario.
* Los permisos solo deben visualizarse y administrarse desde la pantalla **Ver perfil del usuario**.
* No mover permisos a Editar usuario.
* No duplicar permisos en Crear usuario ni Editar usuario.

5. Pantalla Ver Perfil del Usuario
   Asegúrate de que la pantalla Ver perfil del usuario conserve la lógica de permisos.
   Los permisos deben permanecer únicamente allí, organizados como ya está definido para el perfil del usuario.

6. Validaciones esperadas

* Nombre completo obligatorio.
* Correo electrónico obligatorio y con formato válido.
* Rol obligatorio.
* Tienda asignada obligatoria cuando el rol lo requiera.
* País obligatorio si el modelo de usuario requiere ubicación.
* Departamento obligatorio si se selecciona país.
* Municipio obligatorio si se selecciona departamento.
* Zona obligatoria si se selecciona municipio.
* No permitir guardar si hay una combinación inválida, por ejemplo: municipio que no pertenece al departamento seleccionado.
* No permitir guardar zona que no pertenece al municipio seleccionado.

7. Persistencia de datos
   Al guardar un usuario, se deben guardar correctamente las referencias de:

* paisId
* departamentoId
* municipioId
* zonaId

No guardar solo texto plano si el sistema ya trabaja con relaciones por ID.

8. Diseño y experiencia visual

* Mantener diseño compacto.
* Evitar botones grandes o robustos.
* Usar los mismos estilos actuales de Editar usuario.
* Títulos en negrita únicamente donde corresponda.
* Mantener consistencia con el diseño general del sistema.
* Los campos de ubicación deben integrarse de forma ordenada, preferiblemente en una sección llamada “Ubicación” o dentro de la sección de datos del usuario si visualmente queda mejor.
* No duplicar información.
* No agregar secciones innecesarias.

9. Consideraciones técnicas

* Reutilizar componentes existentes si ya existen selectores de catálogo.
* No romper la funcionalidad actual de Editar usuario.
* No afectar la pantalla Ver perfil del usuario.
* No eliminar datos existentes.
* Mantener compatibilidad con la estructura actual del proyecto.
* Revisar rutas, estados, formularios, validaciones y llamadas al backend necesarias.
* Si hay servicios o APIs existentes para catálogos, reutilizarlos.
* Si no existen, crear la lógica mínima necesaria siguiendo el patrón actual del proyecto.

Resultado esperado:

* Crear Usuario y Editar Usuario deben tener el mismo diseño y los mismos campos.
* Ambas pantallas deben incluir País, Departamento, Municipio y Zona con lógica dependiente desde catálogos activos.
* Crear Usuario ya no debe mostrar permisos.
* Los permisos deben quedar únicamente en Ver Perfil del Usuario.
* El formulario debe guardar correctamente la ubicación del usuario mediante relaciones por ID.
* La experiencia debe ser limpia, compacta, consistente y alineada con el diseño actual del sistema de lealtad.
