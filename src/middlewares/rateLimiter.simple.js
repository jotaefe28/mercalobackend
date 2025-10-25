/**
 * Rate Limiting Middleware Simplificado
 * Sistema POS Multitenant
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
 * Handler personalizado para rate limit
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
  
  const windowMs = 15 * 60 * 1000; // Default window
  const message = createRateLimitMessage(type, 5, windowMs);
  
  res.status(429).json(message);
};

// Rate limiters configurables via ENV
const AUTH_RATE_LIMIT_WINDOW = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW) || 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5;
const REGISTER_RATE_LIMIT_WINDOW = parseInt(process.env.REGISTER_RATE_LIMIT_WINDOW) || 60 * 60 * 1000;
const REGISTER_RATE_LIMIT_MAX = parseInt(process.env.REGISTER_RATE_LIMIT_MAX) || 3;
const API_RATE_LIMIT_WINDOW = parseInt(process.env.API_RATE_LIMIT_WINDOW) || 60 * 1000;
const API_RATE_LIMIT_MAX = parseInt(process.env.API_RATE_LIMIT_MAX) || 100;

/**
 * Rate Limiting para autenticación (login)
 * Previene ataques de fuerza bruta
 */
const authRateLimit = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW,
  max: AUTH_RATE_LIMIT_MAX,
  message: createRateLimitMessage('auth', AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('auth')
});

console.log('🔧 [Rate Limiting] Auth rate limit configurado:', {
  window: AUTH_RATE_LIMIT_WINDOW / 1000 / 60 + ' minutos',
  max: AUTH_RATE_LIMIT_MAX + ' requests'
});

/**
 * Rate Limiting para registro
 * Previene creación masiva de cuentas
 */
const registerRateLimit = rateLimit({
  windowMs: REGISTER_RATE_LIMIT_WINDOW,
  max: REGISTER_RATE_LIMIT_MAX,
  message: createRateLimitMessage('register', REGISTER_RATE_LIMIT_MAX, REGISTER_RATE_LIMIT_WINDOW),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('register')
});

/**
 * Rate Limiting general para API
 */
const apiRateLimit = rateLimit({
  windowMs: API_RATE_LIMIT_WINDOW,
  max: API_RATE_LIMIT_MAX,
  message: createRateLimitMessage('api', API_RATE_LIMIT_MAX, API_RATE_LIMIT_WINDOW),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('api')
});

/**
 * Rate Limiting para operaciones críticas (ventas, pagos)
 */
const criticalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60,
  message: createRateLimitMessage('critical', 60, 60 * 1000),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('critical')
});

/**
 * Rate Limiting para búsquedas
 */
const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 50,
  message: createRateLimitMessage('search', 50, 60 * 1000),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('search')
});

/**
 * Rate Limiting para reportes
 */
const reportRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  message: createRateLimitMessage('report', 5, 60 * 1000),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('report')
});

/**
 * Rate Limiting para puntos
 */
const pointsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: createRateLimitMessage('points', 10, 60 * 1000),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('points')
});

/**
 * Rate Limiting para operaciones admin
 */
const adminRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20,
  message: createRateLimitMessage('admin', 20, 5 * 60 * 1000),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('admin')
});

/**
 * Speed Limiter - Ralentiza requests progresivamente
 * Sin keyGenerator personalizado para evitar problemas IPv6
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 100, // Después de 100 requests, empezar a ralentizar
  delay: (hits) => Math.min((hits - 100) * 250, 10000), // 250ms por request adicional
  maxDelayMs: 10000 // Máximo 10 segundos de delay
});

module.exports = {
  authRateLimit,
  registerRateLimit,
  apiRateLimit,
  criticalRateLimit,
  searchRateLimit,
  reportRateLimit,
  pointsRateLimit,
  adminRateLimit,
  speedLimiter
};