$ErrorActionPreference = "Stop"

$spikeRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifest = Join-Path $spikeRoot "runtime-manifest.json"
$lock = Join-Path $spikeRoot "runtime-manifest.lock"
$worker = Join-Path $spikeRoot "target\release\magic-rust-worker-runtime-spike.exe"
$port = 45275
$token = "verify-token"

Remove-Item -LiteralPath $manifest -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $lock -Force -ErrorAction SilentlyContinue

cargo build --release --manifest-path (Join-Path $spikeRoot "Cargo.toml") | Out-Host

function Start-Worker {
  $env:MAGIC_WORKER_PORT = "$port"
  $env:MAGIC_WORKER_MANIFEST = $manifest
  $env:MAGIC_WORKER_TOKEN = $token
  return Start-Process -FilePath $worker -WorkingDirectory $spikeRoot -PassThru -WindowStyle Hidden
}

function Wait-Manifest([int]$expectedPid = 0) {
  for ($i = 0; $i -lt 50; $i++) {
    if (Test-Path -LiteralPath $manifest) {
      try {
        $candidate = Get-Content -Raw -LiteralPath $manifest | ConvertFrom-Json
        if ($expectedPid -eq 0 -or [int]$candidate.pid -eq $expectedPid) { return $candidate }
      } catch {}
    }
    Start-Sleep -Milliseconds 100
  }
  throw "worker manifest did not appear"
}

function Invoke-WorkerHealth {
  return Invoke-RestMethod -Uri "http://127.0.0.1:$port/health" -Headers @{ "X-Magic-Worker-Token" = $token }
}

$first = Start-Worker
$firstManifest = Wait-Manifest
$health = Invoke-WorkerHealth
if (-not $health.healthy) { throw "health check was not healthy" }
if ([int]$firstManifest.pid -ne $first.Id) { throw "manifest PID mismatch" }
Write-Host "PASS: start + manifest + authenticated health (pid=$($first.Id))"

$duplicate = Start-Process -FilePath $worker -WorkingDirectory $spikeRoot -Wait -PassThru -WindowStyle Hidden
if ($duplicate.ExitCode -ne 17) { throw "duplicate worker exit code was $($duplicate.ExitCode), expected 17" }
Write-Host "PASS: duplicate start rejected by single-instance lock"

$dummy = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-Command", "Start-Sleep -Seconds 30" -PassThru -WindowStyle Hidden
Stop-Process -Id $dummy.Id -Force
Start-Sleep -Milliseconds 300
$stillHealthy = Invoke-WorkerHealth
if (-not $stillHealthy.healthy) { throw "worker stopped when unrelated desktop process exited" }
Write-Host "PASS: worker survives unrelated desktop process exit"

Stop-Process -Id $first.Id -Force
Start-Sleep -Milliseconds 300
if (-not (Test-Path -LiteralPath $manifest)) { throw "manifest disappeared after crash simulation" }
if (-not (Test-Path -LiteralPath $lock)) { throw "lock disappeared after crash simulation" }
Write-Host "PASS: crash leaves manifest + lock evidence for recovery"

$staleManifest = Get-Content -Raw -LiteralPath $manifest | ConvertFrom-Json
if (Get-Process -Id ([int]$staleManifest.pid) -ErrorAction SilentlyContinue) { throw "old worker PID is still alive" }
Remove-Item -LiteralPath $lock -Force
$second = Start-Worker
$secondManifest = Wait-Manifest $second.Id
$secondHealth = Invoke-WorkerHealth
if (-not $secondHealth.healthy) { throw "restarted worker is not healthy" }
if ([string]$secondManifest.instance_id -eq [string]$staleManifest.instance_id) { throw "restart reused stale instance identity" }
if ([int]$secondManifest.pid -ne $second.Id) { throw "restart manifest PID mismatch" }
Write-Host "PASS: stale evidence inspected, worker restarted and rediscovered (pid=$($second.Id))"

Stop-Process -Id $second.Id -Force
Remove-Item -LiteralPath $manifest -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $lock -Force -ErrorAction SilentlyContinue
Write-Host "Worker runtime spike verification complete"
