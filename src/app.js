/**
 * Aplicación Principal - Express.js
 * Sistema POS Multitenant
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser'); // Agregar cookie parser
const rateLimit = require('express-rate-limit');
const { requestLogger, errorLogger } = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFound');
const { setupSwagger } = require('./config/swagger');

// Importar middlewares de seguridad mejorados
const { 
  apiRateLimit, 
  authRateLimit, 
  registerRateLimit,
  speedLimiter
} = require('./middlewares/rateLimiter.simple');
const { sanitizeInput } = require('./middlewares/validation.strict');

// Importar rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const saleRoutes = require('./routes/sales');
const clientRoutes = require('./routes/clients');
const pointsRoutes = require('./routes/points');
const paymentMethodRoutes = require('./routes/paymentMethods');
const orderRoutes = require('./routes/orders');
const testRoutes = require('./routes/test');

const app = express();

// Configuración de seguridad - COMPLETAMENTE DESHABILITADA para desarrollo
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 [Security] Helmet deshabilitado completamente para desarrollo');
  // NO usar helmet en desarrollo para evitar conflictos CORS
} else {
  app.use(helmet({
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
}

// Configuración CORS SUPER PERMISIVA para desarrollo
const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo, permitir TODOS los orígenes
    console.log('🌐 [CORS] Origin solicitado:', origin || 'Sin origin');
    callback(null, true);
  },
  credentials: true, // CRÍTICO para cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept',
    'Authorization', // CRÍTICO - asegurar que está incluido
    'authorization', // Por si acaso el navegador lo envía en minúsculas
    'Cache-Control',
    'Pragma',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Content-Security-Policy',
    'Referrer-Policy',
    'Sec-Ch-Ua',
    'Sec-Ch-Ua-Mobile',
    'Sec-Ch-Ua-Platform',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Sec-Fetch-Dest',
    'Sec-Fetch-User',
    'User-Agent',
    // Headers añadidos por Axios interceptores
    'x-csrf-token',
    'X-CSRF-Token',
    'csrf-token',
    'CSRF-Token',
    // Headers de seguridad comunes
    'x-api-key',
    'X-API-Key',
    'x-client-id',
    'X-Client-Id',
    'x-request-id',
    'X-Request-Id',
    'x-correlation-id',
    'X-Correlation-Id'
  ],
  exposedHeaders: ['Set-Cookie', 'X-Token-Expires-Soon', 'X-Token-Expires-In'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400 // Cache preflight por 24 horas
};

app.use(cors(corsOptions));

// Middleware ULTRA PERMISIVO para OPTIONS en desarrollo
app.use((req, res, next) => {
  const origin = req.get('Origin');
  
  // Configurar headers CORS para TODAS las respuestas
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  
  // Headers permitidos - INCLUYENDO authorization explícitamente
  res.header('Access-Control-Allow-Headers', [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'authorization', // Por si acaso en minúsculas
    'Cache-Control',
    'Pragma',
    'Content-Security-Policy',
    'Referrer-Policy',
    'Sec-Ch-Ua',
    'Sec-Ch-Ua-Mobile', 
    'Sec-Ch-Ua-Platform',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Sec-Fetch-Dest',
    'Sec-Fetch-User',
    'User-Agent',
    // Headers de Axios interceptores
    'x-csrf-token',
    'X-CSRF-Token',
    'csrf-token',
    'CSRF-Token',
    // Headers de seguridad
    'x-api-key',
    'X-API-Key',
    'x-client-id',
    'X-Client-Id',
    'x-request-id',
    'X-Request-Id',
    'x-correlation-id',
    'X-Correlation-Id'
  ].join(','));
  
  // Headers expuestos
  res.header('Access-Control-Expose-Headers', 'Set-Cookie,X-Token-Expires-Soon,X-Token-Expires-In');
  
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Max-Age', '86400');
    console.log('✅ [CORS] OPTIONS manejado para', req.path, 'desde', origin || 'desconocido');
    console.log('✅ [CORS] Headers permitidos:', res.getHeader('Access-Control-Allow-Headers'));
    return res.status(200).end();
  }
  
  next();
});

// Middleware adicional para asegurar headers CORS en TODAS las respuestas
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && !res.getHeader('Access-Control-Allow-Origin')) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// Compresión de respuestas
app.use(compression());

// Cookie parser para manejar cookies HTTP
app.use(cookieParser());

// Middleware de logging GLOBAL para todas las peticiones
app.use((req, res, next) => {
  console.log('🌍 [GlobalLogger] === NUEVA PETICIÓN ===');
  console.log('🌍 [GlobalLogger] Timestamp:', new Date().toISOString());
  console.log('🌍 [GlobalLogger] Método:', req.method);
  console.log('🌍 [GlobalLogger] URL completa:', req.originalUrl);
  console.log('🌍 [GlobalLogger] IP cliente:', req.ip);
  console.log('🌍 [GlobalLogger] Origin:', req.get('Origin') || 'No Origin');
  console.log('🌍 [GlobalLogger] User-Agent:', req.get('User-Agent') || 'No User-Agent');
  console.log('🌍 [GlobalLogger] Content-Type:', req.get('Content-Type') || 'No Content-Type');
  console.log('🌍 [GlobalLogger] Referer:', req.get('Referer') || 'No Referer');
  console.log('🌍 [GlobalLogger] Accept:', req.get('Accept') || 'No Accept');
  console.log('🌍 [GlobalLogger] Cookies presentes:', Object.keys(req.cookies || {}));
  console.log('🌍 [GlobalLogger] Headers Authorization:', req.headers.authorization ? 'PRESENTE' : 'AUSENTE');
  
  // Detectar si es petición desde navegador
  const userAgent = req.get('User-Agent') || '';
  const isFromBrowser = userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari') || userAgent.includes('Firefox');
  const isFromPostman = userAgent.includes('Postman');
  
  console.log('🌍 [GlobalLogger] Tipo de cliente:', {
    navegador: isFromBrowser,
    postman: isFromPostman,
    userAgent: userAgent.substring(0, 50) + '...'
  });
  
  console.log('🌍 [GlobalLogger] === ================= ===');
  
  // Log cuando termine la respuesta
  const originalSend = res.send;
  res.send = function(data) {
    console.log('🌍 [GlobalLogger] === RESPUESTA ENVIADA ===');
    console.log('🌍 [GlobalLogger] Status:', res.statusCode);
    console.log('🌍 [GlobalLogger] URL:', req.originalUrl);
    console.log('🌍 [GlobalLogger] Headers de respuesta:', Object.keys(res.getHeaders()));
    console.log('🌍 [GlobalLogger] CORS Origin en respuesta:', res.getHeader('Access-Control-Allow-Origin'));
    console.log('🌍 [GlobalLogger] CORS Credentials en respuesta:', res.getHeader('Access-Control-Allow-Credentials'));
    console.log('🌍 [GlobalLogger] === ================== ===');
    originalSend.call(this, data);
  };
  
  next();
});

// Middleware de debugging para desarrollo (PARA TODAS LAS RUTAS AUTH)
if (process.env.NODE_ENV === 'development') {
  app.use('/api/auth/*', (req, res, next) => {
    console.log('🔍 [DEBUG AUTH] === PETICIÓN AUTH ===');
    console.log('🔍 [DEBUG AUTH] Método:', req.method);
    console.log('🔍 [DEBUG AUTH] URL:', req.originalUrl);
    console.log('🔍 [DEBUG AUTH] Origin:', req.headers.origin || 'No Origin');
    console.log('🔍 [DEBUG AUTH] Content-Type:', req.headers['content-type'] || 'No Content-Type');
    console.log('🔍 [DEBUG AUTH] User-Agent:', req.headers['user-agent']);
    console.log('🔍 [DEBUG AUTH] Referer:', req.headers.referer || 'No Referer');
    console.log('🔍 [DEBUG AUTH] Cookies recibidas:', Object.keys(req.cookies || {}));
    console.log('🔍 [DEBUG AUTH] Authorization header:', req.headers.authorization ? 'PRESENTE' : 'AUSENTE');
    console.log('🔍 [DEBUG AUTH] Body presente:', !!req.body);
    console.log('🔍 [DEBUG AUTH] === ============= ===');

    // Asegurar headers CORS específicos para auth
    const origin = req.get('Origin');
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Content-Security-Policy, Referrer-Policy, Sec-Ch-Ua, Sec-Ch-Ua-Mobile, Sec-Ch-Ua-Platform, Sec-Fetch-Site, Sec-Fetch-Mode, Sec-Fetch-Dest, User-Agent');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Expose-Headers', 'Set-Cookie');
    }
    
    next();
  });

  // Middleware global para debuggear CORS
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      console.log(`🔧 [CORS] OPTIONS request to ${req.path} from ${req.get('Origin') || 'unknown'}`);
    }
    next();
  });
}

// Sanitización de entrada
app.use(sanitizeInput);

// RATE LIMITERS DESHABILITADOS TEMPORALMENTE PARA DEBUG
console.log('⚠️ [DEBUG] Rate limiters deshabilitados temporalmente');
// app.use(speedLimiter);
// app.use('/api', apiRateLimit);

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

// Rutas de la API con rate limiting específico
app.use('/api/auth', authRoutes); // Rate limiting deshabilitado temporalmente para debug
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/orders', orderRoutes);

// Rutas de testing (solo en desarrollo)
app.use('/api/test', testRoutes);

// Configurar documentación Swagger
setupSwagger(app);

// Logging de errores
app.use(errorLogger);

// Middleware de 404
app.use(notFoundHandler);

// Middleware de manejo de errores
app.use(errorHandler);

module.exports = app;