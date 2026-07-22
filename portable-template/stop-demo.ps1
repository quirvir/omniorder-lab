$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $root "run\omniorder.pid"
if (Test-Path $pidFile) {
  $processId = Get-Content $pidFile
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  Remove-Item $pidFile -Force
}
Write-Host "OmniOrder Demo detenido."
