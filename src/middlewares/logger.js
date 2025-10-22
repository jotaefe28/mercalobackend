/**
 * Middleware de Logging
 * Sistema POS Multitenant
 */

const winston = require('winston');
const path = require('path');

// Crear directorio de logs si no existe
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuración de Winston Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'mercalopos-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Archivo para todos los logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    // Archivo separado para errores
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// En desarrollo, también loggear a la consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        return log;
      })
    )
  }));
}

/**
 * Middleware para logging de requests HTTP
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Información básica del request
  const requestInfo = {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    company_id: req.company?.id || null,
    user_id: req.user?.id || null,
    requestId: req.get('X-Request-ID') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  // Loggear el request
  logger.info('HTTP Request', requestInfo);

  // Interceptar la respuesta
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    // Información de la respuesta
    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0
    };

    // Loggear según el status code
    if (res.statusCode >= 400) {
      logger.warn('HTTP Response Error', responseInfo);
    } else {
      logger.info('HTTP Response', responseInfo);
    }

    // Llamar al método original
    originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware para logging de errores
 */
const errorLogger = (err, req, res, next) => {
  const errorInfo = {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    company_id: req.company?.id || null,
    user_id: req.user?.id || null,
    body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
    query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
    params: req.params && Object.keys(req.params).length > 0 ? req.params : undefined
  };

  // Loggear el error
  logger.error('Application Error', errorInfo);

  // Continuar al siguiente middleware de error
  next(err);
};

/**
 * Middleware para logging de eventos de autenticación
 */
const authLogger = (event, req, user = null, additionalData = {}) => {
  const authInfo = {
    event,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    url: req.url,
    user_id: user?.id || null,
    user_email: user?.email || null,
    company_id: user?.company_id || null,
    ...additionalData
  };

  logger.info('Auth Event', authInfo);
};

/**
 * Middleware para logging de eventos de negocio
 */
const businessLogger = (event, data, req = null) => {
  const businessInfo = {
    event,
    ...data,
    ip: req?.ip || null,
    user_id: req?.user?.id || null,
    company_id: req?.company?.id || null
  };

  logger.info('Business Event', businessInfo);
};

/**
 * Middleware para logging de métricas de performance
 */
const performanceLogger = (operation, duration, additionalData = {}) => {
  const performanceInfo = {
    operation,
    duration: `${duration}ms`,
    ...additionalData
  };

  if (duration > 1000) {
    logger.warn('Slow Operation', performanceInfo);
  } else {
    logger.info('Performance Metric', performanceInfo);
  }
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  authLogger,
  businessLogger,
  performanceLogger
};