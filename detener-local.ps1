$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
docker compose -f docker-compose.yml -f docker-compose.local.yml stop api admin-web client-pwa driver-pwa postgres
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron detener los servicios locales.' }
