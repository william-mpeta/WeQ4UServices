$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$stateDirectory = Join-Path $projectRoot '.dev'
$statePath = Join-Path $stateDirectory 'processes.json'

function Get-ListeningProcessIds($port) {
  foreach ($line in (& netstat.exe -ano -p tcp)) {
    if ($line -match '^\s*TCP\s+\S+:(?<Port>\d+)\s+\S+\s+LISTENING\s+(?<PID>\d+)\s*$' -and [int]$Matches.Port -eq [int]$port) {
      [int]$Matches.PID
    }
  }
}

if (Test-Path -LiteralPath $statePath) {
  $parsedEntries = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
  if ($parsedEntries -is [array] -and $parsedEntries.Count -eq 1 -and $parsedEntries[0] -is [array]) {
    $entries = $parsedEntries[0]
  } else {
    $entries = @($parsedEntries)
  }
  foreach ($entry in $entries) {
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.PID)" -ErrorAction SilentlyContinue
    $liveProcess = Get-Process -Id $entry.PID -ErrorAction SilentlyContinue
    if (-not $liveProcess) {
      Write-Output "$($entry.Name): launcher process $($entry.PID) has already exited."
      continue
    }

    $startedAtTicks = if ($liveProcess) { $liveProcess.StartTime.ToUniversalTime().Ticks } else { 0 }
    $recordedStartUtc = [DateTimeOffset]::Parse([string]$entry.StartedAtUtc, [Globalization.CultureInfo]::InvariantCulture).UtcDateTime
    $recordedStartTicks = $recordedStartUtc.Ticks
    $sameStart = $startedAtTicks -eq $recordedStartTicks
    $sameCommand = $processInfo -and $processInfo.CommandLine -and $processInfo.CommandLine.IndexOf([string]$entry.CommandNeedle, [StringComparison]::OrdinalIgnoreCase) -ge 0
    $ownsRecordedPort = (Get-ListeningProcessIds $entry.Port) -contains [int]$entry.PID
    # Some Windows environments deny command-line inspection to the current shell.
    # The persisted launch ledger plus matching process start time and owned port
    # is sufficient to identify this exact process without touching other listeners.
    $verified = $sameStart -and $ownsRecordedPort -and ((-not $processInfo) -or $sameCommand)
    if (-not $verified) {
      Write-Warning "$($entry.Name): PID $($entry.PID) no longer matches the recorded launcher; leaving it untouched."
      continue
    }

    Stop-Process -Id $entry.PID -Force
    Write-Output "Stopped $($entry.Name) service process (PID $($entry.PID))."
  }
  Remove-Item -LiteralPath $statePath -Force
}
else {
  Write-Output 'No managed process list found; checking for legacy WeQ4UServices Vite servers.'
}

# Older npm/concurrently runs were not recorded in .dev. Stop only Vite listeners
# whose command line identifies this exact project and the expected app folder.
$projectPath = $projectRoot.TrimEnd('\')
$appByPort = @{ 3000 = 'apps\storefront\'; 3001 = 'apps\admin\' }
$stoppedPids = @{}
foreach ($port in @(3000, 3001, 4000)) {
  foreach ($processId in (Get-ListeningProcessIds $port)) {
    if ($stoppedPids.ContainsKey([string]$processId)) { continue }
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
    if (-not $processInfo -or $processInfo.Name -ne 'node.exe') { continue }
    $commandLine = [string]$processInfo.CommandLine
    $isProjectVite = $port -ne 4000 -and
      $commandLine.IndexOf($projectPath, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
      $commandLine.IndexOf($appByPort[$port], [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
      $commandLine.IndexOf('vite\bin\vite.js', [StringComparison]::OrdinalIgnoreCase) -ge 0
    $isProjectApi = $port -eq 4000 -and $commandLine -match '(?i)(^|\s)src[\\/]index\.js(?:\s|$)'
    if (-not ($isProjectVite -or $isProjectApi)) {
      Write-Warning "Port $port is held by PID $processId, which is not a verified WeQ4UServices process; leaving it untouched."
      continue
    }

    & taskkill.exe /PID $processId /T /F | Out-Null
    $stoppedPids[[string]$processId] = $true
    Write-Output "Stopped legacy WeQ4UServices process on port $port (PID $processId)."
  }
}
