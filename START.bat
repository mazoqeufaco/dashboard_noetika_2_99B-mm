@echo off
title Servidor Dashboard - Porta 8000
color 0A
cls

echo.
echo ================================================
echo    SERVIDOR DASHBOARD NOETIKA
echo ================================================
echo.

cd /d "%~dp0"

REM Mata processos na porta 8000
echo Limpando porta 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 2^>nul') do (
    echo Finalizando PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo.
echo Iniciando servidor...
echo.

if exist "server-simple.js" (
    node server-simple.js
) else if exist "server.js" (
    node server.js
) else (
    echo ERRO: Arquivo server.js nao encontrado!
    pause
    exit /b 1
)

if errorlevel 1 (
    echo.
    echo ERRO ao iniciar servidor!
    pause
)

