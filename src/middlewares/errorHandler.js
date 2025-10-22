/**
 * Middleware de Manejo de Errores
 * Sistema POS Multitenant
 */

const { logger } = require('./logger');

/**
 * Middleware principal de manejo de errores
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Logging del error ya se hace en errorLogger
  
  // Errores de validación de Mongoose/Sequelize
  if (err.name === 'ValidationError') {
    const message = 'Datos de entrada inválidos';
    const details = Object.values(err.errors).map(val => val.message);
    error = {
      statusCode: 400,
      message,
      details
    };
  }

  // Errores de duplicación (MySQL)
  if (err.code === 'ER_DUP_ENTRY') {
    const message = 'Recurso duplicado';
    error = {
      statusCode: 409,
      message
    };
  }

  // Errores de constraint de foreign key
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    const message = 'Referencia inválida - el recurso relacionado no existe';
    error = {
      statusCode: 400,
      message
    };
  }

  // Errores de conexión a base de datos
  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') {
    const message = 'Error de conexión a la base de datos';
    error = {
      statusCode: 500,
      message
    };
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token inválido';
    error = {
      statusCode: 401,
      message
    };
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expirado';
    error = {
      statusCode: 401,
      message
    };
  }

  // Errores de cast (ID inválido)
  if (err.name === 'CastError') {
    const message = 'ID de recurso inválido';
    error = {
      statusCode: 400,
      message
    };
  }

  // Errores de rate limiting
  if (err.type === 'entity.too.large') {
    const message = 'Payload demasiado grande';
    error = {
      statusCode: 413,
      message
    };
  }

  // Errores de sintaxis JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const message = 'JSON inválido en el cuerpo de la petición';
    error = {
      statusCode: 400,
      message
    };
  }

  // Determinar status code
  const statusCode = error.statusCode || err.statusCode || 500;
  
  // Determinar mensaje
  let message = error.message || err.message || 'Error interno del servidor';
  
  // En producción, no mostrar detalles técnicos de errores 500
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Error interno del servidor';
  }

  // Respuesta de error estructurada
  const errorResponse = {
    success: false,
    error: {
      message,
      statusCode,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  };

  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware para manejar promesas rechazadas no capturadas
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Middleware para errores de operaciones asíncronas
 */
const handleAsyncErrors = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = errorHandler;