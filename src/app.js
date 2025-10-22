/**
 * Aplicación Principal - Express.js
 * Sistema POS Multitenant
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { requestLogger, errorLogger } = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFound');
const { setupSwagger } = require('./config/swagger');

// Importar rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const saleRoutes = require('./routes/sales');
const clientRoutes = require('./routes/clients');
const pointsRoutes = require('./routes/points');
const paymentMethodRoutes = require('./routes/paymentMethods');
const orderRoutes = require('./routes/orders');

const app = express();

// Configuración de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Configuración CORS
const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo, permitir todas las origins
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }
    
    // En producción, usar whitelist
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por la política CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Compresión de respuestas
app.use(compression());

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // límite de 1000 requests por ventana por IP
  message: {
    error: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // No aplicar rate limiting en desarrollo
    return process.env.NODE_ENV === 'development';
  }
});

app.use(globalLimiter);

// Parseo de JSON y URL encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy para obtener IP real detrás de load balancer
app.set('trust proxy', 1);

// Logging de requests
app.use(requestLogger);

// Configurar documentación Swagger
setupSwagger(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'MercaloPOS API',
    version: '1.0.0',
    description: 'Sistema POS Multitenant con sistema de puntos integrado',
    features: [
      'Autenticación JWT con refresh tokens',
      'Arquitectura multitenant',
      'Sistema de puntos (1 punto = $1)',
      'Gestión completa de inventario',
      'Procesamiento de ventas',
      'Gestión de clientes',
      'Múltiples métodos de pago',
      'Sistema de órdenes'
    ],
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      products: '/api/products',
      sales: '/api/sales',
      clients: '/api/clients',
      points: '/api/points',
      paymentMethods: '/api/payment-methods',
      orders: '/api/orders'
    }
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/orders', orderRoutes);

// Configurar documentación Swagger
setupSwagger(app);

// Logging de errores
app.use(errorLogger);

// Middleware de 404
app.use(notFoundHandler);

// Middleware de manejo de errores
app.use(errorHandler);

module.exports = app;