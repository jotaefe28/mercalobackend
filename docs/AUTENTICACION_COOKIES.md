# Autenticación con Cookies Seguras - MercaloPOS

## 🛡️ Implementación de Cookies httpOnly

Hemos migrado del sistema de autenticación basado en `localStorage` a **cookies httpOnly** para mejorar significativamente la seguridad del sistema.

## 🔒 Características de Seguridad

### Cookies httpOnly
- **No accesibles desde JavaScript**: Inmunes a ataques XSS
- **Transmisión automática**: Se incluyen automáticamente en las peticiones
- **Configuración segura**: Solo HTTPS en producción
- **SameSite strict**: Protección contra CSRF
- **Dominio específico**: Configuración por entorno

### Configuración de Tokens
```javascript
// Access Token: 15 minutos
access_token: {
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000 // 15 minutos
}

// Refresh Token: 7 días
refresh_token: {
  httpOnly: true,
  secure: NODE_ENV === 'production', 
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
}
```

## 🔄 Flujo de Autenticación

### 1. Login
```bash
POST /api/auth/login
{
  "email": "admin@empresa.com",
  "password": "password123"
}

# Respuesta:
# - Status: 200
# - Cookies automáticas: access_token, refresh_token
# - Body: información del usuario y empresa
```

### 2. Peticiones Autenticadas
```bash
GET /api/clients
# Cookies automáticas incluidas
# Header Authorization: No necesario
```

### 3. Renovación de Token
```bash
POST /api/auth/refresh-token
# Usa refresh_token cookie automáticamente
# Renueva access_token cookie
```

### 4. Logout
```bash
POST /api/auth/logout
# Limpia todas las cookies de autenticación
```

## 📝 Cambios en el Código

### AuthService - Login
```javascript
async login(email, password, req, res) {
  // ... validaciones ...
  
  // Configurar cookies seguras
  res.cookie('access_token', accessToken, cookieOptions);
  res.cookie('refresh_token', refreshToken, cookieOptions);
  
  // Retorna datos del usuario (sin tokens)
  return { user, company, expires_in };
}
```

### Auth Middleware
```javascript
const authenticateToken = (req, res, next) => {
  // Prioridad: cookies sobre headers
  let token = req.cookies?.access_token || 
              req.headers.authorization?.replace('Bearer ', '');
  
  // ... verificación JWT ...
};
```

### AuthController
```javascript
async login(req, res, next) {
  // Pasar req y res al servicio para cookies
  const result = await authService.login(email, password, req, res);
  
  // Respuesta sin tokens en el body
  res.json({ success: true, data: result });
}
```

## 🌐 Variables de Entorno

```bash
# .env
NODE_ENV=production
COOKIE_DOMAIN=tu-dominio.com  # Para producción
```

## 🔧 Frontend - Consideraciones

### Eliminar localStorage
```javascript
// ❌ Ya no necesario
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');

// ❌ Ya no necesario
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

### Configurar Axios
```javascript
// ✅ Configuración para cookies
axios.defaults.withCredentials = true;

// ✅ Para desarrollo con CORS
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true
});
```

### Manejo de Errores 401
```javascript
// ✅ Interceptor para renovación automática
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      try {
        await api.post('/auth/refresh-token');
        return api.request(error.config);
      } catch (refreshError) {
        // Redirigir a login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

## 🧪 Testing con Postman

### Configurar Collection
1. **Settings** → **Cookies** → Enable "Automatically follow redirects"
2. **Settings** → **Cookies** → Enable "Send cookies"

### Test Login
```javascript
// Pre-request Script: No necesario

// Tests
pm.test("Login successful", function () {
    pm.response.to.have.status(200);
});

pm.test("Cookies set", function () {
    pm.expect(pm.cookies.has('access_token')).to.be.true;
    pm.expect(pm.cookies.has('refresh_token')).to.be.true;
});
```

## 🛠️ Migración desde localStorage

### Pasos para Frontend
1. **Remover código de localStorage**
2. **Configurar withCredentials: true**
3. **Eliminar headers Authorization manuales**
4. **Implementar interceptor para refresh automático**
5. **Actualizar manejo de errores 401**

### Validación de Migración
```javascript
// ✅ Verificar que cookies se envían
console.log('Cookies:', document.cookie);

// ✅ Verificar peticiones automáticas
fetch('/api/clients', { credentials: 'include' });
```

## 🚀 Beneficios de la Implementación

### Seguridad
- ✅ Inmune a XSS (No acceso desde JS)
- ✅ Protección CSRF (SameSite)
- ✅ Transmisión segura (HTTPS en producción)
- ✅ Expiración automática

### UX/DX
- ✅ Manejo automático de tokens
- ✅ No require código manual en frontend
- ✅ Refresh transparente
- ✅ Logout limpia automáticamente

### Compatibilidad
- ✅ Fallback a Authorization headers
- ✅ Funciona con todas las herramientas HTTP
- ✅ Compatible con SSR/SSG
- ✅ Soporte completo en navegadores modernos

## 🐛 Debugging

### Verificar Cookies
```javascript
// Browser DevTools → Application → Cookies
// Verificar: access_token, refresh_token

// Network Tab → Request Headers
// Verificar: Cookie: access_token=...; refresh_token=...
```

### Logs del Servidor
```javascript
// auth.middleware.js logs
[INFO] Token obtenido de: cookie
[INFO] Usuario autenticado: user_id=123

// authService.js logs  
[INFO] Login exitoso con cookies seguras
[INFO] Token renovado exitosamente
```

## 📚 Referencias

- [MDN - httpOnly Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies)
- [OWASP - Session Management](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/)
- [SameSite Cookies Explained](https://web.dev/samesite-cookies-explained/)