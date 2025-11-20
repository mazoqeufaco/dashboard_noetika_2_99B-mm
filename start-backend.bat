@echo off
title Backend Python - Porta 5000
color 0B
cls

echo.
echo ================================================
echo    BACKEND PYTHON - NOETIKA
echo ================================================
echo.

cd /d "%~dp0"

REM Mata processos na porta 5000
echo Limpando porta 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 2^>nul') do (
    echo Finalizando PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo.
echo Iniciando backend Python...
echo.

python backend.py

if errorlevel 1 (
    echo.
    echo ERRO ao iniciar backend!
    echo.
    echo Verifique:
    echo   1. Python está instalado?
    echo   2. Dependências instaladas? (pip install -r requirements.txt)
    echo   3. Arquivo backend.py existe?
    echo.
    pause
)

