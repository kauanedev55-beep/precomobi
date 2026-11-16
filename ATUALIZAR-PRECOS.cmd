@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 tools\coletor_precos.py --abrir
) else (
  python tools\coletor_precos.py --abrir
)
if errorlevel 1 echo Verifique se o Python 3 esta instalado e se ha conexao com a internet.
pause
