$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$stateDirectory = Join-Path $projectRoot '.dev'
$statePath = Join-Path $stateDirectory 'quote-demo-processes.json'

function Get-ListeningProcessIds($port) {
  @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique)
}

if (-not (Test-Path -LiteralPath $statePath)) {
  Write-Output 'No quote-demo UI process record was found; no processes were stopped.'
  exit 0
}

$entries = @(Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json)
foreach ($entry in $entries) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.PID)" -ErrorAction SilentlyContinue
  $liveProcess = Get-Process -Id $entry.PID -ErrorAction SilentlyContinue
  if (-not $process -or -not $liveProcess) {
    Write-Output "$($entry.Name): process is no longer running."
    continue
  }

  $sameCommand = $process.Name -eq 'node.exe' -and
    $process.CommandLine.IndexOf([string]$entry.CommandNeedle, [StringComparison]::OrdinalIgnoreCase) -ge 0
  $ownsPort = (Get-ListeningProcessIds $entry.Port) -contains [int]$entry.PID
  $recordedStart = [DateTimeOffset]::Parse([string]$entry.StartedAtUtc).UtcDateTime
  $sameStart = $liveProcess.StartTime.ToUniversalTime().Ticks -eq $recordedStart.Ticks

  if (-not ($sameCommand -and $ownsPort -and $sameStart)) {
    Write-Warning "$($entry.Name): PID $($entry.PID) no longer matches the recorded quote-demo UI; leaving it untouched."
    continue
  }

  Stop-Process -Id $entry.PID -Force
  Write-Output "Stopped $($entry.Name) on port $($entry.Port) (PID $($entry.PID))."
}

Remove-Item -LiteralPath $statePath -Force
Write-Output 'The isolated API on port 4100 and regular API on port 4000 were not stopped.'
