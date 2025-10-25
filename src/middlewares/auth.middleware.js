/**
 * Middleware de Autenticación JWT
 * Sistema POS Multitenant
 */

const jwt = require('jsonwebtoken');
const { logger } = require('./logger');
const jwtUtils = require('../utils/jwt');
const User = require('../models/User');
const Company = require('../models/Company');

// Códigos de error consistentes
const ERROR_CODES = {
  TOKEN_REQUIRED: 'TOKEN_REQUIRED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_INACTIVE: 'USER_INACTIVE',
  COMPANY_INACTIVE: 'COMPANY_INACTIVE',
  AUTH_ERROR: 'AUTH_ERROR'
};

/**
 * Middleware para verificar token JWT
 * Soporta tokens en cookies httpOnly (preferido) y en header Authorization (fallback)
 */
const authenticateToken = async (req, res, next) => {
  console.log('🛡️ [AuthMiddleware] === INICIO AUTHENTICATE TOKEN ===');
  console.log('🛡️ [AuthMiddleware] URL:', req.method, req.url);
  console.log('🛡️ [AuthMiddleware] Headers:', {
    origin: req.headers.origin,
    authorization: req.headers.authorization ? 'Present' : 'Missing',
    userAgent: req.headers['user-agent']
  });
  console.log('🛡️ [AuthMiddleware] Cookies recibidas:', req.cookies);

  try {
    let token = null;
    let tokenSource = 'none';
    
    // Prioridad 1: Intentar obtener token de cookies httpOnly (más seguro)
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
      tokenSource = 'cookie:access_token';
      console.log('✅ [AuthMiddleware] Token encontrado en access_token cookie');
    }
    
    // Prioridad 1.5: Compatibilidad con nombre de cookie 'token'
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
      tokenSource = 'cookie:token';
      console.log('✅ [AuthMiddleware] Token encontrado en token cookie');
    }
    
    // Prioridad 2: Fallback al header Authorization para compatibilidad
    if (!token) {
      console.log('🛡️ [AuthMiddleware] No token en cookies, buscando en headers...');
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        tokenSource = 'header';
        console.log('✅ [AuthMiddleware] Token encontrado en Authorization header');
      }
    }
    
    if (!token) {
      console.log('❌ [AuthMiddleware] No token encontrado en ningún lugar');
      logger.warn('Token de acceso no proporcionado', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent'),
        hasCookies: !!req.cookies,
        hasAuthHeader: !!req.headers.authorization,
        cookieKeys: req.cookies ? Object.keys(req.cookies) : []
      });
      
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        code: ERROR_CODES.TOKEN_REQUIRED
      });
    }

    console.log('🛡️ [AuthMiddleware] Token encontrado via:', tokenSource);
    console.log('🛡️ [AuthMiddleware] Token (primeros 20 chars):', token.substring(0, 20) + '...');

    // Verificar el token
    console.log('🛡️ [AuthMiddleware] Verificando token con jwtUtils...');
    const decoded = jwtUtils.verifyAccessToken(token);
    
    console.log('✅ [AuthMiddleware] Token decodificado exitosamente:', {
      user_id: decoded.user_id,
      email: decoded.email,
      role: decoded.role,
      company_id: decoded.company_id,
      exp: new Date(decoded.exp * 1000).toISOString(),
      iat: new Date(decoded.iat * 1000).toISOString()
    });
    
    // Verificar que el usuario y empresa sigan activos
    console.log('🛡️ [AuthMiddleware] Verificando usuario activo...');
    const user = await User.findById(decoded.user_id);
    
    if (!user) {
      console.log('❌ [AuthMiddleware] Usuario no encontrado en BD:', decoded.user_id);
      logger.warn('Usuario no encontrado para token válido', {
        userId: decoded.user_id,
        tokenSource,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
        code: ERROR_CODES.USER_NOT_FOUND
      });
    }
    
    if (!user.is_active) {
      console.log('❌ [AuthMiddleware] Usuario inactivo:', user.id);
      logger.warn('Acceso denegado: usuario inactivo', {
        userId: user.id,
        tokenSource,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo',
        code: ERROR_CODES.USER_INACTIVE
      });
    }

    console.log('✅ [AuthMiddleware] Usuario activo verificado:', {
      id: user.id,
      name: user.name,
      email: user.email
    });

    console.log('🛡️ [AuthMiddleware] Verificando empresa activa...');
    const company = await Company.findById(decoded.company_id);
    
    if (!company || !company.is_active) {
      console.log('❌ [AuthMiddleware] Empresa no encontrada o inactiva:', {
        company_id: decoded.company_id,
        found: !!company,
        is_active: company?.is_active
      });
      
      logger.warn('Acceso denegado: empresa inactiva', {
        companyId: decoded.company_id,
        userId: decoded.user_id,
        tokenSource,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Empresa inactiva',
        code: ERROR_CODES.COMPANY_INACTIVE
      });
    }

    console.log('✅ [AuthMiddleware] Empresa activa verificada:', {
      id: company.id,
      name: company.name
    });
    
    // Adjuntar información del usuario y empresa al request
    req.user = {
      user_id: decoded.user_id,
      company_id: decoded.company_id,
      role: decoded.role,
      email: decoded.email,
      name: decoded.name,
      tokenSource: tokenSource
    };
    
    req.company = {
      id: company.id,
      name: company.name,
      plan: company.plan
    };

    console.log('✅ [AuthMiddleware] Datos adjuntados a req.user:', req.user);
    console.log('✅ [AuthMiddleware] Datos adjuntados a req.company:', req.company);
    
    logger.info('Usuario autenticado exitosamente', {
      userId: decoded.user_id,
      companyId: decoded.company_id,
      role: decoded.role,
      tokenSource: tokenSource,
      ip: req.ip,
      url: req.url
    });

    console.log('🛡️ [AuthMiddleware] === FIN AUTHENTICATE TOKEN EXITOSO ===');
    next();
    
  } catch (error) {
    console.log('❌ [AuthMiddleware] ERROR EN VERIFICACIÓN:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n')[0]
    });

    logger.error('Error verificando token', {
      error: error.message,
      tokenPresent: !!token,
      ip: req.ip,
      url: req.url
    });
    
    // Determinar el tipo de error JWT
    if (error.name === 'TokenExpiredError') {
      console.log('❌ [AuthMiddleware] Token expirado');
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        code: ERROR_CODES.TOKEN_EXPIRED
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ [AuthMiddleware] Token inválido');
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        code: ERROR_CODES.TOKEN_INVALID
      });
    }
    
    console.log('❌ [AuthMiddleware] Error general de autenticación');
    return res.status(401).json({
      success: false,
      message: 'Error de autenticación',
      code: ERROR_CODES.AUTH_ERROR
    });
  }
};

/**
 * Middleware para verificar roles específicos
 * @param {Array<string>} allowedRoles - Roles permitidos
 */
const requireRoles = (allowedRoles) => {
  return (req, res, next) => {
    console.log('🔐 [RequireRoles] === VERIFICACIÓN DE ROLES ===');
    console.log('🔐 [RequireRoles] Roles permitidos:', allowedRoles);
    console.log('🔐 [RequireRoles] Usuario actual:', req.user);
    
    try {
      if (!req.user) {
        console.log('❌ [RequireRoles] No hay usuario autenticado');
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          code: 'NOT_AUTHENTICATED'
        });
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        console.log('❌ [RequireRoles] Rol insuficiente:', {
          userRole: req.user.role,
          requiredRoles: allowedRoles
        });
        
        logger.warn('Acceso denegado por rol insuficiente', {
          userId: req.user.user_id,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          url: req.url,
          method: req.method
        });
        
        return res.status(403).json({
          success: false,
          message: 'Permisos insuficientes',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      
      console.log('✅ [RequireRoles] Rol verificado exitosamente');
      next();
    } catch (error) {
      console.log('❌ [RequireRoles] Error en verificación:', error.message);
      logger.error('Error en verificación de roles', {
        error: error.message,
        userId: req.user?.user_id,
        allowedRoles
      });
      
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'ROLE_CHECK_ERROR'
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
  console.log('🔓 [OptionalAuth] === AUTENTICACIÓN OPCIONAL ===');
  
  try {
    let token = null;
    
    // Intentar obtener token
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
      console.log('🔓 [OptionalAuth] Token encontrado en cookies');
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('🔓 [OptionalAuth] Token encontrado en header');
      }
    }
    
    if (token) {
      try {
        const decoded = jwtUtils.verifyAccessToken(token);
        req.user = {
          user_id: decoded.user_id,
          company_id: decoded.company_id,
          role: decoded.role,
          email: decoded.email,
          name: decoded.name
        };
        console.log('✅ [OptionalAuth] Token válido, usuario autenticado');
      } catch (error) {
        console.log('⚠️ [OptionalAuth] Token inválido, continuando sin autenticación');
        logger.debug('Token opcional inválido', { error: error.message });
      }
    } else {
      console.log('ℹ️ [OptionalAuth] No token presente, continuando sin autenticación');
    }
    
    next();
  } catch (error) {
    console.log('⚠️ [OptionalAuth] Error en autenticación opcional:', error.message);
    logger.debug('Error en autenticación opcional', { error: error.message });
    next();
  }
};

/**
 * Middleware para verificar que el token no esté próximo a expirar
 */
const checkTokenExpiration = (req, res, next) => {
  console.log('⏰ [TokenExpiration] === VERIFICACIÓN DE EXPIRACIÓN ===');
  
  try {
    if (req.user && req.user.tokenExpiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = req.user.tokenExpiresAt;
      const timeUntilExpiration = expiresAt - now;
      
      console.log('⏰ [TokenExpiration] Token expira en:', timeUntilExpiration, 'segundos');
      
      // Si expira en menos de 1 hora (3600 segundos)
      if (timeUntilExpiration < 3600) {
        res.set('X-Token-Expires-Soon', 'true');
        res.set('X-Token-Expires-In', timeUntilExpiration.toString());
        
        console.log('⚠️ [TokenExpiration] Token próximo a expirar');
        logger.info('Token próximo a expirar', {
          userId: req.user.user_id,
          expiresInSeconds: timeUntilExpiration
        });
      }
    }
    
    next();
  } catch (error) {
    console.log('⚠️ [TokenExpiration] Error verificando expiración:', error.message);
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