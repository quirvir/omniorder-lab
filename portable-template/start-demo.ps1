$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = Join-Path $root "runtime\node.exe"
$cli = Join-Path $root "app\node_modules\vinext\dist\cli.js"
$staticCache = Join-Path $root "app\node_modules\vinext\dist\server\static-file-cache.js"
$runDir = Join-Path $root "run"
$pidFile = Join-Path $runDir "omniorder.pid"

if (-not (Test-Path $node) -or -not (Test-Path $cli)) {
  throw "El kit está incompleto. Extrae todo el ZIP antes de ejecutar este archivo."
}
# Vinext genera rutas con separadores de Windows en su caché de archivos estáticos.
# Normalizarlas permite servir CSS y JavaScript desde /assets en equipos Windows.
if (Test-Path $staticCache) {
  $cacheSource = Get-Content -LiteralPath $staticCache -Raw
  $before = 'relativePath: path.relative(base, batch[j]),'
  $after = 'relativePath: path.relative(base, batch[j]).split(path.sep).join("/"),'
  if ($cacheSource.Contains($before)) {
    Set-Content -LiteralPath $staticCache -Value $cacheSource.Replace($before, $after) -Encoding UTF8
  }
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
$ready = $false
for ($attempt = 0; $attempt -lt 50 -and -not $ready; $attempt++) {
  Start-Sleep -Milliseconds 200
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $client.Connect("127.0.0.1", 3000)
    $ready = $client.Connected
    $client.Dispose()
  } catch { }
}
if (-not $ready) { throw "El servidor no inició en 10 segundos. Revisa la ventana de PowerShell." }
Start-Process "http://127.0.0.1:3000"
Write-Host "OmniOrder Demo iniciado en http://127.0.0.1:3000"
