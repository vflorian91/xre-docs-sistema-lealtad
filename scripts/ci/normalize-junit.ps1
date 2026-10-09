param(
    [Parameter(Mandatory = $true)][string]$ReportPath,
    [int]$ExpectedCount = 23
)

$ErrorActionPreference = 'Stop'
$resolvedReport = (Resolve-Path -LiteralPath $ReportPath).Path
$report = New-Object System.Xml.XmlDocument
$report.Load($resolvedReport)
$root = $report.DocumentElement
if ($root.Name -ne 'testsuites' -and $root.Name -ne 'testsuite') {
    throw 'El reporte no tiene una raiz JUnit reconocida.'
}

# Node.js 22 can emit testcases directly under testsuites. Azure requires a testsuite.
# Move the original XML nodes so failures, skipped tests and names remain intact.
$directCases = @($root.SelectNodes('testcase'))
if ($root.Name -eq 'testsuites' -and $directCases.Count -gt 0) {
    $suite = $report.CreateElement('testsuite')
    [void]$root.AppendChild($suite)
    foreach ($testCase in $directCases) { [void]$suite.AppendChild($testCase) }
} elseif ($root.Name -eq 'testsuite') {
    $suite = $root
} else {
    $suites = @($root.SelectNodes('testsuite'))
    if ($suites.Count -ne 1) { throw 'Se esperaba una sola suite de reglas automatizadas.' }
    $suite = $suites[0]
}

$cases = @($suite.SelectNodes('testcase'))
if ($cases.Count -ne $ExpectedCount) {
    throw "Reporte incompleto: se esperaban $ExpectedCount casos y se encontraron $($cases.Count)."
}
$failures = @($cases | Where-Object { $null -ne $_.SelectSingleNode('failure') }).Count
$errors = @($cases | Where-Object { $null -ne $_.SelectSingleNode('error') }).Count
$skipped = @($cases | Where-Object { $null -ne $_.SelectSingleNode('skipped') }).Count
$seconds = 0.0
foreach ($testCase in $cases) {
    if ($testCase.HasAttribute('time')) {
        $seconds += [double]::Parse($testCase.GetAttribute('time'), [Globalization.CultureInfo]::InvariantCulture)
    }
}
$suite.SetAttribute('name', 'XRE Docs - pruebas automatizadas')
$suite.SetAttribute('tests', [string]$cases.Count)
$suite.SetAttribute('failures', [string]$failures)
$suite.SetAttribute('errors', [string]$errors)
$suite.SetAttribute('skipped', [string]$skipped)
$suite.SetAttribute('time', $seconds.ToString('0.######', [Globalization.CultureInfo]::InvariantCulture))
$settings = New-Object System.Xml.XmlWriterSettings
$settings.Encoding = New-Object System.Text.UTF8Encoding($false)
$settings.Indent = $true
$writer = [System.Xml.XmlWriter]::Create($resolvedReport, $settings)
try { $report.Save($writer) } finally { $writer.Dispose() }
Write-Host "JUnit compatible con Azure: $($cases.Count) casos; $failures fallas; $errors errores; $skipped omitidos."
