/**
 * Tenant Resolver - Sistema de resolución de inquilinos (multitenancy)
 * Sistema POS Multitenant
 * 
 * Este módulo maneja la identificación y validación de inquilinos (companies)
 * para asegurar el aislamiento completo de datos entre diferentes empresas
 */

const { executeQuery, logger } = require('./database');
const jwt = require('jsonwebtoken');

/**
 * Extraer company_id del token JWT
 * @param {string} token - Token JWT
 * @returns {string|null} Company ID o null si no es válido
 */
function extractCompanyIdFromToken(token) {
  try {
    if (!token) return null;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.company_id || null;
  } catch (error) {
    logger.warn('Token JWT inválido en tenant resolver:', {
      error: error.message,
      token: token ? 'Presente' : 'Ausente'
    });
    return null;
  }
}

/**
 * Extraer company_id de las cookies de la request
 * @param {Object} req - Request object de Express
 * @returns {string|null} Company ID o null si no se encuentra
 */
function extractCompanyIdFromRequest(req) {
  try {
    // Intentar extraer del header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const companyId = extractCompanyIdFromToken(token);
      if (companyId) return companyId;
    }
    
    // Intentar extraer de las cookies
    if (req.cookies && req.cookies.accessToken) {
      const companyId = extractCompanyIdFromToken(req.cookies.accessToken);
      if (companyId) return companyId;
    }
    
    // Si no se encuentra en ningún lugar
    return null;
  } catch (error) {
    logger.error('Error extrayendo company_id de la request:', {
      error: error.message,
      hasAuthHeader: !!req.headers.authorization,
      hasCookies: !!req.cookies
    });
    return null;
  }
}

/**
 * Validar que la empresa existe y está activa
 * @param {string} companyId - ID de la empresa
 * @returns {Promise<Object|null>} Datos de la empresa o null si no es válida
 */
async function validateCompany(companyId) {
  try {
    if (!companyId) return null;
    
    const query = `
      SELECT 
        id,
        name,
        tax_id,
        plan,
        active_until,
        is_active,
        created_at
      FROM companies 
      WHERE id = ? 
        AND is_active = 1 
        AND (active_until IS NULL OR active_until > NOW())
    `;
    
    const companies = await executeQuery(
      query, 
      [companyId], 
      'Validación de empresa'
    );
    
    if (companies.length === 0) {
      logger.warn('Empresa no válida o inactiva:', { companyId });
      return null;
    }
    
    const company = companies[0];
    
    // Verificar si la empresa está próxima a vencer (7 días)
    if (company.active_until) {
      const expirationDate = new Date(company.active_until);
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 7);
      
      if (expirationDate <= warningDate) {
        logger.warn('Empresa próxima a vencer:', {
          companyId,
          companyName: company.name,
          expirationDate: company.active_until
        });
      }
    }
    
    logger.debug('Empresa validada correctamente:', {
      companyId,
      companyName: company.name,
      plan: company.plan
    });
    
    return company;
  } catch (error) {
    logger.error('Error validando empresa:', {
      error: error.message,
      companyId
    });
    throw error;
  }
}

/**
 * Generar contexto de tenant completo para la request
 * @param {Object} req - Request object de Express
 * @returns {Promise<Object>} Contexto del tenant
 */
async function resolveTenantContext(req) {
  try {
    const companyId = extractCompanyIdFromRequest(req);
    
    if (!companyId) {
      return {
        isValid: false,
        companyId: null,
        company: null,
        error: 'Company ID no encontrado en la request'
      };
    }
    
    const company = await validateCompany(companyId);
    
    if (!company) {
      return {
        isValid: false,
        companyId,
        company: null,
        error: 'Empresa no válida o inactiva'
      };
    }
    
    return {
      isValid: true,
      companyId,
      company,
      error: null
    };
  } catch (error) {
    logger.error('Error resolviendo contexto de tenant:', {
      error: error.message,
      url: req.url,
      method: req.method
    });
    
    return {
      isValid: false,
      companyId: null,
      company: null,
      error: error.message
    };
  }
}

/**
 * Agregar filtro de tenant a una consulta SQL
 * @param {string} query - Consulta SQL base
 * @param {string} companyId - ID de la empresa
 * @param {string} tableAlias - Alias de la tabla (opcional)
 * @returns {Object} Query modificada y parámetros
 */
function addTenantFilter(query, companyId, tableAlias = '') {
  if (!companyId) {
    throw new Error('Company ID es requerido para filtro de tenant');
  }
  
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const tenantCondition = `${prefix}company_id = ?`;
  
  // Si la query ya tiene WHERE, agregar AND
  if (query.toLowerCase().includes('where')) {
    query += ` AND ${tenantCondition}`;
  } else {
    query += ` WHERE ${tenantCondition}`;
  }
  
  return {
    query,
    tenantParam: companyId
  };
}

/**
 * Verificar que un recurso pertenece al tenant actual
 * @param {string} table - Nombre de la tabla
 * @param {string} resourceId - ID del recurso
 * @param {string} companyId - ID de la empresa
 * @returns {Promise<boolean>} True si el recurso pertenece al tenant
 */
async function verifyResourceOwnership(table, resourceId, companyId) {
  try {
    const query = `
      SELECT COUNT(*) as count 
      FROM ${table} 
      WHERE id = ? AND company_id = ?
    `;
    
    const result = await executeQuery(
      query,
      [resourceId, companyId],
      `Verificación de propiedad de recurso en ${table}`
    );
    
    return result[0].count > 0;
  } catch (error) {
    logger.error('Error verificando propiedad de recurso:', {
      error: error.message,
      table,
      resourceId,
      companyId
    });
    return false;
  }
}

/**
 * Middleware para logs de tenant (debugging)
 */
function logTenantContext(req, res, next) {
  const companyId = extractCompanyIdFromRequest(req);
  
  logger.debug('Contexto de tenant en request:', {
    url: req.url,
    method: req.method,
    companyId: companyId || 'No detectado',
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  next();
}

module.exports = {
  extractCompanyIdFromToken,
  extractCompanyIdFromRequest,
  validateCompany,
  resolveTenantContext,
  addTenantFilter,
  verifyResourceOwnership,
  logTenantContext
};