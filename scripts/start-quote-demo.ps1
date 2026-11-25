$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$apiBase = 'http://127.0.0.1:4100/api'
$apiDirectory = Join-Path $projectRoot 'apps\api'
$apiEntryPoint = Join-Path $apiDirectory 'src\index.js'
$apiDataDirectory = Join-Path $projectRoot '.dev\quote-demo-api-data'
$stateDirectory = Join-Path $projectRoot '.dev'
$statePath = Join-Path $stateDirectory 'quote-demo-processes.json'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Get-Listeners($port) {
  @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

$expectedQuotes = @(
  @{ Ref = 'WQ-2026-4778584AC255D77A4C7C'; Quote = 'Q2026-0002' },
  @{ Ref = 'WQ-2026-E6C17F49F41A3CAE9A7C'; Quote = 'Q2026-0003' },
  @{ Ref = 'WQ-2026-079D20628548E52904F2'; Quote = 'Q2026-0004' }
)

New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
$previousApiEntry = $null
if (Test-Path -LiteralPath $statePath) {
  $previousState = ConvertFrom-Json -InputObject (Get-Content -LiteralPath $statePath -Raw)
  $previousApiEntry = $previousState | Where-Object { $_.Port -eq 4100 -and $_.Name -eq 'Quote-demo API' } | Select-Object -First 1
}

$apiProcess = $null
$apiStartedHere = $false
$apiListeners = Get-Listeners 4100
if (-not $apiListeners) {
  $nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
  $previousApiEnvironment = @{
    PORT = $env:PORT
    NODE_ENV = $env:NODE_ENV
    QUOTE_DEMO_SEED_ENABLED = $env:QUOTE_DEMO_SEED_ENABLED
    PRIVATE_STORAGE_DIR = $env:PRIVATE_STORAGE_DIR
    DATA_ENCRYPTION_KEY = $env:DATA_ENCRYPTION_KEY
  }
  try {
    $env:PORT = '4100'
    $env:NODE_ENV = 'test'
    $env:QUOTE_DEMO_SEED_ENABLED = 'true'
    $env:PRIVATE_STORAGE_DIR = $apiDataDirectory
    $env:DATA_ENCRYPTION_KEY = ''
    $apiProcess = Start-Process -FilePath $nodeExecutable `
      -ArgumentList @($apiEntryPoint) `
      -WorkingDirectory $apiDirectory `
      -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $stateDirectory 'quote-demo-api.stdout.log') `
      -RedirectStandardError (Join-Path $stateDirectory 'quote-demo-api.stderr.log') `
      -PassThru
    $apiStartedHere = $true
  } finally {
    foreach ($name in $previousApiEnvironment.Keys) {
      if ($null -eq $previousApiEnvironment[$name]) {
        Remove-Item "Env:\$name" -ErrorAction SilentlyContinue
      } else {
        Set-Item "Env:\$name" -Value $previousApiEnvironment[$name]
      }
    }
  }
}

try {
  $deadline = (Get-Date).AddSeconds(45)
  $health = $null
  while ((Get-Date) -lt $deadline) {
    if ($apiStartedHere -and -not (Get-Process -Id $apiProcess.Id -ErrorAction SilentlyContinue)) {
      break
    }
    try {
      $health = Invoke-RestMethod -Uri "$apiBase/health" -TimeoutSec 3
      break
    } catch {
      Start-Sleep -Milliseconds 300
    }
  }
  if (-not $health) {
    $stderrPath = Join-Path $stateDirectory 'quote-demo-api.stderr.log'
    $stdoutPath = Join-Path $stateDirectory 'quote-demo-api.stdout.log'
    $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { '' }
    $stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw } else { '' }
    throw "The quote-demo API did not start on port 4100.`n$stderr`n$stdout"
  }
  if ($health.environment -ne 'test') {
    throw 'Port 4100 is not reporting the isolated test environment; refusing to connect demo UI to it.'
  }
  foreach ($expected in $expectedQuotes) {
    $request = Invoke-RestMethod -Uri "$apiBase/requests/$($expected.Ref)" -TimeoutSec 4
    if ($request.ref -ne $expected.Ref -or
      ($request.quoteBreakdown -and $request.quoteBreakdown.quoteNumber -ne $expected.Quote)) {
      throw "Required synthetic request $($expected.Ref) is not present in the isolated demo API."
    }
  }
} catch {
  if ($apiStartedHere -and (Get-Process -Id $apiProcess.Id -ErrorAction SilentlyContinue)) {
    Stop-Process -Id $apiProcess.Id -Force
  }
  throw
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
  if ($apiStartedHere -and (Get-Process -Id $apiProcess.Id -ErrorAction SilentlyContinue)) {
    Stop-Process -Id $apiProcess.Id -Force
  }
  throw
}

$state = @()
if ($apiStartedHere) {
  $apiListener = Get-Listeners 4100 | Select-Object -First 1
  if ($apiListener -and $apiListener.OwningProcess -eq $apiProcess.Id) {
    $liveApiProcess = Get-Process -Id $apiProcess.Id
    $state += [pscustomobject]@{
      Name = 'Quote-demo API'
      Port = 4100
      PID = $apiProcess.Id
      StartedAtUtc = $liveApiProcess.StartTime.ToUniversalTime().ToString('o')
      CommandNeedle = $apiEntryPoint
    }
  }
} elseif ($previousApiEntry) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($previousApiEntry.PID)" -ErrorAction SilentlyContinue
  $liveProcess = Get-Process -Id $previousApiEntry.PID -ErrorAction SilentlyContinue
  $ownsPort = Get-Listeners 4100 | Where-Object { $_.OwningProcess -eq [int]$previousApiEntry.PID }
  $sameStart = $liveProcess -and $liveProcess.StartTime.ToUniversalTime().Ticks -eq [DateTimeOffset]::Parse([string]$previousApiEntry.StartedAtUtc).UtcDateTime.Ticks
  if ($process -and $liveProcess -and $process.Name -eq 'node.exe' -and
    $process.CommandLine.IndexOf($apiEntryPoint, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
    $ownsPort -and $sameStart) {
    $state += $previousApiEntry
  }
}
foreach ($service in $services) {
  $listener = Get-Listeners $service.Port | Select-Object -First 1
  $process = Get-Process -Id $listener.OwningProcess
  $state += [pscustomobject]@{
    Name = $service.Name
    Port = $service.Port
    PID = $listener.OwningProcess
    StartedAtUtc = $process.StartTime.ToUniversalTime().ToString('o')
    CommandNeedle = $service.Vite
  }
}
[System.IO.File]::WriteAllText($statePath, (ConvertTo-Json -InputObject @($state) -Depth 3), $utf8NoBom)

Write-Output 'Isolated quote demo is ready:'
Write-Output '  Customer: http://localhost:3000/track-request?ref=WQ-2026-4778584AC255D77A4C7C'
Write-Output '  Staff:    http://localhost:3001/'
Write-Output '  API:      isolated test API on port 4100 with persistent encrypted local demo data'
Write-Output '  Stop:     npm run demo:quotes:stop (demo records are preserved)'
