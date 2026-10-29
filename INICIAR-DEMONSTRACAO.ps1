$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Test-Path '.venv\Scripts\python.exe')) {
    py -3.12 -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Instale Python 3.12 e tente novamente.' }
}
& .venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
if ($LASTEXITCODE -ne 0) { throw 'Falha instalando Python.' }
Push-Location frontend
npm ci
if ($LASTEXITCODE -ne 0) { throw 'Falha instalando frontend.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Falha compilando frontend.' }
Pop-Location
$env:DEMO_MODE = 'true'
$env:APP_ENV = 'development'
$env:DATABASE_URL = 'sqlite:///../data/demonstracao.db'
Write-Host 'Abra http://127.0.0.1:8000/login e clique em Explorar demonstracao.'
Set-Location backend
& ..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
