# Test simple de Login - PowerShell
# Ejecuta: .\test-simple.ps1

param(
    [string]$BaseUrl = "http://localhost:3002"
)

Write-Host "🧪 TEST LOGIN SIMPLE" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

# Configurar sesión para cookies
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Headers para el login
$headers = @{
    'Content-Type' = 'application/json'
    'Origin' = 'http://localhost:3000'
}

# Credenciales correctas de la base de datos
$loginData = @{
    email = "admin@tiendademo.com"
    password = "Admin123!"
} | ConvertTo-Json

Write-Host "Probando login con:" -ForegroundColor Yellow
Write-Host "Email: admin@tiendademo.com" -ForegroundColor White
Write-Host "URL: $BaseUrl/api/auth/login" -ForegroundColor White
Write-Host ""

try {
    # Realizar login
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -Headers $headers -Body $loginData -WebSession $session -Verbose
    
    Write-Host "✅ LOGIN EXITOSO!" -ForegroundColor Green
    Write-Host "Usuario: $($response.data.user.name)" -ForegroundColor Green
    Write-Host "Email: $($response.data.user.email)" -ForegroundColor Green
    Write-Host "Rol: $($response.data.user.role)" -ForegroundColor Green
    Write-Host "Empresa: $($response.data.company.name)" -ForegroundColor Green
    Write-Host ""
    
    # Probar endpoint protegido
    Write-Host "Probando endpoint protegido..." -ForegroundColor Yellow
    
    $profileHeaders = @{
        'Origin' = 'http://localhost:3000'
    }
    
    $profileResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth/profile" -Method Get -Headers $profileHeaders -WebSession $session
    
    Write-Host "✅ ENDPOINT PROTEGIDO FUNCIONANDO!" -ForegroundColor Green
    Write-Host "Perfil: $($profileResponse.data.user.name)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ ERROR EN LOGIN" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        if ($_.ErrorDetails.Message) {
            try {
                $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
                Write-Host "Error: $($errorDetails.message)" -ForegroundColor Red
                
                if ($errorDetails.errors) {
                    Write-Host "Detalles:" -ForegroundColor Yellow
                    $errorDetails.errors | ForEach-Object {
                        Write-Host "  - $($_.msg)" -ForegroundColor White
                    }
                }
            } catch {
                Write-Host "Error Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
            }
        }
        
        # Diagnosticar errores comunes
        switch ($statusCode) {
            401 { Write-Host "💡 Posible causa: Credenciales incorrectas" -ForegroundColor Yellow }
            404 { Write-Host "💡 Posible causa: Endpoint no encontrado - ¿Servidor corriendo?" -ForegroundColor Yellow }
            500 { Write-Host "💡 Posible causa: Error del servidor - ¿Base de datos conectada?" -ForegroundColor Yellow }
            0   { Write-Host "💡 Posible causa: Servidor no disponible" -ForegroundColor Yellow }
        }
    } else {
        Write-Host "Error de conexión: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "💡 Verifica que el servidor esté corriendo en $BaseUrl" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Para más debugging, revisa los logs del servidor" -ForegroundColor Cyan