# Pruebas en Azure DevOps

El pipeline `azure-pipelines.yml` ejecuta 107 comprobaciones: 37 de API (T01–T37), 27 reglas automatizadas (U01–U27) y 43 de conexión y sesiones (R01–R43). Publica tres ejecuciones JUnit en la pestaña Tests y conserva los reportes y la versión validada en el artefacto `resultados-pruebas`. Las pruebas R cubren el arranque tras inactividad, respuestas HTML 502, protección contra operaciones duplicadas y renovación de sesión del conductor.

**Última validación en Azure DevOps aprobada:** [ejecución 20261023.1, ID 12](https://dev.azure.com/victoreflorian/XRE%20Docs%20Lealtad/_build/results?buildId=12&view=ms.vss-test-web.build-test-results-tab), del **22 de octubre de 2026 en Guatemala**. Azure registró **64 pruebas aprobadas, 0 fallidas, 0 otras y 0 sin reportar**, en dos ejecuciones JUnit: 37 API y 27 automatizadas. El pipeline terminó con estado **Success** en el segundo intento y publicó el artefacto `resultados-pruebas`. Código validado: `7d61bf684c57ba5ee843727f1d071804111a7a8b`. Evidencia: [pipeline aprobado](evidencias-ci/09-azure-64-pipeline-aprobado.png) y [resultados de las 64 pruebas](evidencias-ci/10-azure-resultados-64-pruebas.png). El primer intento se detuvo antes de ejecutar pruebas por el entorno de módulos de PowerShell del agente; el reintento utilizó un entorno compatible, sin modificar el código validado.

**Validación histórica aprobada:** [ejecución 20261009.3, ID 10](https://dev.azure.com/victoreflorian/XRE%20Docs%20Lealtad/_build/results?buildId=10&view=ms.vss-test-web.build-test-results-tab), del 9 de octubre de 2026. Azure registró **60 pruebas aprobadas, 0 fallidas, 0 otras y 0 sin reportar**, distribuidas en 37/37 API y 23/23 automatizadas. El pipeline completo terminó con estado **Success** y publicó el artefacto `resultados-pruebas`. Código validado: `bbaf11b930e1ab5753a043f9f05f89e030f530a8`. Las capturas finales están en `docs/evidencias-ci/06-pipeline-aprobado.jpg` y `docs/evidencias-ci/07-resultados-60-pruebas.jpg`.

## Repetir localmente

Con Docker Desktop activo y Node.js 22 instalado, ejecutar desde la raíz:

```sh
node scripts/ci/run.cjs
```

El comando construye una imagen de pruebas, aplica migraciones y la carga base, genera credenciales aleatorias y crea usuarios con siete y veinte permisos. Cada ejecución usa su propio proyecto Docker y una base `xre_ci`, sin publicar puertos. Las fixtures rechazan conexiones a otra base. Al terminar elimina únicamente los contenedores y volúmenes de esa ejecución. Los reportes permanecen en `test-results/`, excluidos de Git.

Las comprobaciones API forman un flujo secuencial: compras, saldo, solicitudes, entrega, cancelación, reversa, sesiones y límite de acceso. Una falla previa puede dejar comprobaciones posteriores sin ejecutar; JUnit las señala como omitidas. No se consideran aprobadas por ausencia de ejecución.

## Casos de prueba

`tests/test-cases.json` conserva los 107 casos, identificadores, nombres y resultados esperados. Los archivos `tests/azure-test-cases-api.csv` y `tests/azure-test-cases-unit.csv` permiten importarlos en dos suites de Azure Test Plans. Los nombres automatizados coinciden con JUnit; los U01–U27 son identificadores de catálogo. `tests/azure-test-cases-driver-dashboard.csv` contiene únicamente U24–U27 para incorporarlos sin duplicar los 60 casos originales.

Los 64 casos están importados en el proyecto **XRE Docs Lealtad**, organización **victoreflorian**. Los cuatro casos del conductor se agregaron el 22 de octubre de 2026:

| Suite | Casos | Identificadores de Azure |
| --- | ---: | --- |
| [API — 37 comprobaciones](https://dev.azure.com/victoreflorian/XRE%20Docs%20Lealtad/_testPlans/define?planId=64&suiteId=66) | 37 | 67–103 |
| [Reglas — 27 pruebas automatizadas](https://dev.azure.com/victoreflorian/XRE%20Docs%20Lealtad/_testPlans/define?planId=64&suiteId=104) | 27 | 105–127 y 129–132 |

El plan es **Validación XRE Docs — API y reglas automatizadas**, ID 64. `tests/azure-work-items.json` relaciona cada caso con su identificador real. No volver a importar los CSV con la columna ID vacía: eso crearía casos duplicados.

Los casos de Test Plans conservan el estado de diseño. Importar un caso no equivale a ejecutar su prueba ni a asociarlo automáticamente a un resultado. La ejecución automatizada y su resultado se verifican en la pestaña **Tests** del pipeline; la correspondencia por nombre está documentada en el catálogo.

## Evidencia local del mismo ejecutor de CI

La ejecución local del **22 de octubre de 2026** terminó con **64/64 comprobaciones aprobadas**: 37 API y 27 automatizadas, sin fallas, errores ni casos omitidos. La revisión de tipos de la API también pasó. Los reportes de esta actualización se conservan en [local-20261022](evidencias-ci/local-20261022/); la captura [08-reglas-27-pruebas.png](evidencias-ci/08-reglas-27-pruebas.png) documenta la suite actualizada de Test Plans.

La ejecución del 9 de octubre de 2026 a las 05:46 UTC (8 de octubre a las 23:46 en Guatemala) terminó con **37/37 comprobaciones API y 23/23 pruebas automatizadas aprobadas**, sin fallas ni casos omitidos. La comprobación de tipos de la API también pasó. Los archivos JUnit y JSON saneados están en `docs/evidencias-ci/local/`. Las capturas de las dos suites importadas y del repositorio público están en `docs/evidencias-ci/`.

Esta evidencia corresponde al ejecutor local Docker. Los resultados de una ejecución en Azure se registran separadamente en el pipeline.

## Pipeline

1. Crear un pipeline desde el repositorio GitHub y seleccionar el archivo existente `azure-pipelines.yml` de `main`.
2. Autorizar la conexión solamente para este repositorio y pipeline.
3. Ejecutar el pipeline y revisar Tests: 37 casos API, 27 de reglas y 43 de conexión y sesiones, 107 en total.
4. Descargar el artefacto `resultados-pruebas` para conservar evidencia.

La ejecución 8 falló antes de ejecutar pruebas porque la organización no tiene capacidad Microsoft-hosted habilitada. El pipeline utiliza ahora el agente propio existente **rikeli-local**, del pool **Default**, con Docker y Node.js 22. Este agente debe permanecer conectado y Docker Desktop debe estar activo. Azure DevOps coordina la ejecución y publica los resultados; el procesamiento ocurre en el equipo del agente. No se ha contratado capacidad de pago.

Al iniciar el agente desde PowerShell 7, su proceso debe recibir un `PSModulePath` compatible con Windows PowerShell: las carpetas de módulos de `Documents/WindowsPowerShell`, `Program Files/WindowsPowerShell` y `Windows/System32/WindowsPowerShell/v1.0`. Heredar módulos de la consola PowerShell 7 puede detener las tareas antes de ejecutar pruebas con errores de tipos duplicados y `ConvertTo-SecureString`. El ajuste se aplica al entorno del proceso del agente; no requiere cambiar los módulos ni la configuración global del sistema.

El pipeline se ejecuta al actualizar `main` o mediante **Run pipeline**. Las ejecuciones automáticas de pull requests están deshabilitadas para evitar que contribuciones externas al repositorio público ejecuten código en el agente propio.

La ejecución 9 completó las 60 verificaciones originales, pero Azure rechazó el JUnit nativo de Node.js porque sus `testcase` estaban directamente bajo `testsuites`. El paso `scripts/ci/normalize-junit.ps1` coloca los nodos originales dentro de `testsuite` y calcula sus totales para el importador de Azure. Conserva nombres, duraciones, fallas, errores y pruebas omitidas; actualmente exige que el reporte contenga los 27 casos. Esta adaptación del formato no cambia las aserciones ni sus resultados. Se utiliza `UseNode@1` en lugar de la tarea obsoleta `NodeTool@0`.

Los documentos de `docs/entrega/` corresponden a la validación local original del 8 de octubre de 2026. Los resultados nuevos de CI se consultan en Azure DevOps. No se copian credenciales, cookies ni tokens a los reportes.

Referencias: [PublishTestResults](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-test-results-v2?view=azure-pipelines), [importación de Test Plans](https://learn.microsoft.com/en-us/azure/devops/test/bulk-import-export-test-cases?view=azure-devops).

## Actualización de conexión y sesiones — 28 de octubre de 2026

Las correcciones publicadas en Render están en el mismo repositorio GitHub que consume Azure. El pipeline añade `test:reliability:ci`, que ejecuta 43 pruebas con nombres diferentes por portal. El normalizador valida los 27 resultados de reglas y los 43 resultados nuevos; `write-azure-summary.ps1` exige un total de 107 sin fallas ni omitidos y registra el identificador de ejecución y la versión de Git.

Validación local del ejecutor Docker completada el 28 de octubre: **107/107 aprobadas**, con revisión de tipos de la API aprobada. Evidencia en `docs/evidencias-ci/local-20261028/`. Estos resultados locales no se presentan como una ejecución de Azure.

Los 64 registros históricos de Test Plans conservan sus identificadores. Los 43 casos nuevos se registran como resultados automatizados en Tests; no se han creado registros de Test Plans duplicados. El agente `rikeli-local` debe estar conectado y Docker Desktop activo para procesar nuevas ejecuciones.
