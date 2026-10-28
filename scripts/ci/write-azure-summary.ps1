param([string]$ResultsPath = './test-results')
$ErrorActionPreference = 'Stop'
$groups = @(@{File='api.xml';Expected=37}, @{File='unitarios.xml';Expected=27}, @{File='reliability.xml';Expected=43})
$results = @()
foreach ($group in $groups) {
    [xml]$report = Get-Content -LiteralPath (Join-Path $ResultsPath $group.File) -Raw
    $cases = @($report.SelectNodes('//testcase'))
    if ($cases.Count -ne $group.Expected) { throw "Cantidad incorrecta en $($group.File): $($cases.Count)" }
    $results += [pscustomobject][ordered]@{
        file = $group.File
        total = $cases.Count
        failed = @($cases | Where-Object { $_.SelectSingleNode('failure') -or $_.SelectSingleNode('error') }).Count
        skipped = @($cases | Where-Object { $_.SelectSingleNode('skipped') }).Count
    }
}
$summary = [ordered]@{
    environment = $(if ($env:BUILD_BUILDID) { 'Azure DevOps' } else { 'Docker CI local' })
    buildId = $env:BUILD_BUILDID
    buildNumber = $env:BUILD_BUILDNUMBER
    sourceVersion = $env:BUILD_SOURCEVERSION
    buildUrl = $(if ($env:BUILD_BUILDID) { "$($env:SYSTEM_COLLECTIONURI)$($env:SYSTEM_TEAMPROJECTID)/_build/results?buildId=$($env:BUILD_BUILDID)" } else { $null })
    recordedAt = [DateTime]::UtcNow.ToString('o')
    groups = $results
    total = ($results | Measure-Object -Property total -Sum).Sum
    failed = ($results | Measure-Object -Property failed -Sum).Sum
    skipped = ($results | Measure-Object -Property skipped -Sum).Sum
}
$summary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $ResultsPath 'azure-execution.json') -Encoding UTF8
Write-Host "Validacion: $($summary.total) pruebas, $($summary.failed) fallidas, $($summary.skipped) omitidas."
if ($summary.total -ne 107 -or $summary.failed -gt 0 -or $summary.skipped -gt 0) { throw 'La validacion no esta completa.' }
