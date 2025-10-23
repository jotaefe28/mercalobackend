# 🚀 Prompt para Generar Sistema de Login Frontend - MercaloPOS

## 📋 Contexto del Sistema

Necesito que generes un sistema completo de autenticación frontend para **MercaloPOS**, un sistema POS multitenant con las siguientes características del backend:

### Backend Existente:
- **API Base**: `http://localhost:3002/api`
- **Autenticación**: JWT con Access + Refresh Tokens
- **Rate Limiting**: Implementado (5 intentos login/15min)
- **Validaciones**: Estrictas con express-validator
- **Multitenant**: Cada empresa aislada por `company_id`

### Endpoints de Autenticación:
```javascript
POST /api/auth/login
POST /api/auth/refresh  
POST /api/auth/logout
GET /api/test/info
```

### Respuesta del Login:
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@mitienda.com",
      "name": "Administrador Principal",
      "role": "ADMIN",
      "company_id": "uuid"
    },
    "company": {
      "id": "uuid", 
      "name": "Mi Tienda POS",
      "plan": "BASIC"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIs...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
      "expires_in": 3600
    }
  }
}
```

## 🎯 Requerimientos Específicos

### 1. **Tecnología Stack**

- **Estado Global**
- **Routing**: React Router v6
- **HTTP**: Axios con interceptores
- **Notificaciones**: React Hot Toast

### 2. **Estructura de Componentes Requerida**
```

### 3. **Funcionalidades de Seguridad Requeridas**

#### **🔐 Gestión de Tokens**
- **Access Token**: Solo en memoria (nunca localStorage)
- **Refresh Token**: En localStorage con expiración
- **Renovación Automática**: 5 minutos antes de expirar
- **Rotación de Refresh Token**: En cada renovación

#### **🛡️ Medidas de Seguridad**
- **Interceptor HTTP**: Manejo automático de tokens expirados
- **Detector de Inactividad**: Logout automático tras 30min
- **Sincronización Multi-tab**: Logout en todas las pestañas
- **Rate Limiting Frontend**: Prevenir spam de requests
- **Validación de Formularios**: Tiempo real con feedback visual

#### **⚡ Experiencia de Usuario**
- **Loading States**: Spinners y skeletons apropiados
- **Error Handling**: Mensajes específicos y recuperación automática
- **Responsive Design**: Mobile-first con breakpoints Tailwind
- **Accessibility**: ARIA labels, keyboard navigation, screen readers
- **Animations**: Transiciones suaves con Tailwind/Framer Motion

### 4. **Páginas y Flujos Específicos**

#### **📱 Página de Login**
```typescript
interface LoginPageRequirements {
  // Diseño
  layout: "centrado con logo de la empresa"
  theme: "moderno, limpio, profesional para POS"
  
  // Formulario
  fields: ["email", "password", "remember_me"]
  validation: "tiempo real con mensajes específicos"
  
  // Estados
  loading: "botón con spinner durante autenticación"
  errors: "alertas rojas específicas (credenciales, rate limit, etc)"
  success: "transición suave al dashboard"
  
  // Funcionalidades
  features: [
    "Show/hide password",
    "Remember email en localStorage", 
    "Forgot password link",
    "Auto-focus en primer campo",
    "Enter key submission"
  ]
}
```



### 5. **Manejo de Estados y Contexto**

#### **AuthContext Específico**
```typescript
interface AuthContextType {
  // Estado
  user: User | null
  company: Company | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Acciones
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  
  // Helpers
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
  getAuthHeaders: () => Record<string, string>
}
```

#### **Manejo de Errores Específico**
```typescript
interface ErrorHandling {
  // Tipos de errores del backend
  authentication_errors: [
    "invalid_credentials",
    "account_locked", 
    "rate_limit_exceeded",
    "token_expired",
    "token_invalid"
  ]
  
  // Network errors
  network_errors: [
    "connection_timeout",
    "server_unavailable", 
    "no_internet"
  ]
  
  // UI Response
  error_display: "toast notifications + in-form errors"
  retry_mechanism: "automático para network, manual para auth"
  fallback_offline: "cache local para funcionalidad básica"
}
```

### 6. **Configuración y Constantes**

```typescript
// Configuración específica para MercaloPOS
export const AUTH_CONFIG = {
  API_BASE_URL: 'http://localhost:3002/api',
  TOKEN_REFRESH_THRESHOLD: 300, // 5 minutos en segundos
  IDLE_TIMEOUT: 1800000, // 30 minutos en ms
  RATE_LIMIT_RESET: 900000, // 15 minutos para reset
  
  STORAGE_KEYS: {
    REFRESH_TOKEN: 'mercalo_refresh_token',
    USER_DATA: 'mercalo_user',
    COMPANY_DATA: 'mercalo_company',
    REMEMBER_EMAIL: 'mercalo_remember_email'
  },
  
  ROUTES: {
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
    LOGOUT_REDIRECT: '/login'
  }
}


1. **Código Completo**: Todos los archivos TypeScript/JSX organizados
2. **Estilos Tailwind**: Clases optimizadas y responsive
3. **Documentación**: README con setup y uso
4. **Tipos TypeScript**: Interfaces completas y tipado estricto
5. **Error Boundaries**: Manejo de errores de React
6. **Performance**: Lazy loading, memoization, code splitting

## 🎯 Criterios de Éxito

- ✅ **Seguridad**: Tokens manejados correctamente, sin vulnerabilidades
- ✅ **UX Fluida**: Transiciones suaves, feedback inmediato, responsive
- ✅ **Robustez**: Manejo de todos los casos edge y errores
- ✅ **Mantenibilidad**: Código limpio, tipado, documentado
- ✅ **Performance**: Carga rápida, optimizaciones aplicadas

---

**Genera un sistema de autenticación frontend completo que sea digno de un POS profesional, con la máxima seguridad y la mejor experiencia de usuario posible para MercaloPOS.** 🚀

## 🔐 Mejores Prácticas de Implementación (Contexto Adicional)

### Gestión de Sesiones Recomendada:

#### **1. Inicio de Sesión (Login)**

**Frontend → Backend:**
```javascript
// POST /api/auth/login
{
  "email": "admin@mitienda.com",
  "password": "Admin123456!"
}
```

#### **2. Almacenamiento Seguro**

```javascript
// auth.service.js
class AuthService {
  constructor() {
    this.accessToken = null; // En memoria
    this.refreshToken = localStorage.getItem('refresh_token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    this.company = JSON.parse(localStorage.getItem('company') || 'null');
  }

  async login(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        // Guardar datos de sesión
        this.accessToken = data.data.tokens.access_token; // Solo en memoria
        this.refreshToken = data.data.tokens.refresh_token;
        this.user = data.data.user;
        this.company = data.data.company;

        // Persistir solo datos necesarios
        localStorage.setItem('refresh_token', this.refreshToken);
        localStorage.setItem('user', JSON.stringify(this.user));
        localStorage.setItem('company', JSON.stringify(this.company));
        localStorage.setItem('session_expires', Date.now() + (data.data.tokens.expires_in * 1000));

        // Configurar refresh automático
        this.scheduleTokenRefresh(data.data.tokens.expires_in);
        
        return { success: true, user: this.user };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    }
  }

  scheduleTokenRefresh(expiresIn) {
    // Renovar 5 minutos antes de que expire
    const refreshTime = (expiresIn - 300) * 1000;
    
    setTimeout(() => {
      this.refreshAccessToken();
    }, refreshTime);
  }

  async refreshAccessToken() {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken })
      });

      const data = await response.json();

      if (data.success) {
        this.accessToken = data.data.access_token;
        this.scheduleTokenRefresh(data.data.expires_in);
        return true;
      } else {
        // Refresh token inválido, cerrar sesión
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      return false;
    }
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'X-Company-Id': this.company?.id,
      'Content-Type': 'application/json'
    };
  }

  isAuthenticated() {
    return !!(this.accessToken && this.refreshToken && this.user);
  }

  async logout() {
    try {
      // Notificar al backend
      if (this.accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: this.getAuthHeaders()
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Limpiar todo localmente
      this.accessToken = null;
      this.refreshToken = null;
      this.user = null;
      this.company = null;
      
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('company');
      localStorage.removeItem('session_expires');
      
      // Redirigir al login
      window.location.href = '/login';
    }
  }
}

export const authService = new AuthService();
```

#### **3. Interceptor HTTP para Manejo Automático**

```javascript
// http.interceptor.js
class HttpInterceptor {
  constructor() {
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  setupRequestInterceptor() {
    // Agregar token a todas las requests
    fetch = ((originalFetch) => {
      return (...args) => {
        if (args[1] && authService.isAuthenticated()) {
          args[1].headers = {
            ...args[1].headers,
            ...authService.getAuthHeaders()
          };
        }
        return originalFetch(...args);
      };
    })(fetch);
  }

  setupResponseInterceptor() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Si token expiró, intentar refresh
      if (response.status === 401) {
        const refreshed = await authService.refreshAccessToken();
        
        if (refreshed) {
          // Reintentar request original con nuevo token
          args[1].headers = {
            ...args[1].headers,
            ...authService.getAuthHeaders()
          };
          return originalFetch(...args);
        } else {
          // Refresh falló, redirigir a login
          authService.logout();
        }
      }
      
      return response;
    };
  }
}

new HttpInterceptor();
```

#### **4. Componente de Protección de Rutas**

```javascript
// ProtectedRoute.jsx (React ejemplo)
import { authService } from '../services/auth.service';

export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = authService.isAuthenticated();
      
      if (authenticated && requiredRole) {
        const hasRole = authService.user?.role === requiredRole;
        setIsAuthenticated(hasRole);
      } else {
        setIsAuthenticated(authenticated);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [requiredRole]);

  if (isLoading) {
    return <div>Verificando autenticación...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
```

#### **5. Estado Global de Autenticación**

```javascript
// auth.store.js (usando Context API o Redux)
import { createContext, useContext, useReducer } from 'react';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        company: action.payload.company,
        isAuthenticated: true,
        isLoading: false
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        company: null,
        isAuthenticated: false,
        isLoading: false
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: authService.user,
    company: authService.company,
    isAuthenticated: authService.isAuthenticated(),
    isLoading: false
  });

  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

#### **6. Configuración de Seguridad Frontend**

```javascript
// security.config.js
export const SECURITY_CONFIG = {
  // Tiempo máximo de inactividad (30 minutos)
  IDLE_TIMEOUT: 30 * 60 * 1000,
  
  // Verificar token cada 5 minutos
  TOKEN_CHECK_INTERVAL: 5 * 60 * 1000,
  
  // URLs que no requieren autenticación
  PUBLIC_ROUTES: ['/login', '/register', '/forgot-password'],
  
  // Headers requeridos
  REQUIRED_HEADERS: {
    'X-Company-Id': true,
    'Authorization': true
  }
};

// Implementar detector de inactividad
class IdleDetector {
  constructor(timeout, onIdle) {
    this.timeout = timeout;
    this.onIdle = onIdle;
    this.events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    this.resetTimer();
    this.bindEvents();
  }

  bindEvents() {
    this.events.forEach(event => {
      document.addEventListener(event, () => this.resetTimer());
    });
  }

  resetTimer() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.onIdle(), this.timeout);
  }
}

// Activar detector de inactividad
new IdleDetector(SECURITY_CONFIG.IDLE_TIMEOUT, () => {
  authService.logout();
});
```

### 📱 **Consideraciones Adicionales**

#### **Para Progressive Web Apps (PWA):**
```javascript
// Sincronizar autenticación entre pestañas
window.addEventListener('storage', (e) => {
  if (e.key === 'refresh_token' && !e.newValue) {
    // Refresh token eliminado en otra pestaña
    authService.logout();
  }
});
```

#### **Para aplicaciones móviles (React Native):**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Usar AsyncStorage en lugar de localStorage
await AsyncStorage.setItem('refresh_token', refreshToken);
const token = await AsyncStorage.getItem('refresh_token');
```

### 🎯 **Resumen de Mejores Prácticas para Implementar**

1. **Access Token**: Solo en memoria, nunca en localStorage
2. **Refresh Token**: En localStorage o httpOnly cookies
3. **Datos de usuario**: En localStorage (no sensibles)
4. **Renovación automática**: 5 minutos antes de expirar
5. **Interceptor HTTP**: Para manejo automático de tokens
6. **Detector de inactividad**: Logout automático
7. **Sincronización entre pestañas**: Eventos de storage
8. **Rutas protegidas**: Verificación de roles y permisos

**Esta implementación te dará una autenticación robusta, segura y con excelente UX para tu sistema MercaloPOS.** 🚀