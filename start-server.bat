@echo off
REM Script para Windows que sempre inicia o servidor no diretório correto
cd /d "%~dp0"
echo.
echo ========================================
echo Iniciando servidor no diretório:
echo %CD%
echo ========================================
echo.

REM Verifica se a porta está em uso e oferece opção de limpar
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 2^>nul') do (
    echo ⚠️  Porta 8000 já está em uso (PID: %%a)
    echo.
    choice /C SN /M "Deseja finalizar o processo e continuar? (S)im / (N)ão"
    if errorlevel 2 goto :skip_kill
    if errorlevel 1 (
        echo Finalizando processo...
        taskkill /F /PID %%a >nul 2>&1
        timeout /t 1 /nobreak >nul
        echo ✅ Processo finalizado
        echo.
    )
)

:skip_kill
REM Tenta usar Node.js primeiro (server.js)
if exist "server.js" (
    node server.js
) else if exist "package.json" (
    REM Usa npm start se disponível
    call npm start
) else (
    REM Fallback para Python
    python -m http.server 8000
)

if errorlevel 1 (
    echo.
    echo Erro ao iniciar servidor!
    echo Pressione qualquer tecla para sair...
    pause >nul
)

