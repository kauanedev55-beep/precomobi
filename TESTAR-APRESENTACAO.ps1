$ErrorActionPreference = 'Stop'
Write-Host 'TESTES DO PRECOMOBI (versao local)'
Set-Location $PSScriptRoot
Write-Host '1/3: compilacao frontend'
Push-Location frontend
if (-not (Test-Path node_modules)) { npm ci; if ($LASTEXITCODE -ne 0) { throw 'npm ci falhou' } }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build frontend falhou' }
Pop-Location
Write-Host '2/3: sintaxe Python'
Push-Location backend
$python = '.\.venv\Scripts\python.exe'
if (-not (Test-Path $python)) { throw 'Backend .venv ausente. Inicie INICIAR-BACKEND.ps1 primeiro.' }
& $python -m compileall -q app main.py
if ($LASTEXITCODE -ne 0) { throw 'Sintaxe Python falhou' }
Pop-Location
Write-Host '3/3: testes automatizados (sem acesso ao banco real)'
Push-Location backend
& $python -m pytest --version *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'pytest ausente. Instalando requirements-dev.txt'
  & $python -m pip install -r requirements-dev.txt
  if ($LASTEXITCODE -ne 0) { throw 'Falha instalando dependencias de testes' }
}
& $python -m pytest ../tests -q
if ($LASTEXITCODE -ne 0) { throw 'Testes backend falharam. Nao publicar sem analisar.' }
Pop-Location
Write-Host 'TESTES AUTOMATIZADOS CONCLUIDOS. Fluxo visual e Render ainda exigem validacao manual.'
