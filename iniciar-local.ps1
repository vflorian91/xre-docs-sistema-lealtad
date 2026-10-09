$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d api admin-web client-pwa driver-pwa
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar la aplicación. Comprueba que Docker Desktop esté abierto.' }
Write-Host 'Administración: http://localhost:3000'
Write-Host 'Clientes: http://localhost:3002'
Write-Host 'Repartidores: http://localhost:3003'
