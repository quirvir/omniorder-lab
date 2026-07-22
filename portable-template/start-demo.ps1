$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = Join-Path $root "runtime\node.exe"
$cli = Join-Path $root "app\node_modules\vinext\dist\cli.js"
$runDir = Join-Path $root "run"
$pidFile = Join-Path $runDir "omniorder.pid"

if (-not (Test-Path $node) -or -not (Test-Path $cli)) {
  throw "El kit está incompleto. Extrae todo el ZIP antes de ejecutar este archivo."
}
if (Test-Path $pidFile) {
  $existing = Get-Content $pidFile
  if (Get-Process -Id $existing -ErrorAction SilentlyContinue) {
    Start-Process "http://127.0.0.1:3000"
    exit 0
  }
  Remove-Item $pidFile -Force
}

New-Item -ItemType Directory -Force -Path $runDir | Out-Null
$process = Start-Process -FilePath $node -ArgumentList @($cli, "start", "--hostname", "127.0.0.1", "--port", "3000") -WorkingDirectory (Join-Path $root "app") -PassThru
$process.Id | Set-Content $pidFile
Start-Sleep -Seconds 3
Start-Process "http://127.0.0.1:3000"
Write-Host "OmniOrder Demo iniciado en http://127.0.0.1:3000"
