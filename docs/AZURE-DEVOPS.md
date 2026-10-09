# Pruebas en Azure DevOps

El pipeline `azure-pipelines.yml` ejecuta 37 comprobaciones de API (T01–T37) y los 23 casos existentes de Node.js. Publica dos ejecuciones JUnit en la pestaña Tests y conserva los reportes como artefacto.

## Repetir localmente

Con Docker Desktop activo y Node.js 22 instalado, ejecutar desde la raíz:

```sh
node scripts/ci/run.cjs
```

El comando construye una imagen de pruebas, aplica migraciones y la carga base, genera credenciales aleatorias y crea usuarios con siete y veinte permisos. Cada ejecución usa su propio proyecto Docker y una base `xre_ci`, sin publicar puertos. Las fixtures rechazan conexiones a otra base. Al terminar elimina únicamente los contenedores y volúmenes de esa ejecución. Los reportes permanecen en `test-results/`, excluidos de Git.

Las comprobaciones API forman un flujo secuencial: compras, saldo, solicitudes, entrega, cancelación, reversa, sesiones y límite de acceso. Una falla previa puede dejar comprobaciones posteriores sin ejecutar; JUnit las señala como omitidas. No se consideran aprobadas por ausencia de ejecución.

## Casos de prueba

`tests/test-cases.json` conserva los 60 casos, identificadores, nombres y resultados esperados. Los archivos `tests/azure-test-cases-api.csv` y `tests/azure-test-cases-unit.csv` permiten importarlos en dos suites de Azure Test Plans. Los nombres automatizados coinciden con JUnit; los U01–U23 son identificadores de catálogo.

## Pipeline

1. Crear un pipeline desde el repositorio GitHub y seleccionar el archivo existente `azure-pipelines.yml` de `main`.
2. Autorizar la conexión solamente para este repositorio y pipeline.
3. Ejecutar el pipeline y revisar Tests: 37 casos API y 23 automatizados.
4. Descargar el artefacto `resultados-pruebas` para conservar evidencia.

Si la organización no dispone de capacidad en agentes Microsoft-hosted, se requiere habilitar esa capacidad o configurar un agente propio; el YAML por sí solo no proporciona un agente. No se ha contratado capacidad de pago.

Los documentos de `docs/entrega/` corresponden a la validación local original del 8 de octubre de 2026. Los resultados nuevos de CI se consultan en Azure DevOps. No se copian credenciales, cookies ni tokens a los reportes.

Referencias: [PublishTestResults](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-test-results-v2?view=azure-pipelines), [importación de Test Plans](https://learn.microsoft.com/en-us/azure/devops/test/bulk-import-export-test-cases?view=azure-devops).
