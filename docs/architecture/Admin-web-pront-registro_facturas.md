Necesito que implementes el módulo **Registro de Facturas** dentro del sistema de lealtad, respetando la arquitectura, estilos, componentes y patrones ya existentes en el proyecto.

Antes de modificar, revisa la estructura actual del proyecto, especialmente:

* Menú lateral / sidebar.
* Módulos existentes.
* Lógica de tablas.
* Lógica de paginación real.
* Lógica de filtros y búsquedas.
* Lógica de catálogos.
* Lógica de clientes.
* Lógica de promociones.
* Lógica de puntos.
* Manejo de usuarios autenticados.
* Asignación de tienda al usuario.
* Roles y permisos.
* Validaciones y estilos actuales.

No debes romper funcionalidades existentes.

---

# Objetivo del módulo

Crear el módulo **Registro de Facturas**, que será utilizado por usuarios de tienda para registrar facturas de compra y acreditar puntos automáticamente al cliente correspondiente.

El módulo también debe funcionar como histórico operativo de facturas registradas por la tienda asignada al usuario.

---

# Ubicación en el menú lateral

El módulo debe quedar ubicado en el menú lateral bajo el título:

**Tienda**

Dentro de esa sección debe aparecer la opción:

**Registro de Facturas**

Flujo esperado:

1. El usuario inicia sesión.
2. Presiona el menú de hamburguesas.
3. Busca la sección **Tienda**.
4. Selecciona **Registro de Facturas**.
5. El sistema muestra la pantalla del módulo.
6. El usuario registra facturas y consulta el histórico de su tienda asignada.

---

# Pantalla del módulo

La pantalla debe estar dividida en dos secciones principales:

1. Formulario de registro de factura.
2. Tabla histórica de facturas registradas.

La pantalla debe ser limpia, compacta, funcional y consistente con el diseño actual del sistema.

---

# Formulario de registro de factura

Crear un formulario con los siguientes campos:

## 1. No. de factura

Campo obligatorio.

Validaciones:

* No puede estar vacío.
* No puede repetirse.
* Una factura solo puede generar puntos una vez.
* Si ya existe, mostrar mensaje claro y bloquear el registro.

Mensaje sugerido:

**Esta factura ya fue registrada anteriormente y no puede volver a generar puntos.**

Importante:

La validación de factura única no debe ser solo visual. Debe validarse en la capa de datos, servicio, API o backend correspondiente, según la arquitectura actual del proyecto.

---

## 2. NIT del cliente

Campo obligatorio.

Debe servir para localizar al cliente al que se le acreditarán los puntos.

Comportamiento esperado:

* Al ingresar el NIT, buscar el cliente relacionado.
* Si existe, mostrar una confirmación visual con:

  * Nombre del cliente.
  * Código del cliente.
  * Nivel actual.
  * Estado del cliente.
* Si no existe, bloquear el registro.

Mensaje sugerido:

**No se encontró un cliente registrado con este NIT. Verifique la información o registre primero al cliente.**

Si el cliente existe pero está inactivo, bloquear el registro.

Mensaje sugerido:

**El cliente se encuentra inactivo y no puede acumular puntos.**

El sistema no debe permitir registrar puntos a clientes inexistentes o inactivos.

---

## 3. Monto de factura

Campo obligatorio.

Validaciones:

* Solo valores numéricos.
* Debe ser mayor a cero.
* No permitir valores negativos.
* No permitir caracteres inválidos.
* Mostrar en formato de moneda, preferiblemente quetzales.

Ejemplo:

**Q 1,250.00**

Este monto será utilizado para calcular los puntos del cliente según la lógica de promociones vigente.

---

## 4. Tipo de calzado

Campo obligatorio tipo select/desplegable.

Debe conectarse a un catálogo llamado:

**Tipo de Calzado**

Valores iniciales del catálogo:

* Casual.
* Formal.
* Deportivo.

El catálogo debe seguir la misma lógica de los catálogos actuales del sistema:

* Crear registro.
* Editar registro.
* Ver registro.
* Inactivar registro.
* Reactivar registro.
* No eliminar registros.
* Los registros inactivos no deben aparecer en el formulario.
* Los registros reactivados deben volver a mostrarse.
* Este catálogo debe quedar disponible para promociones, reportes y cualquier otro módulo que lo necesite.

No crear una lógica distinta si ya existe una estructura de catálogos reutilizable. Usar el patrón actual del proyecto.

Si se requiere seed o datos iniciales, crear los registros iniciales respetando la estructura actual del sistema.

---

# Botón principal

Agregar botón:

**Registrar factura**

Comportamiento:

* Validar todos los campos.
* Bloquear doble envío mientras se procesa.
* Registrar la factura.
* Calcular puntos.
* Acreditar puntos al cliente.
* Crear movimiento en historial de puntos.
* Mostrar mensaje de éxito.
* Limpiar formulario.
* Actualizar la tabla histórica.

Mensaje sugerido:

**Factura registrada correctamente. Se acreditaron X puntos al cliente.**

---

# Datos automáticos que debe guardar el sistema

Además de los campos ingresados manualmente, el sistema debe registrar automáticamente:

* Fecha y hora del registro.
* Usuario que registró la factura.
* Tienda asignada al usuario.
* Cliente asociado.
* NIT usado para la búsqueda.
* Monto de factura.
* Tipo de calzado.
* Puntos generados.
* Promoción aplicada.
* Estado del registro.
* Identificador del movimiento de puntos.

La tienda no debe seleccionarse manualmente en esta pantalla.

La tienda debe obtenerse desde el usuario autenticado.

Si el usuario no tiene tienda asignada, bloquear el registro.

Mensaje sugerido:

**El usuario no tiene una tienda asignada. Comuníquese con el administrador.**

---

# Lógica de puntos

Al registrar una factura válida, el sistema debe calcular automáticamente los puntos del cliente.

Debe usar la lógica de promociones existente.

El cálculo debe considerar, si ya existe en la lógica actual:

* Monto de factura.
* Tipo de calzado.
* Tienda.
* Fecha de registro.
* Promoción vigente.
* Nivel del cliente.
* Reglas activas.
* Prioridad de promociones.

Si existe una promoción vigente aplicable, usar esa promoción.

Si no existe promoción especial aplicable, usar la regla general de acumulación configurada en el sistema.

Guardar en el registro cuál promoción fue aplicada.

También debe crear un movimiento en el historial de puntos del cliente.

---

# Histórico de facturas registradas por tienda

La pantalla de **Registro de Facturas** debe incluir una tabla igual a la lógica visual y funcional de los demás módulos del sistema.

Esta tabla funcionará como histórico de facturas registradas.

## Regla principal de visualización

El usuario solo debe poder ver las facturas registradas en la tienda que tiene asignada.

No debe poder ver registros de otras tiendas.

La tienda debe tomarse automáticamente desde el usuario autenticado.

Ejemplo:

* Si el usuario tiene asignada la tienda **Oakland**, solo debe ver facturas registradas en **Oakland**.
* Si el usuario tiene asignada la tienda **Miraflores**, solo debe ver facturas registradas en **Miraflores**.
* Un usuario de tienda no debe poder consultar, filtrar ni acceder a registros de otra tienda.

Los administradores o roles superiores sí podrán ver registros de todas las tiendas únicamente si el sistema de permisos actual lo permite.

---

# Tabla histórica

Debajo del formulario de registro debe mostrarse una tabla con el histórico de facturas de la tienda asignada al usuario.

La tabla debe seguir el mismo diseño, comportamiento y componentes que las demás tablas del sistema.

## Columnas requeridas

* No. de factura.
* Cliente.
* NIT.
* Monto.
* Tipo de calzado.
* Puntos generados.
* Promoción aplicada.
* Fecha de registro.
* Usuario que registró.
* Estado.
* Acciones.

## Acciones

### Ver

Permite visualizar el detalle completo de la factura registrada.

El detalle debe ser solo lectura.

No debe permitir editar información crítica de la factura.

### Anular

Solo debe mostrarse si el usuario tiene permiso para anular registros.

La anulación no debe eliminar la factura.

Debe cambiar el estado a:

**Anulada**

Debe pedir motivo obligatorio.

Motivos sugeridos:

* Error en número de factura.
* Error en monto.
* Cliente incorrecto.
* Factura anulada en caja.
* Otro motivo.

Al anular, el sistema debe revertir los puntos generados por esa factura.

Debe guardar:

* Usuario que anuló.
* Fecha y hora de anulación.
* Motivo.
* Puntos descontados.
* Estado final.

Si no existe aún una base sólida para permisos o anulación, deja preparada la estructura visual o técnica, pero no habilites una acción insegura.

---

# Paginación real

La tabla debe tener paginación real, igual que los demás módulos del sistema.

No debe cargar todos los registros en frontend para paginarlos visualmente.

La paginación debe resolverse desde la consulta, API, servicio o capa de datos correspondiente.

Debe contemplar:

* Página actual.
* Cantidad de registros por página.
* Total de registros.
* Total de páginas.
* Cambio de página.
* Cambio de cantidad de registros por página, si el patrón actual del sistema lo permite.
* Estado de carga.
* Estado vacío.
* Manejo de error.

---

# Filtros y búsqueda

Si los demás módulos ya tienen filtros o búsqueda en tablas, aplicar la misma lógica visual y técnica.

Filtros sugeridos:

* Búsqueda por No. de factura.
* Búsqueda por cliente.
* Búsqueda por NIT.
* Filtro por estado.
* Filtro por tipo de calzado.
* Filtro por rango de fechas.

Todos los filtros deben respetar la tienda asignada al usuario.

Aunque el usuario busque una factura existente en otra tienda, el sistema no debe mostrarla si no pertenece a su tienda asignada.

---

# Seguridad de acceso a registros

La restricción por tienda no debe aplicarse solo visualmente.

Debe validarse también desde la consulta, API, servicio o lógica de datos.

Un usuario de tienda no debe poder acceder a registros de otra tienda aunque intente manipular la URL, los parámetros o la petición.

La validación debe hacerse por backend, servicio o capa de datos correspondiente, según la arquitectura actual del proyecto.

---

# Estados del registro

Implementar o preparar estos estados:

## Registrada

Estado asignado cuando la factura fue guardada correctamente y los puntos fueron acreditados al cliente.

## Anulada

Estado asignado cuando un usuario con permisos anula el registro.

Una factura anulada no debe contar como acumulación válida de puntos.

## Rechazada

Estado opcional para intentos que no pasaron validaciones críticas, solo si el proyecto almacena intentos fallidos.

No eliminar facturas físicamente de la base de datos.

---

# Validaciones obligatorias

El módulo debe validar:

1. No. de factura obligatorio.
2. No. de factura único.
3. NIT obligatorio.
4. Cliente existente.
5. Cliente activo.
6. Monto obligatorio.
7. Monto mayor a cero.
8. Tipo de calzado obligatorio.
9. Tipo de calzado activo.
10. Usuario autenticado válido.
11. Usuario con tienda asignada.
12. Promoción o regla general disponible para calcular puntos.
13. Evitar doble submit.
14. Evitar que una factura genere puntos más de una vez.
15. Evitar que un usuario de tienda vea registros de otra tienda.
16. Evitar que filtros o búsquedas devuelvan registros de otra tienda.
17. Evitar acceso directo por URL o parámetros a registros de otra tienda.

---

# Diseño y UX

La pantalla debe seguir el estilo visual actual del sistema.

Requerimientos visuales:

* Diseño limpio.
* Compacto.
* Campos no robustos.
* Botones compactos.
* Textos en negrita únicamente para títulos o encabezados.
* Formulario en una tarjeta superior.
* Tabla debajo del formulario.
* Botón principal alineado a la derecha.
* Mensajes de validación claros.
* Confirmación visual cuando se encuentra el cliente.
* Estados de carga.
* Estados vacíos.
* Estados de error.
* Responsive para desktop, tablet y móvil.

No sobrecargar la pantalla.

La tabla debe verse igual que las tablas de los demás módulos.

---

# Permisos

Respetar el sistema de roles/permisos actual.

## Usuario de tienda

Puede:

* Registrar facturas.
* Ver facturas de su tienda asignada.
* Ver detalle de sus registros.

No puede:

* Eliminar facturas.
* Editar facturas registradas.
* Ver facturas de otras tiendas.
* Anular registros sin permiso especial.
* Manipular puntos manualmente.

## Administrador

Puede:

* Consultar facturas de todas las tiendas, si el sistema de permisos lo permite.
* Auditar registros.
* Ver puntos generados.
* Anular registros, si tiene permiso.
* Consultar información consolidada.

---

# Bitácora y auditoría

Registrar eventos importantes si el proyecto ya tiene bitácora o estructura de auditoría.

Eventos sugeridos:

* Registro exitoso de factura.
* Intento de factura duplicada.
* Cliente no encontrado.
* Cliente inactivo.
* Usuario sin tienda asignada.
* Anulación de factura.
* Reversión de puntos.
* Error de validación.
* Intento de acceso a registro de otra tienda.

Cada evento debe guardar:

* Usuario.
* Fecha y hora.
* Tienda.
* Acción.
* Resultado.

---

# Integraciones requeridas

El módulo debe integrarse con:

* Clientes.
* Puntos.
* Promociones.
* Catálogos.
* Tiendas.
* Usuarios.
* Reportería, si ya existe estructura para ello.

---

# Consideraciones técnicas

1. Reutiliza componentes existentes.
2. Reutiliza estilos existentes.
3. Reutiliza patrones de formularios, tablas, botones, validaciones, modales y paginación existentes.
4. No dupliques lógica si ya existe una implementación para catálogos, promociones, clientes, puntos o tablas.
5. Mantén tipado correcto si el proyecto usa TypeScript.
6. Maneja estados de carga, error y éxito.
7. Evita datos quemados, excepto los valores iniciales del catálogo si el sistema requiere seed.
8. Si se requiere migración o seed, créalo respetando la estructura actual.
9. No rompas rutas existentes.
10. No modifiques módulos no relacionados salvo que sea necesario para integrar correctamente.
11. La restricción por tienda debe aplicarse desde la consulta o backend, no solo filtrando en frontend.
12. La paginación debe ser real, no simulada en frontend con todos los registros cargados.

---

# Criterios de aceptación

La implementación se considerará completa cuando:

1. Exista la sección **Tienda** en el menú lateral.
2. Exista la opción **Registro de Facturas**.
3. La pantalla muestre el formulario requerido.
4. El NIT permita localizar clientes.
5. El sistema muestre datos básicos del cliente encontrado.
6. El sistema bloquee clientes inexistentes.
7. El sistema bloquee clientes inactivos.
8. El sistema no permita facturas duplicadas.
9. El tipo de calzado funcione como catálogo.
10. Solo se muestren tipos de calzado activos.
11. El sistema registre la factura correctamente.
12. El sistema calcule puntos según promoción vigente.
13. El sistema acredite puntos al cliente.
14. El historial de puntos del cliente se actualice.
15. La tienda se tome automáticamente del usuario autenticado.
16. No exista campo manual para seleccionar tienda.
17. Debajo del formulario exista una tabla histórica de facturas.
18. La tabla histórica muestre únicamente facturas de la tienda asignada al usuario autenticado.
19. La tabla no muestre registros de otras tiendas.
20. La restricción por tienda se aplique desde la lógica de consulta, no solo desde la interfaz.
21. La tabla utilice paginación real igual que los demás módulos.
22. La tabla respete los componentes, estilos y comportamiento de las demás tablas del sistema.
23. Los filtros y búsquedas no permitan acceder a información de otras tiendas.
24. El administrador pueda ver registros de varias tiendas solo si su rol lo permite.
25. Al registrar una nueva factura, la tabla se actualice mostrando el nuevo registro.
26. La tabla muestre estado vacío cuando la tienda no tenga facturas registradas.
27. La tabla maneje correctamente estados de carga y error.
28. El diseño sea compacto, limpio y consistente.
29. El sistema evite doble registro por doble clic.
30. No se eliminen facturas físicamente.
31. La acción de anular, si se implementa, revierta correctamente los puntos generados.
32. Toda acción importante quede registrada en bitácora si el sistema ya cuenta con esa estructura.

---

# Entregable esperado

Al finalizar, entrega un resumen técnico indicando:

* Archivos creados.
* Archivos modificados.
* Rutas agregadas.
* Componentes nuevos.
* Modelos/tablas/migraciones agregadas, si aplica.
* Seeds agregados, si aplica.
* Validaciones implementadas.
* Cómo probar manualmente el flujo completo.
* Cómo validar que la tabla solo muestra registros de la tienda asignada.
* Cómo validar que la paginación es real.
* Cualquier supuesto técnico tomado por falta de información en el código.
