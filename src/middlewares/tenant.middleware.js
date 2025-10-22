/**
 * Middleware de Tenant (Multitenant)
 * Sistema POS Multitenant
 * 
 * Este middleware asegura el aislamiento completo de datos entre empresas
 * Debe ser usado en todas las rutas que manejen datos específicos de empresa
 */

const { resolveTenantContext, verifyResourceOwnership } = require('../config/tenantResolver');
const { logger } = require('../config/database');

/**
 * Middleware principal de tenant
 * Extrae y valida el contexto del tenant (empresa) para cada request
 */
const extractTenant = async (req, res, next) => {
  try {
    // Resolver contexto del tenant
    const tenantContext = await resolveTenantContext(req);
    
    if (!tenantContext.isValid) {
      logger.warn('Contexto de tenant inválido', {
        error: tenantContext.error,
        companyId: tenantContext.companyId,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Determinar el tipo de error y código de respuesta
      let statusCode = 400;
      let errorCode = 'INVALID_TENANT';
      
      if (tenantContext.error?.includes('no encontrado')) {
        statusCode = 401;
        errorCode = 'MISSING_COMPANY_ID';
      } else if (tenantContext.error?.includes('no válida') || tenantContext.error?.includes('inactiva')) {
        statusCode = 403;
        errorCode = 'INACTIVE_COMPANY';
      }
      
      return res.status(statusCode).json({
        success: false,
        message: 'Acceso denegado - Empresa no válida',
        error: {
          code: errorCode,
          details: [tenantContext.error]
        }
      });
    }
    
    // Agregar contexto de tenant a la request
    req.tenant = {
      companyId: tenantContext.companyId,
      company: tenantContext.company
    };
    
    // Verificar consistencia con el usuario autenticado
    if (req.user && req.user.company_id !== tenantContext.companyId) {
      logger.error('Inconsistencia entre company_id del token y tenant resuelto', {
        tokenCompanyId: req.user.company_id,
        resolvedCompanyId: tenantContext.companyId,
        userId: req.user.id,
        url: req.url
      });
      
      return res.status(403).json({
        success: false,
        message: 'Inconsistencia de datos de empresa',
        error: {
          code: 'COMPANY_MISMATCH',
          details: ['La empresa del token no coincide con la empresa resuelta']
        }
      });
    }
    
    // Log de contexto de tenant exitoso
    logger.debug('Contexto de tenant establecido', {
      companyId: req.tenant.companyId,
      companyName: req.tenant.company.name,
      companyPlan: req.tenant.company.plan,
      url: req.url,
      method: req.method,
      userId: req.user?.id
    });
    
    next();
    
  } catch (error) {
    logger.error('Error en middleware de tenant', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: {
        code: 'TENANT_MIDDLEWARE_ERROR',
        details: ['Error procesando contexto de empresa']
      }
    });
  }
};

/**
 * Middleware para verificar propiedad de recursos
 * Usado en rutas que acceden a recursos específicos por ID
 * @param {string} table - Nombre de la tabla del recurso
 * @param {string} paramName - Nombre del parámetro que contiene el ID (default: 'id')
 */
const verifyResourceTenant = (table, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'ID de recurso requerido',
          error: {
            code: 'MISSING_RESOURCE_ID',
            details: [`Parámetro '${paramName}' no proporcionado`]
          }
        });
      }
      
      if (!req.tenant || !req.tenant.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Contexto de empresa no establecido',
          error: {
            code: 'MISSING_TENANT_CONTEXT',
            details: ['Middleware de tenant debe ejecutarse antes']
          }
        });
      }
      
      // Verificar que el recurso pertenece al tenant
      const isOwner = await verifyResourceOwnership(
        table,
        resourceId,
        req.tenant.companyId
      );
      
      if (!isOwner) {
        logger.warn('Intento de acceso a recurso de otra empresa', {
          table,
          resourceId,
          userCompanyId: req.tenant.companyId,
          userId: req.user?.id,
          url: req.url,
          method: req.method
        });
        
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado',
          error: {
            code: 'RESOURCE_NOT_FOUND',
            details: ['El recurso no existe o no pertenece a su empresa']
          }
        });
      }
      
      next();
      
    } catch (error) {
      logger.error('Error verificando propiedad de recurso', {
        error: error.message,
        table,
        resourceId: req.params[paramName],
        companyId: req.tenant?.companyId
      });
      
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: {
          code: 'RESOURCE_VERIFICATION_ERROR',
          details: ['Error verificando propiedad del recurso']
        }
      });
    }
  };
};

/**
 * Middleware para agregar automáticamente company_id a body de requests
 * Útil para operaciones POST/PUT que crean o actualizan recursos
 */
const injectTenantId = (req, res, next) => {
  try {
    if (!req.tenant || !req.tenant.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Contexto de empresa no establecido',
        error: {
          code: 'MISSING_TENANT_CONTEXT',
          details: ['Middleware de tenant debe ejecutarse antes']
        }
      });
    }
    
    // Agregar company_id al body si no existe
    if (req.body && typeof req.body === 'object') {
      req.body.company_id = req.tenant.companyId;
    }
    
    // También agregar a query params si es necesario
    req.tenantId = req.tenant.companyId;
    
    next();
  } catch (error) {
    logger.error('Error inyectando tenant ID', {
      error: error.message,
      companyId: req.tenant?.companyId
    });
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: {
        code: 'TENANT_INJECTION_ERROR',
        details: ['Error inyectando ID de empresa']
      }
    });
  }
};

/**
 * Middleware para logging de operaciones por tenant
 * Registra todas las operaciones realizadas por cada empresa
 */
const logTenantOperation = (req, res, next) => {
  try {
    if (req.tenant && req.user) {
      logger.info('Operación de tenant registrada', {
        operation: `${req.method} ${req.url}`,
        companyId: req.tenant.companyId,
        companyName: req.tenant.company.name,
        userId: req.user.id,
        userRole: req.user.role,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  } catch (error) {
    // No fallar por logging, solo registrar el error
    logger.debug('Error en logging de tenant operation', {
      error: error.message
    });
    next();
  }
};

/**
 * Middleware para verificar límites del plan de la empresa
 * @param {string} feature - Característica a verificar (ej: 'users', 'products', 'sales')
 * @param {number} limit - Límite específico (opcional, se puede obtener del plan)
 */
const checkPlanLimits = (feature, limit = null) => {
  return async (req, res, next) => {
    try {
      if (!req.tenant || !req.tenant.company) {
        return res.status(403).json({
          success: false,
          message: 'Contexto de empresa no establecido',
          error: {
            code: 'MISSING_TENANT_CONTEXT',
            details: ['Información de plan no disponible']
          }
        });
      }
      
      const plan = req.tenant.company.plan;
      
      // Definir límites por plan (esto podría venir de una tabla de configuración)
      const planLimits = {
        BASIC: {
          users: 5,
          products: 100,
          sales_per_day: 50
        },
        PREMIUM: {
          users: 20,
          products: 1000,
          sales_per_day: 200
        },
        ENTERPRISE: {
          users: -1, // Ilimitado
          products: -1,
          sales_per_day: -1
        }
      };
      
      const currentLimit = limit || planLimits[plan]?.[feature];
      
      if (currentLimit === undefined) {
        logger.warn('Feature o plan no reconocido para verificación de límites', {
          plan,
          feature,
          companyId: req.tenant.companyId
        });
        return next(); // Continuar si no se puede verificar
      }
      
      if (currentLimit === -1) {
        return next(); // Ilimitado
      }
      
      // Aquí se podría implementar la lógica para contar recursos actuales
      // Por ahora, solo agregamos la información a la request
      req.planLimits = {
        feature,
        limit: currentLimit,
        plan
      };
      
      next();
      
    } catch (error) {
      logger.error('Error verificando límites del plan', {
        error: error.message,
        feature,
        companyId: req.tenant?.companyId
      });
      
      // No bloquear por error en verificación de límites
      next();
    }
  };
};

module.exports = {
  extractTenant,
  verifyResourceTenant,
  injectTenantId,
  logTenantOperation,
  checkPlanLimits
};