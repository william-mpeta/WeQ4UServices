$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$stateDirectory = Join-Path $projectRoot '.dev'
$statePath = Join-Path $stateDirectory 'processes.json'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Get-ListeningProcessIds($port) {
  foreach ($line in (& netstat.exe -ano -p tcp)) {
    if ($line -match '^\s*TCP\s+\S+:(?<Port>\d+)\s+\S+\s+LISTENING\s+(?<PID>\d+)\s*$' -and [int]$Matches.Port -eq [int]$port) {
      [int]$Matches.PID
    }
  }
}

New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null

# Clean up a prior run started by this project's scripts before checking ports.
& (Join-Path $PSScriptRoot 'stop-dev.ps1')

$nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
$apiDirectory = Join-Path $projectRoot 'apps/api'
$storefrontDirectory = Join-Path $projectRoot 'apps/storefront'
$adminDirectory = Join-Path $projectRoot 'apps/admin'
$storefrontVite = Join-Path $storefrontDirectory 'node_modules/vite/bin/vite.js'
$adminVite = Join-Path $adminDirectory 'node_modules/vite/bin/vite.js'
$services = @(
  @{ Name = 'API'; Port = 4000; Directory = $apiDirectory; Arguments = @((Join-Path $apiDirectory 'src/index.js')); CommandNeedle = (Join-Path $apiDirectory 'src/index.js') },
  @{ Name = 'Storefront'; Port = 3000; Directory = $storefrontDirectory; Arguments = @($storefrontVite, '--host', '0.0.0.0', '--port', '3000'); CommandNeedle = $storefrontVite },
  @{ Name = 'Admin'; Port = 3001; Directory = $adminDirectory; Arguments = @($adminVite, '--host', '0.0.0.0', '--port', '3001'); CommandNeedle = $adminVite }
)

$occupied = foreach ($service in $services) {
  foreach ($processId in (Get-ListeningProcessIds $service.Port)) {
    $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
    [pscustomobject]@{
      Port = $service.Port
      App = $service.Name
      PID = $processId
      Process = $owner.Name
      CommandLine = $owner.CommandLine
    }
  }
}

if ($occupied) {
  $details = ($occupied | ForEach-Object { "port $($_.Port) ($($_.App)): PID $($_.PID), $($_.Process) - $($_.CommandLine)" }) -join [Environment]::NewLine
  throw "Required development ports are already in use. No untracked process was stopped:`n$details`nStop the process shown above, then run 'npm run dev' again."
}

$entries = @()
function Save-ProcessState {
  $json = ConvertTo-Json -InputObject @($script:entries) -Depth 4
  [System.IO.File]::WriteAllText($script:statePath, $json, $script:utf8NoBom)
}

try {
  foreach ($service in $services) {
    $stdoutPath = Join-Path $stateDirectory ($service.Name.ToLowerInvariant() + '.stdout.log')
    $stderrPath = Join-Path $stateDirectory ($service.Name.ToLowerInvariant() + '.stderr.log')
    $previousDemoSeedFlag = $env:QUOTE_DEMO_SEED_ENABLED
    try {
      if ($service.Name -eq 'API') { $env:QUOTE_DEMO_SEED_ENABLED = 'true' }
      $serverProcess = Start-Process -FilePath $nodeExecutable `
        -ArgumentList $service.Arguments `
        -WorkingDirectory $service.Directory `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath `
        -PassThru
    } finally {
      if ($service.Name -eq 'API') {
        if ($null -eq $previousDemoSeedFlag) {
          Remove-Item Env:\QUOTE_DEMO_SEED_ENABLED -ErrorAction SilentlyContinue
        } else {
          $env:QUOTE_DEMO_SEED_ENABLED = $previousDemoSeedFlag
        }
      }
    }

    $processStart = (Get-Process -Id $serverProcess.Id).StartTime.ToUniversalTime().ToString('o')
    $entries += [pscustomobject]@{
      Name = $service.Name
      Port = $service.Port
      PID = $serverProcess.Id
      StartedAtUtc = $processStart
      CommandNeedle = $service.CommandNeedle
    }
    Save-ProcessState

    $deadline = (Get-Date).AddSeconds(45)
    $listening = $false
    while ((Get-Date) -lt $deadline) {
      if (Get-ListeningProcessIds $service.Port) {
        $listening = $true
        break
      }
      if (-not (Get-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue)) { break }
      Start-Sleep -Milliseconds 500
    }

    if (-not $listening) {
      $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { '' }
      $stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw } else { '' }
      throw "$($service.Name) did not start on port $($service.Port) within 45 seconds.`n$stderr`n$stdout"
    }
  }
}
catch {
  Write-Output "Development server startup failed: $_"
  & (Join-Path $PSScriptRoot 'stop-dev.ps1')
  exit 1
}

Write-Output 'WeQ4UServices development servers are running:'
Write-Output '  Storefront: http://localhost:3000'
Write-Output '  Admin:      http://localhost:3001'
Write-Output '  API health: http://localhost:4000/api/health'
Write-Output "Logs:        $stateDirectory"
Write-Output 'Stop them later with: npm run dev:stop'
