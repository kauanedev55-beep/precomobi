& (Join-Path $PSScriptRoot 'PREPARAR-CONFIG-LOCAL.ps1')
if (-not $?) { throw 'Falha ao preparar configuracoes locais.' }
Set-Location (Join-Path $PSScriptRoot 'frontend')
if (-not (Test-Path 'node_modules')) {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependencias do frontend.' }
}
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
