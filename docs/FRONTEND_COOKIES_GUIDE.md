# Configuración Frontend para Cookies - MercaloPOS

## 🌐 Para React/Next.js

```javascript
// utils/api.js
import axios from 'axios';

// Configuración base de axios
const API_BASE_URL = 'http://localhost:3002/api';

// Crear instancia de axios con configuración para cookies
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CRÍTICO para cookies
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Si es 401 y no es refresh o login, intentar refresh
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/auth/login') && 
        !originalRequest.url?.includes('/auth/refresh-token')) {
      
      originalRequest._retry = true;
      
      try {
        console.log('🔄 Intentando refresh token...');
        await api.post('/auth/refresh-token');
        console.log('✅ Refresh token exitoso');
        
        // Reintentar request original
        return api(originalRequest);
      } catch (refreshError) {
        console.error('❌ Refresh token falló:', refreshError);
        
        // Redirigir a login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    console.error(`❌ ${error.response?.status || 'Network'} ${error.config?.url}`);
    return Promise.reject(error);
  }
);

export default api;
```

## 🔐 Funciones de autenticación

```javascript
// services/authService.js
import api from '../utils/api';

export const authService = {
  /**
   * Login con cookies automáticas
   */
  async login(email, password) {
    try {
      console.log('🔐 Intentando login...');
      
      const response = await api.post('/auth/login', {
        email,
        password
      });
      
      console.log('✅ Login exitoso:', response.data.data.user.name);
      return response.data;
      
    } catch (error) {
      console.error('❌ Error en login:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  /**
   * Logout con limpieza de cookies
   */
  async logout() {
    try {
      console.log('🚪 Cerrando sesión...');
      
      await api.post('/auth/logout');
      
      console.log('✅ Logout exitoso');
      
      // Redirigir a login
      window.location.href = '/login';
      
    } catch (error) {
      console.error('❌ Error en logout:', error.response?.data?.message || error.message);
      
      // Incluso si falla, redirigir a login
      window.location.href = '/login';
    }
  },

  /**
   * Obtener perfil actual
   */
  async getProfile() {
    try {
      const response = await api.get('/auth/profile');
      return response.data.data;
    } catch (error) {
      console.error('❌ Error obteniendo perfil:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  /**
   * Validar sesión actual
   */
  async validateSession() {
    try {
      const response = await api.get('/auth/validate-session');
      return response.data.data;
    } catch (error) {
      console.error('❌ Sesión inválida:', error.response?.data?.message || error.message);
      throw error;
    }
  }
};
```

## 🧪 Hook de React para autenticación

```javascript
// hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validar sesión al cargar
  useEffect(() => {
    validateSession();
  }, []);

  const validateSession = async () => {
    try {
      setLoading(true);
      const sessionData = await authService.validateSession();
      setUser(sessionData.user);
      setError(null);
    } catch (error) {
      setUser(null);
      setError(error.response?.data?.message || 'Sesión inválida');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.login(email, password);
      setUser(response.data.user);
      
      return response;
    } catch (error) {
      setError(error.response?.data?.message || 'Error en login');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Error en logout:', error);
      // Limpiar estado local incluso si falla
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    validateSession,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
```

## 📱 Componente de Login

```javascript
// components/LoginForm.jsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function LoginForm() {
  const [email, setEmail] = useState('admin@tiendademo.com');
  const [password, setPassword] = useState('Admin123!');
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await login(email, password);
      // Redirigir se manejará automáticamente
    } catch (error) {
      console.error('Login falló:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      
      {error && (
        <div style={{ color: 'red' }}>
          {error}
        </div>
      )}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
}
```

## 🔧 Para Fetch API (sin axios)

```javascript
// utils/fetchApi.js
const API_BASE_URL = 'http://localhost:3002/api';

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    credentials: 'include', // CRÍTICO para cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    console.log(`🚀 ${config.method || 'GET'} ${endpoint}`);
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ ${response.status} ${endpoint}`);
    
    return data;
    
  } catch (error) {
    console.error(`❌ ${endpoint}:`, error.message);
    throw error;
  }
}

// Ejemplo de uso
export const login = async (email, password) => {
  return fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
};
```

## 🚨 Problemas Comunes y Soluciones

### ❌ Error: "Access to fetch blocked by CORS policy"
```javascript
// ✅ Solución: Verificar withCredentials
const api = axios.create({
  withCredentials: true  // Asegúrate de tener esto
});

// O con fetch:
fetch(url, {
  credentials: 'include'  // Asegúrate de tener esto
});
```

### ❌ Error: "Network Error" 
```javascript
// ✅ Verificar que el servidor esté corriendo
// ✅ Verificar la URL (http://localhost:3002)
// ✅ Verificar que no haya firewall bloqueando
```

### ❌ Cookies no se envían automáticamente
```javascript
// ✅ Verificar configuración del servidor:
// - credentials: true en CORS
// - res.cookie() con httpOnly: true

// ✅ Verificar configuración del cliente:
// - withCredentials: true (axios)
// - credentials: 'include' (fetch)
```

## 🧪 Test de Conexión Frontend

```javascript
// test/testConnection.js
import api from '../utils/api';

export async function testConnection() {
  try {
    console.log('🧪 Probando conexión...');
    
    // Test básico
    const corsTest = await api.get('/test/cors-frontend');
    console.log('✅ CORS Test:', corsTest.data.message);
    
    // Test de login
    const loginTest = await api.post('/auth/login', {
      email: 'admin@tiendademo.com',
      password: 'Admin123!'
    });
    console.log('✅ Login Test:', loginTest.data.data.user.name);
    
    // Test de endpoint protegido
    const profileTest = await api.get('/auth/profile');
    console.log('✅ Profile Test:', profileTest.data.data.user.email);
    
    console.log('🎉 Todas las pruebas pasaron!');
    
  } catch (error) {
    console.error('❌ Test falló:', error.response?.data || error.message);
  }
}

// Ejecutar en consola del navegador:
// testConnection();
```

## 📋 Checklist de Implementación

- [ ] ✅ Configurar axios con `withCredentials: true`
- [ ] ✅ Configurar interceptores para refresh automático
- [ ] ✅ Implementar AuthContext/AuthProvider
- [ ] ✅ Crear componentes de login/logout
- [ ] ✅ Probar con las credenciales: `admin@tiendademo.com` / `Admin123!`
- [ ] ✅ Verificar que las cookies se configuren automáticamente
- [ ] ✅ Probar navegación después del login
- [ ] ✅ Probar refresh de página con sesión activa