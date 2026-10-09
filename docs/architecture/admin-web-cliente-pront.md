Actúa como desarrollador full-stack senior dentro del proyecto **Sistema de Lealtad**.

Necesito que analices primero la estructura actual del código, rutas, componentes, servicios, modelos, formularios, tablas, estilos y lógica existente relacionada con clientes, tiendas, autenticación, puntos, niveles, historial, catálogos y menú lateral.

Después implementa la mejora completa del **Módulo de Clientes** en la plataforma web de administrador, respetando el diseño visual actual del sistema y reutilizando componentes existentes siempre que sea posible.

---

# Objetivo general

Mejorar el módulo de **Clientes** para que el administrador pueda consultar, filtrar, exportar, crear, editar y visualizar clientes registrados globalmente desde:

* PWA Cliente.
* PWA Tienda.
* Plataforma Web Administrador.

El módulo debe estar ubicado en:

**Menú lateral → Gestión Empresarial → Clientes**

---

# 1. Menú lateral

Agregar o corregir la ubicación del módulo **Clientes** dentro del menú lateral bajo el título:

**Gestión Empresarial**

Debe mantenerse el estilo actual del sidebar.

También debe agregarse o preparar la opción:

**Configuración → Catálogos**

Dentro de Catálogos deben poder administrarse catálogos como:

* País.
* Departamento.
* Municipio.
* Zona.

---

# 2. Tabla principal de clientes

La vista principal del módulo debe mostrar una tabla de clientes con estas columnas exactas:

* Código del cliente.
* Nombre del cliente.
* Teléfono.
* Correo.
* Puntos.
* Nivel.
* Estado.
* Origen.
* Acciones.

En acciones únicamente deben existir:

* Ver.
* Editar.

No debe existir botón de eliminar.

---

# 3. Filtros

La tabla debe tener:

## Filtro por origen

Debe permitir filtrar por:

* Administración.
* PWA Cliente.
* PWA Tienda.
* Tiendas registradas activas.

Si una tienda está inactiva, no debe aparecer como opción nueva de filtro/catalogación, pero debe conservarse en registros históricos.

## Buscador único

Debe existir un único campo de búsqueda que permita buscar por cualquiera de estos datos:

* Nombre.
* Correo.
* Teléfono.

El usuario no debe seleccionar el tipo de búsqueda. El backend o la lógica de consulta debe buscar coincidencias en los tres campos.

---

# 4. Exportación XLSX

Agregar botón **Exportar**.

Debe exportar la tabla en formato `.xlsx`.

Reglas:

* Debe respetar filtros activos.
* Si no hay filtros, debe exportar el listado global permitido.
* No debe cargar toda la base en frontend solo para exportar.
* La exportación debe ejecutarse de forma separada a la paginación visual.

---

# 5. Cards superiores

Arriba de la tabla deben existir cards con estos totales:

* Total clientes.
* Clientes Oro.
* Clientes Plata.
* Clientes Bronce.
* Clientes Básico.

Cada card debe funcionar como filtro al hacer clic.

Reglas:

* Al presionar una card de nivel, mostrar solo clientes activos de ese nivel.
* No incluir clientes inactivos en estos filtros.
* El filtro aplicado debe poder limpiarse.
* La card seleccionada debe verse visualmente activa.

---

# 6. Paginación

La tabla debe tener paginación real del lado servidor.

Reglas:

* Mostrar 10 registros por página.
* Consultar únicamente 10 registros por petición.
* Permitir navegación por:

  * Número de página.
  * Botón siguiente.
  * Botón atrás.
* Los filtros, búsqueda y paginación deben enviarse como parámetros al backend o servicio correspondiente.
* No cargar todos los clientes en frontend.

---

# 7. Crear cliente desde administrador

El botón **Nuevo cliente** ya existe o debe mantenerse.

Debe abrir formulario de creación de cliente.

Debe usar los campos existentes actualmente en el sistema, pero con estos ajustes:

## Foto del cliente

El administrador no puede subir foto del cliente.

Eliminar u ocultar cualquier campo de carga de foto en creación desde administrador.

La foto solo debe ser gestionada por el cliente desde su propia plataforma.

## Canal de origen

El campo **Canal de origen** debe ser un catálogo desplegable con:

* Administración.
* Tiendas activas registradas.

Reglas:

* Solo se puede seleccionar una opción.
* Si una tienda está inactiva, no debe aparecer en el catálogo.
* Si un cliente ya tenía asignada una tienda luego inactiva, conservar el dato histórico.

## Contraseña temporal

El campo de contraseña temporal ya existe.

Ajustarlo para que:

* Aparezca vacío.
* No tenga valor precargado.
* Solo tenga placeholder/máscara con texto: **Contraseña**.
* Se guarde de forma segura.
* Obligue al cliente a cambiar contraseña en su primer inicio de sesión.

## Estado inicial

Todo cliente creado desde administración debe nacer con estado **Activo**.

---

# 8. Catálogos geográficos

Los campos:

* País.
* Departamento.
* Municipio / Ciudad.
* Zona.

Deben funcionar como catálogos administrables.

Crear o adaptar módulo:

**Configuración → Catálogos**

Debe permitir administrar:

* País.
* Departamento.
* Municipio.
* Zona.

Cada catálogo debe permitir:

* Crear.
* Editar.
* Activar.
* Inactivar.
* Asignar código.
* Asignar relación con catálogo padre cuando aplique.

Relaciones:

* País → Departamento.
* Departamento → Municipio.
* Municipio → Zona.

Comportamiento en formularios:

* Si selecciono país, departamento debe mostrar solo departamentos de ese país.
* Si selecciono departamento, municipio debe mostrar solo municipios de ese departamento.
* Si selecciono municipio, zona debe mostrar solo zonas de ese municipio.
* Catálogos inactivos no deben aparecer en nuevas selecciones.
* Valores históricos deben conservarse.

---

# 9. Editar cliente

Desde la tabla debe existir acción **Editar**.

El administrador debe poder editar todos los campos del cliente excepto:

* Código del cliente.
* Puntos acumulados.

## Código cliente

Debe ser automático, único y no editable.

Debe usar una lógica similar a la del módulo de tiendas.

## Puntos

Los puntos pueden mostrarse, pero deben ser solo lectura.

No se pueden cambiar desde el formulario de edición.

## Estado

Debe permitirse inactivar o reactivar al cliente.

Reglas:

* El cliente nace activo.
* Si se inactiva, no debe poder ingresar a la plataforma de cliente.
* La inactivación no borra puntos, historial ni transacciones.
* Debe poder reactivarse si el negocio lo requiere.

## Botones

Los botones deben ubicarse al final de la pantalla:

* Guardar cambios.
* Cancelar.

También debe existir botón **Regresar**.

Comportamiento:

* Guardar cambios debe regresar a la tabla de clientes.
* Cancelar debe regresar a la tabla sin guardar.
* Regresar debe volver a la tabla de clientes.

---

# 10. Cambio obligatorio de contraseña

Cuando un cliente sea creado desde:

* PWA Tienda.
* Plataforma Web Administrador.

Debe marcarse internamente como pendiente de cambio de contraseña.

En el primer inicio de sesión:

* Debe obligarlo a crear nueva contraseña.
* No debe poder continuar en la plataforma sin cambiarla.
* Después del cambio, ya no debe volver a solicitarlo.

---

# 11. Perfil del cliente

El perfil del cliente ya existe. Debe mantenerse y mejorarse.

Debe permitir visualizar toda la información del cliente:

* Código.
* Nombre.
* Teléfono.
* Correo.
* Estado.
* Origen.
* Nivel.
* Puntos actuales.
* Ubicación.
* Historial.

## Botones permitidos

En perfil solo deben existir:

* Editar.
* Sumar puntos.
* Quitar puntos.
* Regresar.

Eliminar o esconder:

* Botón de enviar beneficios.
* Botón de tres puntos.
* Cualquier acción no definida.

---

# 12. Sumar puntos

Agregar botón para sumar puntos desde el perfil del cliente.

Reglas:

* Debe afectar solo al cliente visualizado.
* Debe solicitar cantidad de puntos.
* Debe solicitar motivo del ajuste.
* Debe registrar el movimiento en historial.
* Debe guardar el usuario administrador que hizo el ajuste.
* Debe actualizar el total de puntos del cliente.

---

# 13. Quitar puntos

Agregar botón para quitar puntos desde el perfil del cliente.

Reglas:

* Debe afectar solo al cliente visualizado.
* Debe solicitar cantidad de puntos.
* Debe solicitar motivo del ajuste.
* No debe permitir puntos negativos.
* Debe registrar el movimiento en historial.
* Debe guardar el usuario administrador que hizo el ajuste.
* Debe actualizar el total de puntos del cliente.

---

# 14. Historial del cliente

En el perfil del cliente debe mostrarse solo el historial de ese cliente.

Movimientos permitidos:

* Sumas de puntos.
* Restas de puntos.
* Canjes realizados.

Cada movimiento debe mostrar:

* Fecha.
* Tipo de movimiento.
* Cantidad de puntos.
* Motivo o descripción.
* Usuario o canal que generó el movimiento.
* Referencia de canje, cuando aplique.

No debe mostrar movimientos de otros clientes.

---

# 15. Gráfica de canjes por categoría

Corregir visualmente la sección de **canjes por categoría**.

Problema actual:

* Hay texto encima de la gráfica.
* Se ve desordenado visualmente.

Corregir para que:

* La gráfica no tenga textos encima.
* Existan márgenes adecuados.
* Las etiquetas sean legibles.
* Se vea bien en desktop.
* Si no hay datos, mostrar estado vacío claro.

---

# 16. Auditoría y seguridad

Registrar auditoría en acciones sensibles:

* Creación de cliente.
* Edición de cliente.
* Inactivación.
* Reactivación.
* Suma manual de puntos.
* Resta manual de puntos.
* Cambio de origen.
* Cambio de estado.

Cada auditoría debe guardar:

* Usuario que ejecutó la acción.
* Fecha y hora.
* Cliente afectado.
* Acción realizada.
* Valor anterior y nuevo valor cuando aplique.

---

# 17. Validaciones

Validar campos obligatorios antes de guardar.

Campos mínimos:

* Nombre.
* Teléfono.
* Correo.
* Canal de origen.
* País.
* Departamento.
* Municipio.
* Contraseña temporal en creación desde administrador.

Correo:

* Debe tener formato válido.
* No debe duplicarse si se usa como credencial.

Teléfono:

* Debe tener formato válido.
* No debe duplicarse si se usa como identificador del cliente.

Contraseña:

* No mostrar en texto plano.
* No precargar valores.
* Obligar cambio en primer inicio de sesión.

---

# 18. Mensajes del sistema

Usar mensajes claros:

Tabla sin resultados:

“Sin clientes para mostrar con los filtros seleccionados.”

Error de carga:

“No fue posible cargar los clientes. Intente nuevamente.”

Exportación correcta:

“Archivo XLSX generado correctamente.”

Guardado correcto:

“Cliente guardado correctamente.”

Ajuste de puntos correcto:

“Ajuste de puntos realizado correctamente.”

---

# 19. Criterios de aceptación

La implementación debe cumplir como mínimo:

1. Clientes aparece en menú lateral bajo Gestión Empresarial.
2. Tabla muestra las columnas exactas definidas.
3. Acciones disponibles: Ver y Editar únicamente.
4. Buscador único funciona por nombre, correo o teléfono.
5. Filtro por origen funciona correctamente.
6. Cards superiores funcionan como filtros de clientes activos por nivel.
7. Tabla consulta solo 10 registros por página.
8. Paginación funciona con números, siguiente y atrás.
9. Exportación XLSX respeta filtros.
10. Nuevo cliente no permite subir foto.
11. Canal de origen muestra Administración y tiendas activas.
12. Tiendas inactivas no aparecen en nuevas selecciones.
13. Contraseña temporal aparece vacía con placeholder Contraseña.
14. Cliente creado desde admin o tienda debe cambiar contraseña en primer login.
15. Editar cliente no permite modificar código ni puntos.
16. Cliente puede inactivarse y reactivarse.
17. Cliente inactivo no puede iniciar sesión en PWA Cliente.
18. Guardar, cancelar y regresar vuelven a la tabla de clientes.
19. Perfil muestra información correcta del cliente.
20. Perfil permite editar, sumar puntos, quitar puntos y regresar.
21. No existe botón de enviar beneficios.
22. No existe botón de tres puntos.
23. Historial muestra solo movimientos del cliente visualizado.
24. Ajustes de puntos quedan registrados en historial.
25. Quitar puntos no permite dejar saldo negativo.
26. Gráfica de canjes por categoría se visualiza correctamente.

---

# 20. Instrucciones técnicas para ejecución

Antes de modificar:

1. Analiza la estructura completa del proyecto.
2. Identifica rutas actuales de clientes.
3. Identifica componentes reutilizables de tablas, cards, formularios, botones, modales y layout.
4. Identifica cómo se manejan tiendas, códigos automáticos, niveles, puntos, historial y autenticación.
5. Reutiliza patrones existentes antes de crear nuevos.
6. No rompas funcionalidades existentes.
7. Mantén consistencia visual con el diseño actual.
8. Implementa cambios en frontend y backend si aplica.
9. Agrega o ajusta tipos/interfaces si el proyecto usa TypeScript.
10. Agrega manejo de loading, error y estados vacíos.
11. Valida que no existan errores de compilación.
12. Ejecuta pruebas disponibles o al menos verifica build/lint si existen scripts.

---

# 21. Resultado esperado

Al terminar, entrega un resumen técnico con:

* Archivos modificados.
* Archivos creados.
* Cambios realizados.
* Cómo probar la funcionalidad.
* Rutas afectadas.
* Consideraciones pendientes si algo no pudo completarse.

Implementa la solución completa, no solo el diseño visual.
