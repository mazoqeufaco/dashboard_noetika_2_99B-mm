@echo off
title Servidor Node.js - Porta 8000
color 0A
cls

echo.
echo ================================================
echo    SERVIDOR NODE.JS - FRONTEND
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
echo Iniciando servidor Node.js...
echo.

node server.js

if errorlevel 1 (
    echo.
    echo ERRO ao iniciar servidor!
    echo.
    echo Verifique:
    echo   1. Node.js está instalado? (node --version)
    echo   2. Dependências instaladas? (npm install)
    echo   3. Arquivo server.js existe?
    echo.
    pause
)

