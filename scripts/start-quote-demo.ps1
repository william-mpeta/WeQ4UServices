$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$apiBase = 'http://127.0.0.1:4100/api'
$stateDirectory = Join-Path $projectRoot '.dev'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Get-Listeners($port) {
  @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

$expectedQuotes = @(
  @{ Ref = 'WQ-2026-4778584AC255D77A4C7C'; Quote = 'Q2026-0002' },
  @{ Ref = 'WQ-2026-E6C17F49F41A3CAE9A7C'; Quote = 'Q2026-0003' },
  @{ Ref = 'WQ-2026-079D20628548E52904F2'; Quote = 'Q2026-0004' }
)

try {
  $health = Invoke-RestMethod -Uri "$apiBase/health" -TimeoutSec 4
} catch {
  throw "The isolated quote-demo API is unavailable at http://localhost:4100. Start that isolated API first; this script will not fall back to the regular API on port 4000."
}

if ($health.environment -ne 'test') {
  throw "Port 4100 is not reporting the isolated test environment; refusing to connect demo UI to it."
}

foreach ($expected in $expectedQuotes) {
  try {
    $request = Invoke-RestMethod -Uri "$apiBase/requests/$($expected.Ref)" -TimeoutSec 4
  } catch {
    throw "Required synthetic request $($expected.Ref) is missing from the isolated demo API."
  }
  if ($request.quoteBreakdown.quoteNumber -ne $expected.Quote -or $request.status -ne 'Your quote is ready') {
    throw "Synthetic request $($expected.Ref) does not match expected quote $($expected.Quote) and awaiting-decision status."
  }
}

$storefrontVite = Join-Path $projectRoot 'apps\storefront\node_modules\vite\bin\vite.js'
$adminVite = Join-Path $projectRoot 'apps\admin\node_modules\vite\bin\vite.js'
$listeners = @()
$listeners += Get-Listeners 3000
$listeners += Get-Listeners 3001

foreach ($listener in $listeners) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
  $expectedVite = if ($listener.LocalPort -eq 3000) { $storefrontVite } else { $adminVite }
  if (-not $process -or $process.Name -ne 'node.exe' -or
      $process.CommandLine.IndexOf($expectedVite, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
    throw "Port $($listener.LocalPort) is occupied by a process that is not this project's expected Vite app. No process was stopped."
  }
}

foreach ($listener in $listeners) {
  Stop-Process -Id $listener.OwningProcess -Force
}
Start-Sleep -Milliseconds 500

New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
$nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
$services = @(
  @{
    Name = 'Quote-demo storefront'
    Port = 3000
    Directory = Join-Path $projectRoot 'apps\storefront'
    Vite = $storefrontVite
  },
  @{
    Name = 'Quote-demo admin'
    Port = 3001
    Directory = Join-Path $projectRoot 'apps\admin'
    Vite = $adminVite
  }
)
$started = @()
$oldApiBase = $env:VITE_API_BASE_URL
$oldProxyTarget = $env:VITE_API_PROXY_TARGET

try {
  $env:VITE_API_BASE_URL = '/api'
  $env:VITE_API_PROXY_TARGET = 'http://127.0.0.1:4100'

  foreach ($service in $services) {
    $logName = if ($service.Port -eq 3000) { 'quote-demo-storefront' } else { 'quote-demo-admin' }
    $process = Start-Process -FilePath $nodeExecutable `
      -ArgumentList @($service.Vite, '--host', '127.0.0.1', '--port', [string]$service.Port, '--strictPort') `
      -WorkingDirectory $service.Directory `
      -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $stateDirectory "$logName.stdout.log") `
      -RedirectStandardError (Join-Path $stateDirectory "$logName.stderr.log") `
      -PassThru
    $started += $process
  }
} finally {
  $env:VITE_API_BASE_URL = $oldApiBase
  $env:VITE_API_PROXY_TARGET = $oldProxyTarget
}

try {
  foreach ($service in $services) {
    $deadline = (Get-Date).AddSeconds(30)
    $listener = $null
    while ((Get-Date) -lt $deadline) {
      $listener = Get-Listeners $service.Port | Select-Object -First 1
      if ($listener) { break }
      Start-Sleep -Milliseconds 300
    }
    if (-not $listener) {
      throw "$($service.Name) did not start on port $($service.Port). Check the logs under .dev."
    }
    $healthResponse = Invoke-RestMethod -Uri "http://127.0.0.1:$($service.Port)/api/health" -TimeoutSec 5
    if ($healthResponse.environment -ne 'test') {
      throw "$($service.Name) is not proxying to the isolated test API."
    }
  }
} catch {
  foreach ($service in $services) {
    foreach ($listener in (Get-Listeners $service.Port)) {
      $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
      if ($process -and $process.Name -eq 'node.exe' -and
          $process.CommandLine.IndexOf($service.Vite, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
        Stop-Process -Id $listener.OwningProcess -Force
      }
    }
  }
  throw
}

$state = foreach ($service in $services) {
  $listener = Get-Listeners $service.Port | Select-Object -First 1
  $process = Get-Process -Id $listener.OwningProcess
  [pscustomobject]@{
    Name = $service.Name
    Port = $service.Port
    PID = $listener.OwningProcess
    StartedAtUtc = $process.StartTime.ToUniversalTime().ToString('o')
    CommandNeedle = $service.Vite
  }
}
$statePath = Join-Path $stateDirectory 'quote-demo-processes.json'
[System.IO.File]::WriteAllText($statePath, (ConvertTo-Json -InputObject @($state) -Depth 3), $utf8NoBom)

Write-Output 'Isolated quote demo is ready:'
Write-Output '  Customer: http://localhost:3000/track-request?ref=WQ-2026-4778584AC255D77A4C7C'
Write-Output '  Staff:    http://localhost:3001/'
Write-Output '  API:      isolated test API on port 4100 (regular API port 4000 is unchanged)'
Write-Output '  Stop UI:  npm run demo:quotes:stop'
