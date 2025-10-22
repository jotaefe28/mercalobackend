/**
 * Middleware de Not Found (404)
 * Sistema POS Multitenant
 */

const { logger } = require('./logger');

/**
 * Middleware para manejar rutas no encontradas
 */
const notFoundHandler = (req, res, next) => {
  // Loggear la ruta no encontrada
  logger.warn('Route Not Found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    company_id: req.company?.id || null,
    user_id: req.user?.id || null
  });

  // Respuesta estructurada para ruta no encontrada
  const errorResponse = {
    success: false,
    error: {
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
      statusCode: 404,
      suggestions: [
        'Verificar la URL solicitada',
        'Consultar la documentación de la API en /api-docs',
        'Verificar que el método HTTP sea correcto'
      ]
    }
  };

  res.status(404).json(errorResponse);
};

module.exports = notFoundHandler;