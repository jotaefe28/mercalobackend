/**
 * Middleware de Seguridad
 * Sistema POS Multitenant
 * 
 * Implementa medidas de seguridad avanzadas usando Helmet.js
 * y configuraciones adicionales de CORS y headers de seguridad
 */

const helmet = require('helmet');
const cors = require('cors');
const { logger } = require('../config/database');

/**
 * Configuración de CORS dinámico basado en entorno
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Obtener orígenes permitidos de variables de entorno
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:3000','http://localhost:3001', 'http://localhost:5173'];
    
    // En desarrollo, permitir requests sin origin (como Postman)
    if (process.env.NODE_ENV === 'development' && !origin) {
      return callback(null, true);
    }
    
    // Verificar si el origin está en la lista permitida
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS: Origin no permitido', {
        origin,
        allowedOrigins,
        timestamp: new Date().toISOString()
      });
      
      callback(new Error('No permitido por política CORS'));
    }
  },
  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Company-Id',
    'X-API-Version'
  ],
  
  credentials: true, // Permitir cookies
  
  optionsSuccessStatus: 200, // Para legacy browsers
  
  maxAge: 86400 // Cache preflight por 24 horas
};

/**
 * Configuración de Helmet.js para headers de seguridad
 */
const helmetOptions = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // X-XSS-Protection
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // Hide X-Powered-By
  hidePoweredBy: true,
  
  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // Permissions Policy (Feature Policy)
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    notifications: [],
    payment: []
  }
};

/**
 * Middleware de CORS configurado
 */
const corsMiddleware = cors(corsOptions);

/**
 * Middleware de Helmet configurado
 */
const helmetMiddleware = helmet(helmetOptions);

/**
 * Middleware para headers adicionales de seguridad
 */
const additionalSecurityHeaders = (req, res, next) => {
  // Headers personalizados de seguridad
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Response-Time', Date.now());
  
  // Prevenir cache de información sensible
  if (req.url.includes('/api/auth/') || req.url.includes('/api/users/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Header de rate limiting info
  res.setHeader('X-RateLimit-Policy', 'See API documentation');
  
  // Header de tenant info (solo en desarrollo)
  if (process.env.NODE_ENV === 'development' && req.tenant) {
    res.setHeader('X-Tenant-ID', req.tenant.companyId);
  }
  
  next();
};

/**
 * Middleware para detectar y prevenir ataques comunes
 */
const attackPrevention = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress;
  
  // Detectar user agents sospechosos
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /gobuster/i,
    /dirb/i,
    /burpsuite/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious) {
    logger.warn('User Agent sospechoso detectado', {
      userAgent,
      ip,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado',
      error: {
        code: 'SUSPICIOUS_ACTIVITY',
        details: ['Actividad sospechosa detectada']
      }
    });
  }
  
  // Detectar intentos de path traversal
  const pathTraversalPattern = /(\.\.[\/\\])/;
  if (pathTraversalPattern.test(req.url)) {
    logger.warn('Intento de path traversal detectado', {
      url: req.url,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
    
    return res.status(400).json({
      success: false,
      message: 'URL inválida',
      error: {
        code: 'INVALID_PATH',
        details: ['Caracteres no permitidos en la URL']
      }
    });
  }
  
  // Detectar payloads de SQL injection en query params
  const sqlInjectionPattern = /(union|select|insert|update|delete|drop|create|alter|exec|script)/i;
  const queryString = Object.values(req.query).join(' ');
  
  if (sqlInjectionPattern.test(queryString)) {
    logger.warn('Posible intento de SQL injection detectado', {
      query: req.query,
      ip,
      userAgent,
      url: req.url,
      timestamp: new Date().toISOString()
    });
    
    return res.status(400).json({
      success: false,
      message: 'Parámetros inválidos',
      error: {
        code: 'INVALID_PARAMETERS',
        details: ['Caracteres no permitidos en los parámetros']
      }
    });
  }
  
  next();
};

/**
 * Middleware para logging de seguridad
 */
const securityLogger = (req, res, next) => {
  const securityInfo = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    referer: req.get('Referer'),
    method: req.method,
    url: req.url,
    protocol: req.protocol,
    secure: req.secure,
    timestamp: new Date().toISOString()
  };
  
  // Log de requests a endpoints sensibles
  const sensitiveEndpoints = ['/api/auth/', '/api/admin/', '/api/companies/'];
  const isSensitive = sensitiveEndpoints.some(endpoint => req.url.startsWith(endpoint));
  
  if (isSensitive) {
    logger.info('Acceso a endpoint sensible', securityInfo);
  }
  
  // Log de requests con headers sospechosos
  const suspiciousHeaders = ['X-Forwarded-For', 'X-Real-IP', 'X-Originating-IP'];
  const hasSuspiciousHeaders = suspiciousHeaders.some(header => req.get(header));
  
  if (hasSuspiciousHeaders) {
    logger.info('Request con headers de proxy detectado', {
      ...securityInfo,
      proxyHeaders: suspiciousHeaders.reduce((acc, header) => {
        const value = req.get(header);
        if (value) acc[header] = value;
        return acc;
      }, {})
    });
  }
  
  next();
};

/**
 * Middleware para limitar el tamaño del payload
 */
const payloadSizeLimit = (req, res, next) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const contentLength = parseInt(req.get('Content-Length') || '0');
  
  if (contentLength > maxSize) {
    logger.warn('Payload demasiado grande rechazado', {
      contentLength,
      maxSize,
      ip: req.ip,
      url: req.url,
      method: req.method
    });
    
    return res.status(413).json({
      success: false,
      message: 'Payload demasiado grande',
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        details: [`Tamaño máximo permitido: ${Math.floor(maxSize / 1024 / 1024)}MB`]
      }
    });
  }
  
  next();
};

/**
 * Middleware de sanitización de inputs
 */
const sanitizeInputs = (req, res, next) => {
  // Sanitizar query parameters
  Object.keys(req.query).forEach(key => {
    if (typeof req.query[key] === 'string') {
      // Remover caracteres potencialmente peligrosos
      req.query[key] = req.query[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/[<>]/g, '')
        .trim();
    }
  });
  
  // Sanitizar body (solo strings)
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj) => {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      });
    };
    
    sanitizeObject(req.body);
  }
  
  next();
};

module.exports = {
  corsMiddleware,
  helmetMiddleware,
  additionalSecurityHeaders,
  attackPrevention,
  securityLogger,
  payloadSizeLimit,
  sanitizeInputs
};