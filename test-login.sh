#!/bin/bash

# Script de pruebas para debugging del login
# Guarda como test-login.sh y ejecuta: bash test-login.sh

echo "🧪 TESTING LOGIN CON COOKIES - MercaloPOS"
echo "========================================"

# Configuración
BASE_URL="http://localhost:3002"
API_URL="$BASE_URL/api"

echo ""
echo "1️⃣ PRUEBA: Health Check"
echo "------------------------"
curl -s "$BASE_URL/health" | grep -o '"status":"OK"' && echo "✅ Servidor funcionando" || echo "❌ Servidor no responde"

echo ""
echo "2️⃣ PRUEBA: CORS Test"
echo "-------------------"
curl -s -X GET "$API_URL/test/cors" \
  -H "Origin: http://localhost:3000" \
  | grep -o '"success":true' && echo "✅ CORS funcionando" || echo "❌ CORS con problemas"

echo ""
echo "3️⃣ PRUEBA: Cookie Test"
echo "---------------------"
curl -s -X POST "$API_URL/test/cookies" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{}' \
  -c cookies.txt \
  | grep -o '"success":true' && echo "✅ Cookies funcionando" || echo "❌ Cookies con problemas"

echo ""
echo "4️⃣ PRUEBA: Login (REAL)"
echo "----------------------"
echo "Intentando login con credenciales de prueba..."

# Intentar login
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "email": "admin@mitienda.com",
    "password": "Admin123456!"
  }' \
  -c login_cookies.txt \
  -w "HTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Login exitoso"
    
    echo ""
    echo "5️⃣ PRUEBA: Endpoint Protegido"
    echo "----------------------------"
    
    # Probar endpoint protegido con cookies
    PROTECTED_RESPONSE=$(curl -s -X GET "$API_URL/auth/profile" \
      -H "Origin: http://localhost:3000" \
      -b login_cookies.txt \
      -w "HTTP_CODE:%{http_code}")
    
    PROTECTED_HTTP_CODE=$(echo "$PROTECTED_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    PROTECTED_BODY=$(echo "$PROTECTED_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')
    
    echo "HTTP Status: $PROTECTED_HTTP_CODE"
    echo "Response: $PROTECTED_BODY"
    
    if [ "$PROTECTED_HTTP_CODE" = "200" ]; then
        echo "✅ Endpoint protegido funcionando con cookies"
    else
        echo "❌ Endpoint protegido falló"
    fi
else
    echo "❌ Login falló"
    echo "Posibles causas:"
    echo "- Credenciales incorrectas"
    echo "- CORS mal configurado"
    echo "- Servidor no está corriendo"
    echo "- Base de datos no conectada"
fi

echo ""
echo "📁 Archivos de cookies generados:"
echo "- cookies.txt (test)"
echo "- login_cookies.txt (login real)"

echo ""
echo "🔍 Para más debugging, revisa los logs del servidor"