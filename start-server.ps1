# Script PowerShell que sempre inicia o servidor no diretório correto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Iniciando servidor no diretório:" -ForegroundColor Cyan
Write-Host $PWD -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Tenta usar Node.js primeiro (server.js)
if (Test-Path "server.js") {
    node server.js
} elseif (Test-Path "package.json") {
    # Usa npm start se disponível
    npm start
} else {
    # Fallback para Python
    python -m http.server 8000
}

