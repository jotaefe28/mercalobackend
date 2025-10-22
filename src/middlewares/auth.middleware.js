/**
 * Middleware de Autenticación JWT
 * Sistema POS Multitenant
 */

const jwt = require('jsonwebtoken');
const { logger } = require('./logger');
const { extractCompanyIdFromRequest } = require('../config/tenantResolver');

/**
 * Middleware para verificar token JWT
 * Soporta tokens en cookies httpOnly y en header Authorization
 */
const authenticateToken = async (req, res, next) => {
  try {
    let token = null;
    
    // Intentar obtener token del header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Si no hay token en header, intentar obtener de cookies
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    
    if (!token) {
      logger.warn('Token de acceso no proporcionado', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        error: {
          code: 'MISSING_TOKEN',
          details: ['Token JWT no proporcionado en header Authorization o cookies']
        }
      });
    }
    
    // Verificar y decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validar campos requeridos en el token
    if (!decoded.userId || !decoded.company_id || !decoded.role) {
      logger.warn('Token JWT con campos faltantes', {
        tokenFields: Object.keys(decoded),
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Token inválido - campos requeridos faltantes',
        error: {
          code: 'INVALID_TOKEN_STRUCTURE',
          details: ['Token no contiene userId, company_id o role']
        }
      });
    }
    
    // Agregar información del usuario a la request
    req.user = {
      id: decoded.userId,
      company_id: decoded.company_id,
      role: decoded.role,
      email: decoded.email,
      name: decoded.name,
      tokenIssuedAt: decoded.iat,
      tokenExpiresAt: decoded.exp
    };
    
    // Log de autenticación exitosa
    logger.info('Autenticación exitosa', {
      userId: req.user.id,
      companyId: req.user.company_id,
      role: req.user.role,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    
    next();
    
  } catch (error) {
    // Manejar diferentes tipos de errores JWT
    let errorCode = 'INVALID_TOKEN';
    let errorMessage = 'Token inválido';
    let statusCode = 401;
    
    if (error.name === 'TokenExpiredError') {
      errorCode = 'TOKEN_EXPIRED';
      errorMessage = 'Token expirado';
      statusCode = 401;
    } else if (error.name === 'JsonWebTokenError') {
      errorCode = 'MALFORMED_TOKEN';
      errorMessage = 'Token malformado';
      statusCode = 401;
    } else if (error.name === 'NotBeforeError') {
      errorCode = 'TOKEN_NOT_ACTIVE';
      errorMessage = 'Token no activo aún';
      statusCode = 401;
    }
    
    logger.error('Error de autenticación JWT', {
      error: error.message,
      errorName: error.name,
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: {
        code: errorCode,
        details: [error.message]
      }
    });
  }
};

/**
 * Middleware para verificar roles específicos
 * @param {Array<string>} allowedRoles - Roles permitidos
 */
const requireRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: {
            code: 'NOT_AUTHENTICATED',
            details: ['Debe estar autenticado para acceder a este recurso']
          }
        });
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Acceso denegado por rol insuficiente', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          url: req.url,
          method: req.method
        });
        
        return res.status(403).json({
          success: false,
          message: 'Permisos insuficientes',
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            details: [`Rol requerido: ${allowedRoles.join(' o ')}, rol actual: ${req.user.role}`]
          }
        });
      }
      
      next();
    } catch (error) {
      logger.error('Error en verificación de roles', {
        error: error.message,
        userId: req.user?.id,
        allowedRoles
      });
      
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: {
          code: 'ROLE_CHECK_ERROR',
          details: ['Error verificando permisos de usuario']
        }
      });
    }
  };
};

/**
 * Middleware para rutas que requieren rol ADMIN
 */
const requireAdmin = requireRoles(['ADMIN']);

/**
 * Middleware para rutas que requieren rol ADMIN o MANAGER
 */
const requireManager = requireRoles(['ADMIN', 'MANAGER']);

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 * Útil para endpoints que pueden funcionar con o sin autenticación
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    
    // Intentar obtener token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
          id: decoded.userId,
          company_id: decoded.company_id,
          role: decoded.role,
          email: decoded.email,
          name: decoded.name
        };
      } catch (error) {
        // Token inválido, pero no fallar
        logger.debug('Token opcional inválido', { error: error.message });
      }
    }
    
    next();
  } catch (error) {
    // No fallar en autenticación opcional
    logger.debug('Error en autenticación opcional', { error: error.message });
    next();
  }
};

/**
 * Middleware para verificar que el token no esté próximo a expirar
 * Envía header de advertencia si expira en menos de 1 hora
 */
const checkTokenExpiration = (req, res, next) => {
  try {
    if (req.user && req.user.tokenExpiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = req.user.tokenExpiresAt;
      const timeUntilExpiration = expiresAt - now;
      
      // Si expira en menos de 1 hora (3600 segundos)
      if (timeUntilExpiration < 3600) {
        res.set('X-Token-Expires-Soon', 'true');
        res.set('X-Token-Expires-In', timeUntilExpiration.toString());
        
        logger.info('Token próximo a expirar', {
          userId: req.user.id,
          expiresInSeconds: timeUntilExpiration
        });
      }
    }
    
    next();
  } catch (error) {
    // No fallar por este check
    logger.debug('Error verificando expiración de token', { error: error.message });
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRoles,
  requireAdmin,
  requireManager,
  optionalAuth,
  checkTokenExpiration
};