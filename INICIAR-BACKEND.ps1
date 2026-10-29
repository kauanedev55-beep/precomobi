$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'PREPARAR-CONFIG-LOCAL.ps1')
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'Erro nas configuracoes locais.' }
Set-Location (Join-Path $PSScriptRoot 'backend')
$venvPython = '.\.venv\Scripts\python.exe'
if (-not (Test-Path $venvPython)) {
    $versions = @('3.13', '3.12', '3.11')
    $created = $false
    foreach ($version in $versions) {
        & py "-$version" --version *> $null
        if ($LASTEXITCODE -eq 0) {
            & py "-$version" -m venv .venv
            if ($LASTEXITCODE -ne 0) { throw "Falha criando venv para Python $version." }
            $created = $true
            break
        }
    }
    if (-not $created) { throw 'Python 3.11, 3.12 ou 3.13 nao encontrado. Execute py --list-paths.' }
    & $venvPython -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependencias do backend.' }
}
& $venvPython -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
