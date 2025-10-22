/**
 * Middleware de Validación
 * Sistema POS Multitenant
 * 
 * Proporciona funciones de validación reutilizables usando Joi
 * y express-validator para validar datos de entrada
 */

const Joi = require('joi');
const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./error.middleware');
const { logger } = require('../config/database');

/**
 * Middleware para validar usando esquemas de Joi
 * @param {Object} schema - Esquema de Joi para validación
 * @param {string} target - Objetivo de validación ('body', 'params', 'query')
 */
const validateJoi = (schema, target = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[target];
      
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false, // Mostrar todos los errores
        allowUnknown: false, // No permitir campos desconocidos
        stripUnknown: true // Remover campos desconocidos
      });
      
      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        
        logger.warn('Error de validación Joi', {
          target,
          details,
          url: req.url,
          method: req.method,
          userId: req.user?.id
        });
        
        return next(new AppError(
          'Errores de validación en los datos enviados',
          400,
          'VALIDATION_ERROR',
          details.map(d => `${d.field}: ${d.message}`)
        ));
      }
      
      // Reemplazar datos validados (con posible sanitización)
      req[target] = value;
      
      next();
    } catch (err) {
      logger.error('Error en middleware de validación Joi', {
        error: err.message,
        target
      });
      
      next(new AppError(
        'Error interno en validación',
        500,
        'VALIDATION_MIDDLEWARE_ERROR'
      ));
    }
  };
};

/**
 * Middleware para procesar errores de express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    logger.warn('Error de validación express-validator', {
      details: errorDetails,
      url: req.url,
      method: req.method,
      userId: req.user?.id
    });
    
    return next(new AppError(
      'Errores de validación en los datos enviados',
      400,
      'VALIDATION_ERROR',
      errorDetails.map(d => `${d.field}: ${d.message}`)
    ));
  }
  
  next();
};

/**
 * Esquemas de validación comunes con Joi
 */
const commonSchemas = {
  // UUID v4
  uuid: Joi.string().uuid({ version: 'uuidv4' }),
  
  // Email
  email: Joi.string().email().max(255),
  
  // Contraseña segura
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y símbolos'),
  
  // Nombre de persona
  personName: Joi.string().min(2).max(100).trim(),
  
  // Teléfono
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{7,20}$/).max(20),
  
  // Documento de identidad
  document: Joi.string().alphanum().min(5).max(20),
  
  // SKU de producto
  sku: Joi.string().alphanum().min(1).max(50).uppercase(),
  
  // Precio/dinero
  money: Joi.number().precision(2).min(0).max(999999999.99),
  
  // Cantidad/stock
  quantity: Joi.number().integer().min(0).max(999999),
  
  // Fecha
  date: Joi.date().iso(),
  
  // Paginación
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().max(50),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }
};

/**
 * Validadores específicos para entidades
 */
const entityValidators = {
  // Validador de empresa
  company: {
    create: Joi.object({
      name: Joi.string().min(2).max(255).required(),
      tax_id: Joi.string().alphanum().min(5).max(20).required(),
      plan: Joi.string().valid('BASIC', 'PREMIUM', 'ENTERPRISE').default('BASIC'),
      active_until: Joi.date().iso().greater('now').optional()
    }),
    
    update: Joi.object({
      name: Joi.string().min(2).max(255),
      tax_id: Joi.string().alphanum().min(5).max(20),
      plan: Joi.string().valid('BASIC', 'PREMIUM', 'ENTERPRISE'),
      active_until: Joi.date().iso().greater('now').allow(null),
      is_active: Joi.boolean()
    }).min(1)
  },
  
  // Validador de usuario
  user: {
    create: Joi.object({
      name: commonSchemas.personName.required(),
      email: commonSchemas.email.required(),
      password: commonSchemas.password.required(),
      role: Joi.string().valid('ADMIN', 'USER', 'MANAGER').default('USER')
    }),
    
    update: Joi.object({
      name: commonSchemas.personName,
      email: commonSchemas.email,
      password: commonSchemas.password,
      role: Joi.string().valid('ADMIN', 'USER', 'MANAGER'),
      is_active: Joi.boolean()
    }).min(1),
    
    login: Joi.object({
      email: commonSchemas.email.required(),
      password: Joi.string().required(),
      remember_me: Joi.boolean().default(false)
    })
  },
  
  // Validador de producto
  product: {
    create: Joi.object({
      sku: commonSchemas.sku.required(),
      name: Joi.string().min(1).max(255).required(),
      description: Joi.string().max(1000).allow(''),
      price: commonSchemas.money.required(),
      cost: commonSchemas.money.required(),
      stock: commonSchemas.quantity.required(),
      min_stock: commonSchemas.quantity.default(0)
    }),
    
    update: Joi.object({
      sku: commonSchemas.sku,
      name: Joi.string().min(1).max(255),
      description: Joi.string().max(1000).allow(''),
      price: commonSchemas.money,
      cost: commonSchemas.money,
      stock: commonSchemas.quantity,
      min_stock: commonSchemas.quantity,
      is_active: Joi.boolean()
    }).min(1)
  },
  
  // Validador de cliente
  client: {
    create: Joi.object({
      name: commonSchemas.personName.required(),
      document: commonSchemas.document.required(),
      phone: commonSchemas.phone.required(),
      email: commonSchemas.email.optional(),
      address: Joi.string().max(500).optional()
    }),
    
    update: Joi.object({
      name: commonSchemas.personName,
      document: commonSchemas.document,
      phone: commonSchemas.phone,
      email: commonSchemas.email.allow(null),
      address: Joi.string().max(500).allow(null)
    }).min(1)
  },
  
  // Validador de venta
  sale: {
    create: Joi.object({
      client_id: commonSchemas.uuid.optional(),
      items: Joi.array().items(
        Joi.object({
          product_id: commonSchemas.uuid.required(),
          quantity: Joi.number().integer().min(1).max(1000).required(),
          unit_price: commonSchemas.money.required()
        })
      ).min(1).required(),
      points_to_redeem: Joi.number().integer().min(0).default(0),
      delivery_type: Joi.string().valid('store', 'delivery').default('store'),
      delivery_address: Joi.string().max(500).when('delivery_type', {
        is: 'delivery',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      payment_methods: Joi.array().items(
        Joi.object({
          method_id: commonSchemas.uuid.required(),
          amount: commonSchemas.money.required(),
          reference: Joi.string().max(255).optional()
        })
      ).min(1).required(),
      notes: Joi.string().max(1000).optional()
    })
  },
  
  // Validador de redención de puntos
  pointsRedemption: {
    redeem: Joi.object({
      customer_id: commonSchemas.uuid.required(),
      points_to_redeem: Joi.number().integer().min(1).max(10000).required(),
      sale_total: commonSchemas.money.required()
    })
  }
};

/**
 * Validadores de parámetros usando express-validator
 */
const paramValidators = {
  // ID válido
  id: param('id').isUUID(4).withMessage('ID debe ser un UUID válido'),
  
  // Término de búsqueda
  searchTerm: param('term')
    .isLength({ min: 1, max: 100 })
    .withMessage('Término de búsqueda debe tener entre 1 y 100 caracteres')
    .trim()
    .escape(),
  
  // Identificador de cliente (documento o teléfono)
  customerIdentifier: param('identifier')
    .isLength({ min: 5, max: 20 })
    .withMessage('Identificador debe tener entre 5 y 20 caracteres')
    .trim()
};

/**
 * Validadores de query parameters
 */
const queryValidators = {
  // Paginación
  pagination: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sortBy').optional().isLength({ max: 50 }).trim(),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  
  // Búsqueda
  search: query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Búsqueda no puede exceder 100 caracteres')
    .trim()
    .escape()
};

/**
 * Función helper para validar archivos subidos
 * @param {Object} file - Archivo de multer
 * @param {Array} allowedTypes - Tipos MIME permitidos
 * @param {number} maxSize - Tamaño máximo en bytes
 */
const validateFile = (file, allowedTypes = ['image/jpeg', 'image/png'], maxSize = 5242880) => {
  if (!file) {
    throw new AppError('Archivo requerido', 400, 'FILE_REQUIRED');
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new AppError(
      'Tipo de archivo no permitido',
      400,
      'INVALID_FILE_TYPE',
      [`Tipos permitidos: ${allowedTypes.join(', ')}`]
    );
  }
  
  if (file.size > maxSize) {
    throw new AppError(
      'Archivo demasiado grande',
      400,
      'FILE_TOO_LARGE',
      [`Tamaño máximo: ${Math.floor(maxSize / 1024 / 1024)}MB`]
    );
  }
  
  return true;
};

module.exports = {
  validateJoi,
  handleValidationErrors,
  commonSchemas,
  entityValidators,
  paramValidators,
  queryValidators,
  validateFile
};