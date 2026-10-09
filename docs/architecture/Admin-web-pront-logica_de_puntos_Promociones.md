Necesito que implementes y ajustes los módulos **Puntos** y **Promociones** dentro del sistema de lealtad, respetando la arquitectura, estilos, componentes, rutas, tablas, validaciones y patrones ya existentes en el proyecto.

Antes de modificar, revisa cuidadosamente:

* Menú lateral / sidebar.
* Sección actual de **Parámetros**.
* Módulo actual de **Puntos**, si ya existe.
* Lógica actual de parámetros.
* Lógica actual de catálogos.
* Lógica actual de promociones, si existe.
* Lógica actual de registro de facturas.
* Lógica actual de clientes.
* Lógica actual de puntos / movimientos de puntos.
* Tablas existentes.
* Paginación real existente.
* Modales o pantallas de creación.
* Manejo de usuarios autenticados.
* Roles y permisos.
* Estilos globales y componentes reutilizables.

No debes romper funcionalidades existentes.

---

# Objetivo general

Implementar la administración correcta de **Puntos** y **Promociones** dentro de la sección **Parámetros**.

La lógica debe quedar separada de la siguiente forma:

* **Puntos:** regla base de acumulación de puntos.
* **Promociones:** campañas especiales o temporales que modifican la acumulación base, como puntos dobles, puntos triples o reglas segmentadas.

Ambos módulos deben estar dentro del menú lateral en:

**Parámetros**

Opciones:

* **Puntos**
* **Promociones**

---

# PARTE 1 — MÓDULO PUNTOS

## Ubicación

El módulo **Puntos** ya existe dentro de **Parámetros**.

Debe mantenerse en esa ubicación.

No moverlo a otra sección.

---

## Objetivo del módulo Puntos

El módulo **Puntos** debe permitir crear y consultar reglas base de acumulación de puntos.

La regla base define:

* Cuántos quetzales debe gastar un cliente para ganar 1 punto.
* Cuánto vale cada punto en quetzales.
* Cuál es la compra mínima para acumular puntos.
* Cuál es el máximo de puntos que puede recibir un cliente por compra.
* Si los puntos generados bajo esa lógica vencen o no.

---

## Regla principal

No pueden existir dos o más lógicas de puntos activas al mismo tiempo.

El sistema solo debe permitir una lógica de puntos activa.

Si el usuario crea una nueva lógica activa, el sistema debe finalizar o inactivar la lógica anterior, según el patrón actual del proyecto.

Los registros anteriores no deben eliminarse.

Los registros anteriores deben quedar como histórico para auditoría y para saber cómo fueron calculados los puntos en compras pasadas.

---

# Pantalla principal de Puntos

La pantalla debe tener una tabla igual a las demás tablas del sistema.

Debe respetar:

* Diseño actual.
* Componentes actuales.
* Filtros si el patrón actual los utiliza.
* Búsqueda si el patrón actual la utiliza.
* Paginación real.
* Estado de carga.
* Estado vacío.
* Estado de error.
* Acciones por registro.

Elementos requeridos:

* Título: **Puntos**
* Botón principal: **Nuevo**
* Tabla de registros históricos de reglas de puntos.

---

# Tabla de Puntos

La tabla debe mostrar el historial de reglas de puntos creadas.

Columnas sugeridas:

* Código o identificador.
* Q gastados por punto.
* Valor de cada punto en Q.
* Compra mínima para acumular.
* Máximo de puntos por compra.
* Vencimiento de puntos.
* Estado.
* Fecha de inicio.
* Fecha de finalización.
* Usuario que creó.
* Fecha de creación.
* Acciones.

---

# Acciones en tabla de Puntos

## Ver

Debe permitir consultar el detalle completo de la lógica de puntos.

La vista debe ser solo lectura.

No debe permitir editar.

## Editar

No debe existir edición de registros históricos.

Si el usuario necesita cambiar la lógica de puntos, debe crear una nueva lógica desde el botón **Nuevo**.

## Eliminar

No debe existir eliminación física de registros.

---

# Botón Nuevo

Al presionar **Nuevo**, el sistema debe mostrar el formulario para crear una nueva lógica de puntos.

El formulario debe seguir el diseño actual del sistema.

Campos requeridos:

---

## 1. Cantidad de Q gastados por punto

Campo obligatorio.

Este campo define cuántos quetzales debe gastar un cliente para recibir 1 punto.

Ejemplo:

Si el valor es **Q10**, entonces el cliente gana **1 punto por cada Q10 gastados**.

Factura de Q100:

* Q100 / Q10 = 10 puntos.

Validaciones:

* Obligatorio.
* Mayor a cero.
* No permitir negativos.
* No permitir texto.
* Formato monetario.
* Permitir decimales solo si el patrón actual del sistema lo permite.

---

## 2. Valor de cada punto en Q

Campo obligatorio.

Define cuánto vale monetariamente cada punto.

Ejemplo:

Si cada punto vale **Q0.10**, entonces:

* 100 puntos = Q10.00.

Validaciones:

* Obligatorio.
* Mayor a cero.
* No permitir negativos.
* Formato monetario.

Importante:

El valor del punto debe guardarse junto con la regla utilizada en cada movimiento de puntos para mantener trazabilidad histórica.

---

## 3. Compra mínima para acumular puntos

Campo obligatorio.

Define el monto mínimo de compra requerido para que el cliente acumule puntos.

Ejemplo:

Si el campo tiene valor **Q100**:

* Si el cliente compra Q50, no recibe puntos.
* Si el cliente compra Q100 o más, sí recibe puntos.

Validaciones:

* Obligatorio.
* Mayor o igual a cero.
* No permitir negativos.
* Formato monetario.

Regla:

Si el monto de la factura es menor a la compra mínima, no se acreditan puntos.

Si el monto de la factura es igual o mayor a la compra mínima, se calculan puntos.

---

## 4. Máximo de puntos por compra

Campo obligatorio.

Define el máximo de puntos que un cliente puede recibir en una sola compra.

Ejemplo:

Si el máximo es **1,000 puntos**, el cliente no podrá recibir más de 1,000 puntos por una factura, aunque por el monto gastado le correspondan más.

Validaciones:

* Obligatorio.
* Mayor a cero.
* No permitir negativos.
* Solo números enteros.

Regla:

Primero se calculan los puntos según la regla base.

Después se aplica el máximo de puntos.

Ejemplo:

* Monto de factura: Q20,000.
* Q gastados por punto: Q10.
* Puntos calculados: 2,000.
* Máximo configurado: 1,000.

Resultado:

* Se acreditan 1,000 puntos.

---

## 5. Vencimiento de puntos

Campo opcional.

Define si los puntos generados bajo esta lógica tendrán vencimiento.

Puede manejarse como cantidad de días de vigencia o como el patrón que ya exista en el proyecto.

Regla principal:

Si el campo se deja vacío, los puntos generados bajo esta lógica no vencen.

Si el campo tiene valor, los puntos generados bajo esta lógica vencen según ese valor.

Ejemplo:

Si se configura **180 días**, los puntos generados vencen 180 días después de la fecha de acumulación.

Regla crítica:

El vencimiento debe quedar guardado en el movimiento de puntos al momento de generar los puntos.

No debe recalcularse retroactivamente.

Ejemplo:

* Si una lógica no tenía vencimiento, los puntos generados con esa lógica nunca deben vencer.
* Si después se crea una nueva lógica con vencimiento, solo los nuevos puntos deben vencer.
* No modificar puntos antiguos por cambios posteriores en la configuración.

---

# Campos que deben eliminarse del módulo Puntos

## Saldo promocional

Eliminar visualmente el campo **Saldo promocional**.

No debe aparecer en:

* Formulario.
* Tabla.
* Detalle.
* Cálculos.
* Validaciones.

No tiene lógica dentro del modelo actual.

Si existe en base de datos, no lo uses. Solo elimínalo de la operación visual y funcional, salvo que sea seguro eliminarlo mediante migración sin afectar datos existentes.

## Acumulación de puntos habilitada

Eliminar el checkbox **Acumulación de puntos habilitada**.

La acumulación ya no debe depender de este checkbox.

La acumulación dependerá de que exista una lógica de puntos activa y válida.

---

# Cálculo base de puntos

Cuando se registre una factura, el sistema debe calcular puntos usando la lógica de puntos activa.

Fórmula:

Puntos calculados = Monto de factura / Cantidad de Q gastados por punto.

Ejemplo:

* Monto factura: Q500.
* Q gastados por punto: Q10.

Resultado:

* 500 / 10 = 50 puntos.

---

# Redondeo

El sistema debe trabajar con puntos enteros.

Si el resultado tiene decimales, redondear hacia abajo.

Ejemplo:

* Monto factura: Q95.
* Q gastados por punto: Q10.
* Resultado: 9.5 puntos.

Puntos acreditados:

* 9 puntos.

No acreditar fracciones de puntos.

---

# Aplicación de compra mínima

Antes de calcular puntos, validar la compra mínima.

Ejemplo:

* Compra mínima: Q100.
* Monto factura: Q80.

Resultado:

* No se acreditan puntos.

Ejemplo:

* Compra mínima: Q100.
* Monto factura: Q150.

Resultado:

* Sí se calculan puntos.

---

# Aplicación del máximo de puntos por compra

Después de calcular los puntos, aplicar el máximo permitido.

Ejemplo:

* Puntos calculados: 2,000.
* Máximo permitido: 1,000.

Resultado:

* Se acreditan 1,000 puntos.

---

# Estados de lógica de puntos

Implementar o respetar estados según el patrón actual del sistema.

Estados sugeridos:

* Activa.
* Finalizada.
* Programada, solo si el sistema permite fechas futuras.
* Inactiva.

Regla:

Solo puede existir una lógica activa.

---

# Trazabilidad de puntos generados

Cada movimiento de puntos generado desde una factura debe guardar la regla utilizada.

Guardar como mínimo:

* Cliente.
* Factura relacionada.
* Tienda.
* Usuario que registró.
* Monto de factura.
* Regla de puntos utilizada.
* Q gastados por punto aplicado.
* Valor del punto aplicado.
* Compra mínima aplicada.
* Máximo de puntos aplicado.
* Puntos calculados originalmente.
* Puntos finalmente acreditados.
* Fecha de acumulación.
* Fecha de vencimiento, si aplica.
* Promoción aplicada, si aplica.

Esto es necesario para que cambios futuros no alteren la historia de puntos ya generados.

---

# PARTE 2 — MÓDULO PROMOCIONES

## Ubicación

Crear o ajustar el módulo **Promociones** dentro del menú lateral en:

**Parámetros**

Opción:

**Promociones**

---

## Objetivo del módulo Promociones

El módulo **Promociones** debe permitir crear campañas especiales de acumulación de puntos.

Estas promociones pueden aplicar a:

* Público específico.
* Tienda específica.
* Zona específica.
* Departamento específico.
* Municipio o ciudad específica.
* Tipo de cliente.
* Nivel del cliente.
* Tipo de calzado.
* Fechas específicas.

Ejemplos de promociones:

* Puntos dobles.
* Puntos triples.
* Multiplicador personalizado.
* Puntos adicionales.
* Promoción por tienda.
* Promoción por zona.
* Promoción por departamento.
* Promoción por ciudad.
* Promoción por tipo de calzado.
* Promoción por monto mínimo de compra.

---

# Pantalla principal de Promociones

La pantalla debe tener una tabla igual a las demás tablas del sistema.

Debe respetar:

* Diseño actual.
* Componentes actuales.
* Paginación real.
* Filtros.
* Búsqueda.
* Estado de carga.
* Estado vacío.
* Estado de error.
* Acciones por registro.

Elementos requeridos:

* Título: **Promociones**
* Botón principal: **Nuevo**
* Tabla de promociones creadas.

---

# Tabla de Promociones

Columnas sugeridas:

* Nombre de promoción.
* Tipo de promoción.
* Multiplicador o beneficio.
* Público objetivo.
* Alcance geográfico.
* Tiendas aplicables.
* Fecha de inicio.
* Fecha de finalización.
* Estado.
* Usuario que creó.
* Fecha de creación.
* Acciones.

---

# Acciones en Promociones

## Ver

Debe permitir consultar el detalle completo de la promoción.

La vista debe ser solo lectura si la promoción ya fue utilizada para generar puntos.

## Nuevo

Permite crear una nueva promoción.

## Finalizar o inactivar

Permite finalizar una promoción activa, si el sistema de permisos lo permite.

No eliminar físicamente.

## Editar

No permitir editar promociones que ya fueron utilizadas para generar puntos.

Si una promoción ya fue utilizada y se necesita cambiar, se debe crear una nueva promoción.

Esto evita inconsistencias históricas.

---

# Formulario para crear Promoción

Al presionar **Nuevo**, mostrar formulario con los siguientes campos:

---

## 1. Nombre de promoción

Campo obligatorio.

Ejemplo:

**Puntos dobles por Bono 14**

---

## 2. Tipo de promoción

Campo obligatorio.

Opciones sugeridas:

* Puntos dobles.
* Puntos triples.
* Multiplicador personalizado.
* Puntos adicionales fijos.
* Regla especial por monto.
* Regla especial por tipo de calzado.

Usar catálogos o constantes existentes si el proyecto ya tiene una estructura para esto.

---

## 3. Multiplicador

Campo obligatorio cuando aplique.

Ejemplos:

* 2x.
* 3x.
* 1.5x.

Validaciones:

* Mayor a cero.
* No permitir negativos.
* Solo requerido cuando el tipo de promoción sea multiplicador.

---

## 4. Puntos adicionales

Campo opcional según el tipo de promoción.

Ejemplo:

Agregar 50 puntos adicionales por compras mayores a Q500.

---

## 5. Compra mínima de promoción

Campo opcional.

Define el monto mínimo para que aplique la promoción.

Debe validarse contra el monto de factura.

---

## 6. Fecha de inicio

Campo obligatorio.

---

## 7. Fecha de finalización

Campo obligatorio.

La promoción debe tener vigencia definida.

La fecha de finalización no puede ser menor a la fecha de inicio.

---

## 8. Público objetivo

Campo configurable.

Debe permitir aplicar a:

* Todos los clientes.
* Clientes básicos.
* Clientes bronce.
* Clientes plata.
* Clientes oro.
* Clientes seleccionados.
* Clientes por origen.
* Clientes por segmento.

Si alguna de estas estructuras no existe todavía, dejar la base preparada sin romper el sistema.

---

## 9. Alcance geográfico

La promoción debe poder configurarse por:

* Todas las tiendas.
* Tienda específica.
* Zona.
* Departamento.
* Municipio.
* Ciudad.

Usar los catálogos existentes.

No crear listas quemadas si ya existen catálogos para:

* País.
* Departamento.
* Municipio.
* Zona.
* Tienda.

---

## 10. Tipo de calzado

Campo opcional.

Debe usar el catálogo **Tipo de Calzado**.

Ejemplo:

Promoción de puntos dobles solo para calzado deportivo.

---

# Reglas de promociones

1. Una promoción debe tener fecha de inicio.
2. Una promoción debe tener fecha de finalización.
3. Una promoción no debe eliminarse físicamente.
4. Una promoción utilizada para generar puntos no debe modificarse.
5. Si se requiere cambiar una promoción utilizada, se debe crear una nueva.
6. La promoción aplicada debe quedar guardada en el movimiento de puntos.
7. Las promociones deben respetar vigencia.
8. Las promociones deben respetar alcance geográfico.
9. Las promociones deben respetar público objetivo.
10. Las promociones deben respetar tipo de calzado, si aplica.
11. Las promociones deben integrarse con la lógica base de puntos.

---

# Conflictos entre promociones

El sistema debe evitar promociones activas conflictivas para el mismo alcance, fecha y condición.

Ejemplo:

No deberían existir dos promociones de puntos dobles activas al mismo tiempo para:

* La misma tienda.
* El mismo tipo de cliente.
* El mismo tipo de calzado.
* El mismo rango de fechas.

Si existen promociones distintas que podrían aplicar al mismo tiempo, debe existir una regla clara de prioridad.

Regla sugerida de prioridad:

1. Promoción específica por cliente.
2. Promoción por nivel de cliente.
3. Promoción por tienda.
4. Promoción por zona.
5. Promoción por departamento.
6. Promoción por municipio o ciudad.
7. Promoción general.

Guardar siempre cuál promoción fue aplicada.

---

# Relación entre Puntos y Promociones

La lógica de **Puntos** define la acumulación base.

La lógica de **Promociones** modifica temporalmente esa acumulación bajo condiciones específicas.

Ejemplo:

Regla base:

* Q10 gastados = 1 punto.

Promoción:

* Puntos dobles en tienda Oakland del 1 al 15 de julio.

Compra:

* Cliente compra Q100 en Oakland el 10 de julio.

Cálculo:

* Regla base: 100 / 10 = 10 puntos.
* Promoción puntos dobles: 10 x 2 = 20 puntos.

Resultado:

* Se acreditan 20 puntos.

---

# Vencimiento de puntos promocionales

Los puntos generados por promociones deben guardar fecha de vencimiento si aplica.

Regla crítica:

El vencimiento debe guardarse al momento de generar el movimiento de puntos.

No recalcular retroactivamente.

Si la regla base no tiene vencimiento, los puntos base no vencen.

Si una promoción define vencimiento diferente y el sistema permite separar puntos base y puntos promocionales, aplicar el vencimiento únicamente a los puntos promocionales.

Si el sistema no separa puntos base y promocionales, aplicar una única fecha de vencimiento al movimiento completo según la regla definida por la lógica activa o la promoción, pero dejar documentado el supuesto técnico.

---

# Integración con Registro de Facturas

Cuando se registre una factura, el sistema debe:

1. Buscar la lógica de puntos activa.
2. Validar compra mínima.
3. Calcular puntos base.
4. Aplicar máximo de puntos por compra.
5. Buscar promociones vigentes aplicables.
6. Aplicar promoción según prioridad.
7. Guardar puntos calculados.
8. Guardar puntos acreditados.
9. Guardar regla de puntos utilizada.
10. Guardar promoción aplicada, si aplica.
11. Guardar fecha de vencimiento, si aplica.
12. Crear movimiento de puntos.
13. Actualizar puntos del cliente.

---

# Paginación real

Las tablas de **Puntos** y **Promociones** deben usar paginación real igual que los demás módulos.

No cargar todos los registros en frontend para paginar visualmente.

La paginación debe resolverse desde la consulta, API, servicio o capa de datos correspondiente.

Debe incluir:

* Página actual.
* Cantidad de registros por página.
* Total de registros.
* Total de páginas.
* Cambio de página.
* Cambio de cantidad por página si el patrón actual lo permite.
* Estado de carga.
* Estado vacío.
* Estado de error.

---

# Permisos

Respetar el sistema de roles y permisos existente.

## Administrador

Puede:

* Ver reglas de puntos.
* Crear nueva lógica de puntos.
* Ver promociones.
* Crear promociones.
* Finalizar promociones si tiene permiso.
* Consultar historial.

## Usuario de tienda

No puede:

* Crear lógica de puntos.
* Editar lógica de puntos.
* Crear promociones.
* Editar promociones.
* Finalizar promociones.

El usuario de tienda únicamente verá el resultado aplicado al registrar facturas, si la pantalla de registro muestra la información.

---

# Bitácora y auditoría

Si el sistema ya tiene bitácora o auditoría, registrar eventos importantes.

Eventos sugeridos:

* Creación de nueva lógica de puntos.
* Activación de nueva lógica de puntos.
* Finalización de lógica anterior.
* Intento de crear dos lógicas activas.
* Creación de promoción.
* Finalización de promoción.
* Intento de crear promoción conflictiva.
* Cálculo de puntos en factura.
* Aplicación de promoción.
* Eliminación visual de saldo promocional.
* Eliminación visual del checkbox acumulación de puntos habilitada.

Guardar:

* Usuario.
* Fecha y hora.
* Acción.
* Resultado.
* Datos anteriores, si aplica.
* Datos nuevos, si aplica.

---

# Reglas de negocio generales

1. Solo puede existir una lógica de puntos activa.
2. Los registros de lógica de puntos no se editan.
3. Los registros de lógica de puntos no se eliminan.
4. Si se necesita cambiar la lógica de puntos, se crea una nueva.
5. La lógica anterior queda finalizada o inactiva.
6. El campo saldo promocional debe desaparecer.
7. El checkbox acumulación de puntos habilitada debe desaparecer.
8. La acumulación depende de una lógica de puntos activa.
9. La compra mínima define si una factura acumula puntos.
10. El máximo de puntos limita la cantidad de puntos por compra.
11. El vencimiento se guarda al momento de generar puntos.
12. Los puntos sin vencimiento no deben vencer por cambios posteriores.
13. Las promociones deben tener vigencia.
14. Las promociones pueden segmentarse por público, tienda, zona, departamento, municipio o ciudad.
15. Las promociones utilizadas no deben modificarse.
16. Toda acumulación debe guardar regla y promoción aplicada.
17. Las tablas deben usar paginación real.
18. Las tablas deben seguir la lógica visual de los demás módulos.
19. No eliminar físicamente reglas ni promociones.
20. No modificar retroactivamente puntos ya generados.

---

# Consideraciones técnicas

1. Reutiliza componentes existentes.
2. Reutiliza estilos existentes.
3. Reutiliza la lógica actual de tablas.
4. Reutiliza la lógica actual de paginación real.
5. Reutiliza catálogos existentes.
6. No dupliques lógica si ya existe.
7. Mantén tipado correcto si el proyecto usa TypeScript.
8. Maneja estados de carga, error y éxito.
9. Si se requieren migraciones, créalas respetando la estructura actual.
10. Si se requieren seeds, créalos respetando la estructura actual.
11. No rompas rutas existentes.
12. No modifiques módulos no relacionados salvo que sea necesario.
13. No uses datos quemados si ya existen catálogos.
14. Documenta cualquier supuesto técnico que tomes por falta de información.

---

# Criterios de aceptación — Puntos

La implementación de **Puntos** será aceptada cuando:

1. El módulo permanezca dentro de **Parámetros**.
2. Muestre una tabla igual a las demás tablas del sistema.
3. La tabla tenga paginación real.
4. Exista botón **Nuevo**.
5. Permita crear una nueva lógica de puntos.
6. Solicite cantidad de Q gastados por punto.
7. Solicite valor de cada punto en Q.
8. Solicite compra mínima para acumular.
9. Solicite máximo de puntos por compra.
10. Permita dejar vencimiento vacío.
11. Si vencimiento queda vacío, los puntos generados no vencen.
12. Si vencimiento tiene valor, los puntos generados vencen según esa regla.
13. No permita dos lógicas de puntos activas al mismo tiempo.
14. No permita editar registros históricos.
15. Solo permita ver registros históricos.
16. No permita eliminar registros.
17. Elimine visualmente el campo saldo promocional.
18. Elimine visualmente el checkbox acumulación de puntos habilitada.
19. Calcule correctamente puntos desde el registro de facturas.
20. Aplique compra mínima.
21. Aplique máximo de puntos por compra.
22. Guarde la regla utilizada en cada movimiento de puntos.
23. No modifique retroactivamente vencimientos de puntos ya generados.

---

# Criterios de aceptación — Promociones

La implementación de **Promociones** será aceptada cuando:

1. El módulo esté dentro de **Parámetros**.
2. Muestre una tabla igual a las demás tablas del sistema.
3. La tabla tenga paginación real.
4. Exista botón **Nuevo**.
5. Permita crear promociones.
6. Permita promociones por público específico.
7. Permita promociones por tienda.
8. Permita promociones por zona.
9. Permita promociones por departamento.
10. Permita promociones por municipio o ciudad.
11. Permita promociones por tipo de calzado, si aplica.
12. Permita puntos dobles.
13. Permita puntos triples.
14. Permita multiplicadores personalizados.
15. Controle fecha de inicio y finalización.
16. Evite promociones conflictivas para el mismo alcance.
17. Guarde la promoción aplicada en el movimiento de puntos.
18. No permita modificar promociones ya utilizadas.
19. No elimine promociones físicamente.
20. Respete catálogos existentes.
21. Integre la promoción con la lógica base de puntos.
22. Permita consultar el historial de promociones.

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
* Cómo probar manualmente el módulo de Puntos.
* Cómo probar manualmente el módulo de Promociones.
* Cómo validar que solo exista una lógica de puntos activa.
* Cómo validar que el campo saldo promocional ya no se use.
* Cómo validar que el checkbox acumulación de puntos habilitada ya no exista.
* Cómo validar que el registro de facturas calcule puntos correctamente.
* Cualquier supuesto técnico tomado por falta de información en el código.
