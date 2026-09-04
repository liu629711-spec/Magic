param(
  [ValidateSet('prepare', 'run', 'verify')]
  [string]$Mode = 'verify'
)

$ErrorActionPreference = 'Stop'
$pocRoot = Split-Path -Parent $PSCommandPath
$harnessRoot = Join-Path $pocRoot '..\..\reference-project\deepseek-harness'
$runtimeRoot = Join-Path $pocRoot 'runtime'
$pluginRoot = Join-Path $pocRoot 'magic-dsh-poc-plugin'
$workspaceRoot = Join-Path $pocRoot 'workspace'
$evidencePath = Join-Path $pocRoot 'evidence\result.json'
$profile = 'magic-poc'

New-Item -ItemType Directory -Force -Path $runtimeRoot, $workspaceRoot, (Split-Path -Parent $evidencePath) | Out-Null
$env:DSH_HOME = $runtimeRoot
$env:MAGIC_DSH_POC_WORKSPACE = $workspaceRoot
$env:MAGIC_DSH_POC_EVIDENCE = $evidencePath
$env:DSH_TELEMETRY_DISABLED = '1'

Push-Location $harnessRoot
try {
  if ($Mode -eq 'prepare') {
    pnpm dsh plugin --profile $profile add $pluginRoot
    pnpm dsh plugin --profile $profile add .\packages\bundle\web-app
    pnpm dsh --profile $profile --dump-config | Set-Content (Join-Path $pocRoot 'evidence\composed-config.yml')
    exit $LASTEXITCODE
  }

  if ($Mode -eq 'run') {
    pnpm dsh --profile $profile --patch (Join-Path $pocRoot 'launch.patch.yml') --no-open
    exit $LASTEXITCODE
  }

  if (-not (Test-Path $evidencePath)) {
    throw "Evidence not found. Run .\\run-validation.ps1 -Mode prepare, then -Mode run."
  }
  Get-Content $evidencePath
} finally {
  Pop-Location
}
