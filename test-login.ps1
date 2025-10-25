# Script de pruebas para debugging del login - Windows PowerShell
# Ejecuta: .\test-login.ps1

Write-Host "🧪 TESTING LOGIN CON COOKIES - MercaloPOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Configuración
$BaseUrl = "http://localhost:3002"
$ApiUrl = "$BaseUrl/api"

Write-Host ""
Write-Host "1️⃣ PRUEBA: Health Check" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
    if ($healthResponse.status -eq "OK") {
        Write-Host "✅ Servidor funcionando" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Servidor no responde: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "2️⃣ PRUEBA: CORS Test" -ForegroundColor Yellow
Write-Host "-------------------" -ForegroundColor Yellow

try {
    $corsHeaders = @{
        'Origin' = 'http://localhost:3000'
    }
    $corsResponse = Invoke-RestMethod -Uri "$ApiUrl/test/cors" -Method Get -Headers $corsHeaders
    if ($corsResponse.success) {
        Write-Host "✅ CORS funcionando" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ CORS con problemas: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "3️⃣ PRUEBA: Login (REAL)" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Yellow
Write-Host "Intentando login con credenciales de prueba..." -ForegroundColor White

# Configurar sesión para cookies
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$loginHeaders = @{
    'Content-Type' = 'application/json'
    'Origin' = 'http://localhost:3000'
}

$loginBody = @{
    email = "admin@mitienda.com"
    password = "Admin123456!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$ApiUrl/auth/login" -Method Post -Headers $loginHeaders -Body $loginBody -WebSession $session
    
    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "Usuario: $($loginResponse.data.user.name)" -ForegroundColor Green
    Write-Host "Empresa: $($loginResponse.data.company.name)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "4️⃣ PRUEBA: Endpoint Protegido" -ForegroundColor Yellow
    Write-Host "----------------------------" -ForegroundColor Yellow
    
    try {
        $protectedHeaders = @{
            'Origin' = 'http://localhost:3000'
        }
        $profileResponse = Invoke-RestMethod -Uri "$ApiUrl/auth/profile" -Method Get -Headers $protectedHeaders -WebSession $session
        
        Write-Host "✅ Endpoint protegido funcionando con cookies" -ForegroundColor Green
        Write-Host "Perfil obtenido: $($profileResponse.data.user.email)" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Endpoint protegido falló: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Login falló: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Posibles causas:" -ForegroundColor Yellow
    Write-Host "- Credenciales incorrectas" -ForegroundColor White
    Write-Host "- CORS mal configurado" -ForegroundColor White
    Write-Host "- Servidor no está corriendo" -ForegroundColor White
    Write-Host "- Base de datos no conectada" -ForegroundColor White
    
    # Mostrar más detalles del error
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        if ($_.ErrorDetails.Message) {
            $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "Error Details: $($errorDetails.message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "🔍 Para más debugging, revisa los logs del servidor" -ForegroundColor Cyan