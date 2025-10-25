# Script para reiniciar el servidor
Write-Host "🔄 Deteniendo procesos de Node.js..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "⏱️ Esperando 2 segundos..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "🚀 Iniciando servidor..." -ForegroundColor Green
npm start