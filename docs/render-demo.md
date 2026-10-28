# Demostración gratuita en Render

`render.yaml` despliega cuatro servicios Docker y PostgreSQL 16 en Oregon. Todos usan explícitamente el plan `free`.

| Componente | Servicio |
|---|---|
| API NestJS | `xdoc-api-vflorian91` |
| Administración | `xdoc-admin-vflorian91` |
| Clientes | `xdoc-clientes-vflorian91` |
| Motoristas | `xdoc-motoristas-vflorian91` |
| PostgreSQL | `xdoc-db-vflorian91` (sin acceso público) |

En Render: **New → Blueprint → Public Git Repository**, seleccionar este repositorio y `render.yaml`. Proporcionar contraseñas privadas diferentes para `SEED_SUPER_ADMIN_PASSWORD`, `DEMO_CUSTOMER_PASSWORD` y `DEMO_DRIVER_PASSWORD`. Las claves JWT se generan en Render; la conexión PostgreSQL se enlaza automáticamente. No guardar credenciales en GitHub.

El primer arranque aplica migraciones y carga permisos, catálogos, geografía de Guatemala, 70 productos, 108 pedidos ficticios y actividad de ejemplo. Activa `admin@example.com`, la cliente Ana (`xdoc.dashboard.1@example.com`) y la motorista Andrea (`xdoc.driver.2@example.com`). El administrador debe cambiar su contraseña al ingresar. Los reinicios conservan las contraseñas y los datos de PostgreSQL.

Cada portal utiliza `/proxy/api` en su propio dominio y cookies seguras. La conexión hacia la API usa su URL pública HTTPS, ya que los servicios gratuitos no reciben tráfico por la red privada. `API_INTERNAL_URL` se incorpora durante la construcción de Next.js.

El arranque restaura las imágenes originales del catálogo en el almacenamiento temporal. Las imágenes nuevas subidas por los usuarios se pierden al reemplazar o reiniciar la instancia. PostgreSQL gratuito vence a los 30 días; las aplicaciones se suspenden tras inactividad y comparten las horas gratuitas mensuales del espacio de trabajo. Esta configuración es para una demostración desechable.

Referencias: [servicios gratuitos](https://render.com/docs/free), [Blueprints](https://render.com/docs/blueprint-spec), [Docker](https://render.com/docs/docker).

## Acceso después de varios días

Los tres portales comprueban `/proxy/api/health` y esperan hasta tres minutos mientras arrancan el portal y la API. Solo se repite la comprobación de salud; pedidos, cobros y cambios administrativos se envían una sola vez. El dashboard muestra el estado de conexión durante la espera y un botón **Reintentar carga** si falla, sin presentar métricas en cero como si fueran datos reales.

Para diagnosticar, comprobar primero `/api/health` en la API y luego `/proxy/api/health` desde cada portal. Una respuesta HTML 502 durante el arranque no significa que PostgreSQL haya perdido los datos. Si la API permanece inaccesible, revisar los registros y límites de Render.
