@echo off
REM Script que mata processos na porta 8000 e inicia o servidor
cd /d "%~dp0"

echo.
echo ========================================
echo Limpando porta 8000...
echo ========================================
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 2^>nul') do (
    echo Finalizando processo PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 1 /nobreak >nul

echo.
echo ========================================
echo Iniciando servidor...
echo ========================================
echo.

if exist "server.js" (
    node server.js
) else if exist "package.json" (
    npm start
) else (
    python -m http.server 8000
)

if errorlevel 1 (
    echo.
    echo Erro ao iniciar servidor!
    pause
)

