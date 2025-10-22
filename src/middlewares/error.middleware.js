/**
 * Middleware de Manejo de Errores
 * Sistema POS Multitenant
 * 
 * Centraliza el manejo de errores de toda la aplicación
 * Proporciona respuestas consistentes y logging estructurado
 */

const { logger } = require('../config/database');

/**
 * Clase para errores personalizados de la aplicación
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware de manejo de errores centralizados
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // Log del error con contexto completo
  const errorContext = {
    error: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    errorCode: error.errorCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    companyId: req.tenant?.companyId,
    timestamp: new Date().toISOString()
  };
  
  // Diferentes niveles de log según el tipo de error
  if (error.statusCode >= 500) {
    logger.error('Error interno del servidor', errorContext);
  } else if (error.statusCode >= 400) {
    logger.warn('Error de cliente', errorContext);
  } else {
    logger.info('Error manejado', errorContext);
  }
  
  // Manejar tipos específicos de errores
  
  // Errores de MySQL
  if (error.code === 'ER_DUP_ENTRY') {
    const message = 'Recurso duplicado - ya existe un registro con estos datos';
    error = new AppError(message, 409, 'DUPLICATE_ENTRY', [error.message]);
  }
  
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    const message = 'Referencia inválida - el recurso referenciado no existe';
    error = new AppError(message, 400, 'INVALID_REFERENCE', [error.message]);
  }
  
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    const message = 'No se puede eliminar - el recurso está siendo utilizado';
    error = new AppError(message, 409, 'RESOURCE_IN_USE', [error.message]);
  }
  
  if (error.code === 'ER_DATA_TOO_LONG') {
    const message = 'Datos demasiado largos para el campo especificado';
    error = new AppError(message, 400, 'DATA_TOO_LONG', [error.message]);
  }
  
  if (error.code === 'ER_BAD_NULL_ERROR') {
    const message = 'Campo requerido no puede ser nulo';
    error = new AppError(message, 400, 'REQUIRED_FIELD_NULL', [error.message]);
  }
  
  // Errores de conexión a base de datos
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    const message = 'Error de conexión a la base de datos';
    error = new AppError(message, 503, 'DATABASE_CONNECTION_ERROR', [error.message]);
  }
  
  // Errores de JWT
  if (error.name === 'JsonWebTokenError') {
    const message = 'Token JWT inválido';
    error = new AppError(message, 401, 'INVALID_JWT', [error.message]);
  }
  
  if (error.name === 'TokenExpiredError') {
    const message = 'Token JWT expirado';
    error = new AppError(message, 401, 'EXPIRED_JWT', [error.message]);
  }
  
  // Errores de validación de Joi
  if (error.name === 'ValidationError' && error.details) {
    const details = error.details.map(detail => detail.message);
    const message = 'Errores de validación en los datos enviados';
    error = new AppError(message, 400, 'VALIDATION_ERROR', details);
  }
  
  // Errores de express-validator
  if (error.array && typeof error.array === 'function') {
    const details = error.array().map(err => `${err.param}: ${err.msg}`);
    const message = 'Errores de validación en los datos enviados';
    error = new AppError(message, 400, 'VALIDATION_ERROR', details);
  }
  
  // Errores de multer (upload de archivos)
  if (error.code === 'LIMIT_FILE_SIZE') {
    const message = 'Archivo demasiado grande';
    error = new AppError(message, 400, 'FILE_TOO_LARGE', [error.message]);
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    const message = 'Demasiados archivos';
    error = new AppError(message, 400, 'TOO_MANY_FILES', [error.message]);
  }
  
  // Errores de rate limiting
  if (error.type === 'entity.too.large') {
    const message = 'Payload demasiado grande';
    error = new AppError(message, 413, 'PAYLOAD_TOO_LARGE', [error.message]);
  }
  
  // Error por defecto para errores no manejados
  if (!error.statusCode) {
    error = new AppError(
      'Error interno del servidor', 
      500, 
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'development' ? [error.message] : ['Ocurrió un error inesperado']
    );
  }
  
  // Construir respuesta de error
  const errorResponse = {
    success: false,
    message: error.message,
    error: {
      code: error.errorCode || 'UNKNOWN_ERROR',
      details: error.details || []
    }
  };
  
  // En desarrollo, incluir stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.originalError = err;
  }
  
  // Enviar respuesta de error
  res.status(error.statusCode || 500).json(errorResponse);
};

/**
 * Middleware para manejar rutas no encontradas (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Ruta no encontrada: ${req.method} ${req.url}`,
    404,
    'ROUTE_NOT_FOUND',
    ['La ruta solicitada no existe en esta API']
  );
  
  next(error);
};

/**
 * Wrapper para funciones async que automáticamente pasa errores al middleware de error
 * @param {Function} fn - Función async a envolver
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware para logging de requests exitosos
 */
const successLogger = (req, res, next) => {
  // Interceptar el método res.json para loggear respuestas exitosas
  const originalJson = res.json;
  
  res.json = function(body) {
    // Solo loggear si es una respuesta exitosa
    if (res.statusCode >= 200 && res.statusCode < 400) {
      logger.info('Request exitoso', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: Date.now() - req.startTime,
        userId: req.user?.id,
        companyId: req.tenant?.companyId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    // Llamar al método original
    return originalJson.call(this, body);
  };
  
  // Marcar tiempo de inicio
  req.startTime = Date.now();
  
  next();
};

/**
 * Middleware para validar que el content-type sea application/json en requests POST/PUT
 */
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return next(new AppError(
        'Content-Type debe ser application/json',
        400,
        'INVALID_CONTENT_TYPE',
        [`Content-Type recibido: ${contentType || 'no especificado'}`]
      ));
    }
  }
  
  next();
};

/**
 * Middleware para manejar errores de parsing JSON
 */
const jsonErrorHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return next(new AppError(
      'JSON inválido en el body de la request',
      400,
      'INVALID_JSON',
      [err.message]
    ));
  }
  
  next(err);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  successLogger,
  validateContentType,
  jsonErrorHandler
};