# MercaloPOS Backend

Sistema POS (Point of Sale) Multitenant con Sistema de Puntos Integrado

## 🌟 Características Principales

- **Arquitectura Multitenant**: Completo aislamiento de datos por empresa
- **Sistema de Puntos Revolucionario**: 1 punto = $1 de descuento real
- **Autenticación JWT**: Tokens seguros con refresh automático
- **API REST Completa**: Documentada con Swagger/OpenAPI
- **Base de Datos MySQL**: Con stored procedures y triggers optimizados
- **Seguridad Avanzada**: Rate limiting, CORS, Helmet.js y más
- **Logging Estructurado**: Para auditoría y debugging completo

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm >= 8.0.0

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd mercalopos-backend
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Editar el archivo `.env` con tus credenciales:
   ```env
   # Base de datos
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=tu_usuario
   DB_PASSWORD=tu_password
   DB_NAME=mercalopos_db
   
   # JWT
   JWT_SECRET=tu_jwt_secret_muy_seguro
   JWT_REFRESH_SECRET=tu_refresh_secret_muy_seguro
   JWT_EXPIRE=1h
   JWT_REFRESH_EXPIRE=7d
   
   # Servidor
   PORT=3000
   NODE_ENV=development
   
   # CORS
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

4. **Configurar base de datos**
   ```bash
   # Crear base de datos y tablas
   npm run db:setup
   
   # Insertar datos de demostración
   npm run db:seed
   ```

5. **Iniciar el servidor**
   ```bash
   # Desarrollo con auto-reload
   npm run dev
   
   # Producción
   npm start
   ```

## 📚 Documentación de la API

Una vez iniciado el servidor, la documentación completa está disponible en:

- **Swagger UI**: http://localhost:3000/api-docs
- **JSON Spec**: http://localhost:3000/api-docs.json
- **Health Check**: http://localhost:3000/health
- **API Info**: http://localhost:3000/api

## 🗂️ Estructura del Proyecto

```
src/
├── config/           # Configuraciones (DB, Swagger, etc.)
├── controllers/      # Controladores de la API
├── middlewares/      # Middlewares personalizados
├── models/          # Modelos de datos
├── routes/          # Definición de rutas
├── services/        # Lógica de negocio
├── utils/           # Utilidades y helpers
├── app.js           # Configuración de Express
└── server.js        # Punto de entrada principal

database/
└── schema.sql       # Esquema completo de la base de datos

scripts/
├── setup-database.js    # Script de configuración inicial
└── seed-demo-data.js   # Datos de demostración
```

## 🎯 Endpoints Principales

| Módulo | Endpoint Base | Descripción |
|--------|---------------|-------------|
| Autenticación | `/api/auth` | Login, registro, refresh tokens |
| Usuarios | `/api/users` | Gestión de usuarios y roles |
| Productos | `/api/products` | Inventario y catálogo |
| Ventas | `/api/sales` | Procesamiento de transacciones |
| Clientes | `/api/clients` | Base de datos de clientes |
| Puntos | `/api/points` | Sistema de puntos y recompensas |
| Métodos de Pago | `/api/payment-methods` | Configuración de pagos |
| Órdenes | `/api/orders` | Gestión de pedidos |

## 💎 Sistema de Puntos

### Características Únicas

- **1 Punto = $1**: Cada punto equivale exactamente a un dólar de descuento
- **Acumulación Automática**: Los clientes ganan puntos con cada compra
- **Redención Flexible**: Los puntos se pueden usar como dinero real
- **Control de Expiración**: Sistema configurable de expiración de puntos
- **Transferencias**: Posibilidad de transferir puntos entre clientes
- **Auditoría Completa**: Historial detallado de todas las transacciones

### Ejemplo de Uso

```javascript
// Procesar una venta con puntos
POST /api/sales
{
  "items": [{"product_id": "uuid", "quantity": 2}],
  "payments": [{"payment_method_id": "uuid", "amount": 50.00}],
  "client_id": "uuid",
  "points_to_redeem": 10,  // $10 de descuento
  "total": 40.00  // Total después del descuento
}
```

## 🔒 Seguridad

- **JWT con Refresh Tokens**: Autenticación segura y renovable
- **Rate Limiting**: Protección contra ataques de fuerza bruta
- **Validación Robusta**: express-validator en todos los endpoints
- **Helmet.js**: Headers de seguridad automáticos
- **CORS Configurado**: Control de acceso entre dominios
- **Bcrypt**: Hash seguro de contraseñas con salt rounds altos

## 🏗️ Arquitectura Multitenant

Cada empresa opera de forma completamente independiente:

- **Aislamiento por `company_id`**: Todos los datos están segmentados
- **Middleware de Resolución**: Automático desde el JWT token
- **Base de Datos Compartida**: Con aislamiento lógico total
- **Escalabilidad**: Soporta múltiples empresas sin interferencia

## 📊 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor con auto-reload
npm run dev:debug        # Servidor con debugger
npm run test             # Ejecutar tests con coverage
npm run test:watch       # Tests en modo watch

# Calidad de Código
npm run lint             # Verificar código con ESLint
npm run lint:fix         # Corregir problemas automáticamente
npm run format           # Formatear código con Prettier
npm run validate         # Validación completa (lint + format + test)

# Base de Datos
npm run db:setup         # Configurar base de datos
npm run db:seed          # Insertar datos de demo
npm run db:reset         # Resetear completamente la DB

# Producción
npm start                # Servidor de producción
npm run healthcheck      # Verificar estado del servidor
npm run security:audit   # Auditoría de seguridad
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Solo tests de integración
npm test -- --testPathPattern=integration

# Coverage detallado
npm run test:ci
```

## 🐳 Docker

```bash
# Construir imagen
npm run docker:build

# Ejecutar contenedor
npm run docker:run
```

## 📈 Monitoring y Logs

- **Winston Logger**: Logging estructurado con niveles
- **Request Logging**: Auditoría completa de requests
- **Error Tracking**: Captura y logging de errores
- **Health Checks**: Endpoint de monitoreo del estado

## 🚀 Despliegue

### Variables de Entorno de Producción

```env
NODE_ENV=production
PORT=3000
DB_HOST=tu_host_prod
DB_USER=tu_usuario_prod
DB_PASSWORD=tu_password_seguro
JWT_SECRET=jwt_secret_muy_largo_y_seguro
ALLOWED_ORIGINS=https://tu-dominio.com
```

### PM2 (Recomendado)

```bash
npm run pm2:start    # Iniciar con PM2
npm run pm2:logs     # Ver logs
npm run pm2:restart  # Reiniciar
npm run pm2:stop     # Detener
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📋 Roadmap

- [ ] Tests unitarios completos
- [ ] Integración con pasarelas de pago
- [ ] Sistema de notificaciones
- [ ] Reportes avanzados
- [ ] API de terceros
- [ ] Mobile API optimization

## 🐛 Reportar Problemas

Si encuentras algún problema, por favor crea un issue en el repositorio con:

- Descripción detallada del problema
- Pasos para reproducir
- Logs relevantes
- Versión de Node.js y sistema operativo

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Equipo

- **Backend Development**: MercaloPOS Development Team
- **Database Design**: MySQL Specialists
- **Security Audit**: Security Team
- **Documentation**: Technical Writers

---

**MercaloPOS Backend** - Sistema POS revolucionario con puntos que valen dinero real 💰