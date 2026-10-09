# Pruebas en Azure DevOps

El pipeline `azure-pipelines.yml` ejecuta 37 comprobaciones de API (T01–T37) y los 23 casos existentes de Node.js. Publica dos ejecuciones JUnit en la pestaña Tests y conserva los reportes como artefacto.

**Validación en Azure DevOps aprobada:** [ejecución 20261009.3, ID 10](https://dev.azure.com/victoreflorian/XRE%20Docs%20Lealtad/_build/results?buildId=10&view=ms.vss-test-web.build-test-results-tab), del 9 de octubre de 2026. Azure registró **60 pruebas aprobadas, 0 fallidas, 0 otras y 0 sin reportar**, distribuidas en 37/37 API y 23/23 automatizadas. El pipeline completo terminó con estado **Success** y publicó el artefacto `resultados-pruebas`. Código validado: `bbaf11b930e1ab5753a043f9f05f89e030f530a8`. Las capturas finales están en `docs/evidencias-ci/06-pipeline-aprobado.jpg` y `docs/evidencias-ci/07-resultados-60-pruebas.jpg`.

## Repetir localmente

Con Docker Desktop activo y Node.js 22 instalado, ejecutar desde la raíz:

```sh
node scripts/ci/run.cjs
```

El comando construye una imagen de pruebas, aplica migraciones y la carga base, genera credenciales aleatorias y crea usuarios con siete y veinte permisos. Cada ejecución usa su propio proyecto Docker y una base `xre_ci`, sin publicar puertos. Las fixtures rechazan conexiones a otra base. Al terminar elimina únicamente los contenedores y volúmenes de esa ejecución. Los reportes permanecen en `test-results/`, excluidos de Git.

Las comprobaciones API forman un flujo secuencial: compras, saldo, solicitudes, entrega, cancelación, reversa, sesiones y límite de acceso. Una falla previa puede dejar comprobaciones posteriores sin ejecutar; JUnit las señala como omitidas. No se consideran aprobadas por ausencia de ejecución.

## Casos de prueba

`tests/test-cases.json` conserva los 60 casos, identificadores, nombres y resultados esperados. Los archivos `tests/azure-test-cases-api.csv` y `tests/azure-test-cases-unit.csv` permiten importarlos en dos suites de Azure Test Plans. Los nombres automatizados coinciden con JUnit; los U01–U23 son identificadores de catálogo.

Los 60 casos ya se importaron en el proyecto **XRE Docs Lealtad**, organización **victoreflorian**:

| Suite | Casos | Identificadores de Azure |
| --- | ---: | --- |
| [API — 37 comprobaciones](https://dev.azure.com/victoreflorian/XRE%20Docs%20Lealtad/_testPlans/define?planId=64&suiteId=66) | 37 | 67–103 |
| [Reglas — 23 pruebas automatizadas](https://dev.azure.com/victoreflorian/XRE%20Docs%20Lealtad/_testPlans/define?planId=64&suiteId=104) | 23 | 105–127 |

El plan es **Validación XRE Docs — API y reglas automatizadas**, ID 64. `tests/azure-work-items.json` relaciona cada caso con su identificador real. No volver a importar los CSV con la columna ID vacía: eso crearía casos duplicados.

Los casos de Test Plans conservan el estado de diseño. Importar un caso no equivale a ejecutar su prueba ni a asociarlo automáticamente a un resultado. La ejecución automatizada y su resultado se verifican en la pestaña **Tests** del pipeline; la correspondencia por nombre está documentada en el catálogo.

## Evidencia local del mismo ejecutor de CI

La ejecución del 9 de octubre de 2026 a las 05:46 UTC (8 de octubre a las 23:46 en Guatemala) terminó con **37/37 comprobaciones API y 23/23 pruebas automatizadas aprobadas**, sin fallas ni casos omitidos. La comprobación de tipos de la API también pasó. Los archivos JUnit y JSON saneados están en `docs/evidencias-ci/local/`. Las capturas de las dos suites importadas y del repositorio público están en `docs/evidencias-ci/`.

Esta evidencia corresponde al ejecutor local Docker. Los resultados de una ejecución en Azure se registran separadamente en el pipeline.

## Pipeline

1. Crear un pipeline desde el repositorio GitHub y seleccionar el archivo existente `azure-pipelines.yml` de `main`.
2. Autorizar la conexión solamente para este repositorio y pipeline.
3. Ejecutar el pipeline y revisar Tests: 37 casos API y 23 automatizados.
4. Descargar el artefacto `resultados-pruebas` para conservar evidencia.

La ejecución 8 falló antes de ejecutar pruebas porque la organización no tiene capacidad Microsoft-hosted habilitada. El pipeline utiliza ahora el agente propio existente **rikeli-local**, del pool **Default**, con Docker y Node.js 22. Este agente debe permanecer conectado y Docker Desktop debe estar activo. Azure DevOps coordina la ejecución y publica los resultados; el procesamiento ocurre en el equipo del agente. No se ha contratado capacidad de pago.

El pipeline se ejecuta al actualizar `main` o mediante **Run pipeline**. Las ejecuciones automáticas de pull requests están deshabilitadas para evitar que contribuciones externas al repositorio público ejecuten código en el agente propio.

La ejecución 9 completó las 60 verificaciones, pero Azure rechazó el JUnit nativo de Node.js porque sus `testcase` estaban directamente bajo `testsuites`. El paso `scripts/ci/normalize-junit.ps1` coloca los nodos originales dentro de `testsuite` y calcula sus totales para el importador de Azure. Conserva nombres, duraciones, fallas, errores y pruebas omitidas; además exige que el reporte contenga los 23 casos. Esta adaptación del formato no cambia las aserciones ni sus resultados. Se utiliza `UseNode@1` en lugar de la tarea obsoleta `NodeTool@0`.

Los documentos de `docs/entrega/` corresponden a la validación local original del 8 de octubre de 2026. Los resultados nuevos de CI se consultan en Azure DevOps. No se copian credenciales, cookies ni tokens a los reportes.

Referencias: [PublishTestResults](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-test-results-v2?view=azure-pipelines), [importación de Test Plans](https://learn.microsoft.com/en-us/azure/devops/test/bulk-import-export-test-cases?view=azure-devops).
