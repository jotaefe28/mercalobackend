/**
 * Middleware de Rate Limiting
 * Sistema POS Multitenant
 * 
 * Implementa limitación de velocidad diferenciada por tipo de endpoint
 * para prevenir abuso, ataques DDoS y garantizar disponibilidad del servicio
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { logger } = require('../config/database');

/**
 * Función para crear mensajes de error personalizados
 */
const createRateLimitMessage = (type, maxRequests, windowMs) => {
  const windowMinutes = Math.floor(windowMs / 60000);
  return {
    success: false,
    message: `Demasiadas solicitudes. Límite de ${maxRequests} requests por ${windowMinutes} minuto(s) excedido para ${type}`,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      details: [
        `Tipo: ${type}`,
        `Límite: ${maxRequests} requests`,
        `Ventana: ${windowMinutes} minuto(s)`,
        'Intente nuevamente más tarde'
      ]
    }
  };
};

/**
 * Función para generar clave de rate limiting simplificada
 * Solo usa IP para evitar problemas con IPv6
 */
const generateKey = (req) => {
  return req.ip || req.connection.remoteAddress || 'unknown';
};

/**
 * Handler personalizado para cuando se excede el límite
 */
const rateLimitHandler = (type) => (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  logger.warn('Rate limit excedido', {
    type,
    ip,
    userAgent,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    companyId: req.user?.company_id || req.tenant?.companyId,
    timestamp: new Date().toISOString()
  });
  
  const windowMs = parseInt(process.env[`${type.toUpperCase()}_RATE_LIMIT_WINDOW`]) || 900000;
  const maxRequests = parseInt(process.env[`${type.toUpperCase()}_RATE_LIMIT_MAX`]) || 5;
  
  res.status(429).json(createRateLimitMessage(type, maxRequests, windowMs));
};

/**
 * Rate limiting para endpoints de autenticación
 * Más restrictivo para prevenir ataques de fuerza bruta
 */
const authRateLimit = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5, // 5 intentos por ventana
  keyGenerator: generateKey,
  handler: rateLimitHandler('auth'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Saltear rate limiting en desarrollo para ciertos IPs
    if (process.env.NODE_ENV === 'development') {
      const devIPs = ['127.0.0.1', '::1', 'localhost'];
      return devIPs.includes(req.ip);
    }
    return false;
  }
});

/**
 * Rate limiting general para la API
 * Permite mayor volumen de requests para operaciones normales
 */
const apiRateLimit = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW) || 60 * 1000, // 1 minuto
  max: parseInt(process.env.API_RATE_LIMIT_MAX) || 100, // 100 requests por minuto
  keyGenerator: generateKey,
  handler: rateLimitHandler('api'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Saltear para rutas de salud y documentación
    const skipPaths = ['/health', '/api-docs', '/favicon.ico'];
    return skipPaths.some(path => req.url.startsWith(path));
  }
});

/**
 * Rate limiting específico para endpoints de ventas
 * Límite moderado para operaciones críticas de negocio
 */
const salesRateLimit = rateLimit({
  windowMs: parseInt(process.env.SALES_RATE_LIMIT_WINDOW) || 60 * 1000, // 1 minuto
  max: parseInt(process.env.SALES_RATE_LIMIT_MAX) || 20, // 20 ventas por minuto
  keyGenerator: generateKey,
  handler: rateLimitHandler('sales'),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiting para búsquedas y consultas pesadas
 * Previene abuso de endpoints que consumen muchos recursos
 */
const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 50, // 50 búsquedas por minuto
  keyGenerator: generateKey,
  handler: rateLimitHandler('search'),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiting para operaciones de administración
 * Muy restrictivo para operaciones sensibles
 */
const adminRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // 20 operaciones admin por 5 minutos
  keyGenerator: generateKey,
  handler: rateLimitHandler('admin'),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiting para redención de puntos
 * Previene redenciones abusivas
 */
const pointsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 redenciones por minuto
  keyGenerator: generateKey,
  handler: rateLimitHandler('points'),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiting estricto para registro de empresas
 * Previene creación masiva de cuentas
 */
const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Solo 3 registros por IP por hora
  keyGenerator: (req) => req.ip, // Solo por IP para registros
  handler: (req, res) => {
    logger.warn('Rate limit de registro excedido', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      companyName: req.body?.company?.name,
      email: req.body?.user?.email
    });
    
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de registro desde esta IP',
      error: {
        code: 'REGISTER_RATE_LIMIT_EXCEEDED',
        details: [
          'Límite: 3 registros por hora',
          'Intente nuevamente en 1 hora',
          'Si necesita registrar múltiples empresas, contacte soporte'
        ]
      }
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Speed Limiter - Ralentiza requests progresivamente
 * Aplica delay incremental cuando se excede el umbral
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 100, // Después de 100 requests, empezar a ralentizar
  delay: (hits) => Math.min((hits - 100) * 250, 10000), // Agregar 250ms por cada request adicional
  maxDelayMs: 10000 // Máximo delay de 10 segundos
  // Usar keyGenerator por defecto para evitar problemas IPv6
});

/**
 * Rate limiting para endpoints de reportes
 * Limita generación de reportes pesados
 */
const reportRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 5, // Solo 5 reportes por minuto
  keyGenerator: generateKey,
  handler: (req, res) => {
    logger.warn('Rate limit de reportes excedido', {
      ip: req.ip,
      userId: req.user?.id,
      companyId: req.tenant?.companyId,
      reportType: req.path
    });
    
    res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes de reportes',
      error: {
        code: 'REPORT_RATE_LIMIT_EXCEEDED',
        details: [
          'Límite: 5 reportes por minuto',
          'Los reportes consumen muchos recursos',
          'Intente nuevamente en 1 minuto'
        ]
      }
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiting para operaciones de escritura críticas
 * Previene spam de operaciones POST/PUT/DELETE
 */
const criticalWriteRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 operaciones críticas por minuto
  keyGenerator: generateKey,
  skip: (req) => {
    // Solo aplicar a operaciones de escritura críticas
    const criticalPaths = ['/sales', '/payments', '/orders', '/products'];
    const isCriticalPath = criticalPaths.some(path => req.path.includes(path));
    const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    
    return !(isCriticalPath && isWriteOperation);
  },
  handler: (req, res) => {
    logger.error('Rate limit de escritura crítica excedido', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      companyId: req.tenant?.companyId
    });
    
    res.status(429).json({
      success: false,
      message: 'Demasiadas operaciones críticas',
      error: {
        code: 'CRITICAL_WRITE_RATE_LIMIT_EXCEEDED',
        details: [
          'Límite: 60 operaciones críticas por minuto',
          'Esto incluye ventas, pagos, órdenes y productos',
          'Intente nuevamente en 1 minuto'
        ]
      }
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiting dinámico basado en el plan de la empresa
 * @param {string} operation - Tipo de operación
 */
const dynamicRateLimit = (operation) => {
  return (req, res, next) => {
    const plan = req.tenant?.company?.plan || 'BASIC';
    
    // Límites por plan
    const planLimits = {
      BASIC: {
        requests_per_minute: 50,
        sales_per_minute: 10,
        searches_per_minute: 20
      },
      PREMIUM: {
        requests_per_minute: 100,
        sales_per_minute: 20,
        searches_per_minute: 50
      },
      ENTERPRISE: {
        requests_per_minute: 200,
        sales_per_minute: 50,
        searches_per_minute: 100
      }
    };
    
    const limit = planLimits[plan]?.[`${operation}_per_minute`] || planLimits.BASIC[`${operation}_per_minute`];
    
    // Crear rate limiter dinámico
    const dynamicLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: limit,
      keyGenerator: generateKey,
      handler: (req, res) => {
        logger.warn('Rate limit dinámico excedido', {
          operation,
          plan,
          limit,
          companyId: req.tenant?.companyId,
          ip: req.ip
        });
        
        res.status(429).json({
          success: false,
          message: `Límite de ${operation} excedido para plan ${plan}`,
          error: {
            code: 'PLAN_RATE_LIMIT_EXCEEDED',
            details: [
              `Plan: ${plan}`,
              `Límite: ${limit} ${operation} por minuto`,
              'Considere actualizar su plan para mayor capacidad'
            ]
          }
        });
      }
    });
    
    dynamicLimiter(req, res, next);
  };
};

/**
 * Middleware para logging de rate limiting
 */
const rateLimitLogger = (req, res, next) => {
  // Interceptar headers de rate limiting para logging
  const originalSet = res.set;
  
  res.set = function(field, val) {
    if (typeof field === 'string' && field.toLowerCase().includes('ratelimit')) {
      logger.debug('Rate limit header', {
        header: field,
        value: val,
        ip: req.ip,
        url: req.url,
        userId: req.user?.id,
        companyId: req.tenant?.companyId
      });
    }
    
    return originalSet.call(this, field, val);
  };
  
  next();
};

/**
 * Rate limiting para webhooks externos
 * Límite específico para integraciones
 */
const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 webhooks por minuto
  keyGenerator: (req) => req.ip, // Solo por IP para webhooks
  handler: rateLimitHandler('webhook'),
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authRateLimit,
  apiRateLimit,
  salesRateLimit,
  searchRateLimit,
  adminRateLimit,
  pointsRateLimit,
  registerRateLimit,
  speedLimiter,
  reportRateLimit,
  criticalWriteRateLimit,
  dynamicRateLimit,
  rateLimitLogger,
  webhookRateLimit
};