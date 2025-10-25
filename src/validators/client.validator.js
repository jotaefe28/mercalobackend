const Joi = require('joi');
const { logger } = require('../middlewares/logger');

// Tipos de documentos válidos
const DOCUMENT_TYPES = [
  'cedula',
  'cedula_extranjeria',
  'nit',
  'pasaporte',
  'ruc',
  'otro'
];

/**
 * Esquema de validación para crear un cliente
 */
const createClientSchema = Joi.object({
  document_type: Joi.string()
    .valid(...DOCUMENT_TYPES)
    .required()
    .messages({
      'any.required': 'El tipo de documento es obligatorio',
      'any.only': `El tipo de documento debe ser uno de: ${DOCUMENT_TYPES.join(', ')}`
    }),
  
  document_number: Joi.string()
    .pattern(/^[0-9A-Za-z\-]+$/)
    .min(3)
    .max(20)
    .required()
    .messages({
      'string.pattern.base': 'El número de documento solo puede contener números, letras y guiones',
      'string.min': 'El número de documento debe tener al menos 3 caracteres',
      'string.max': 'El número de documento no puede exceder 20 caracteres',
      'any.required': 'El número de documento es obligatorio'
    }),
  
  name: Joi.string()
    .pattern(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/)
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.pattern.base': 'El nombre solo puede contener letras y espacios',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 50 caracteres',
      'any.required': 'El nombre es obligatorio'
    }),
  
  last_name: Joi.string()
    .pattern(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/)
    .min(2)
    .max(50)
    .allow('')
    .messages({
      'string.pattern.base': 'El apellido solo puede contener letras y espacios',
      'string.min': 'El apellido debe tener al menos 2 caracteres',
      'string.max': 'El apellido no puede exceder 50 caracteres'
    }),
  
  phone: Joi.string()
    .pattern(/^[\+]?[0-9\-\s\(\)]+$/)
    .min(7)
    .max(20)
    .allow('')
    .messages({
      'string.pattern.base': 'El teléfono solo puede contener números, espacios, guiones, paréntesis y el símbolo +',
      'string.min': 'El teléfono debe tener al menos 7 caracteres',
      'string.max': 'El teléfono no puede exceder 20 caracteres'
    }),
  
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(100)
    .allow('')
    .messages({
      'string.email': 'Debe proporcionar un email válido',
      'string.max': 'El email no puede exceder 100 caracteres'
    }),
  
  address: Joi.string()
    .max(255)
    .allow('')
    .messages({
      'string.max': 'La dirección no puede exceder 255 caracteres'
    }),
  
  city: Joi.string()
    .pattern(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\-\.]+$/)
    .max(50)
    .allow('')
    .messages({
      'string.pattern.base': 'La ciudad solo puede contener letras, espacios, guiones y puntos',
      'string.max': 'La ciudad no puede exceder 50 caracteres'
    }),
  
  department: Joi.string()
    .pattern(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\-\.]+$/)
    .max(50)
    .allow('')
    .messages({
      'string.pattern.base': 'El departamento solo puede contener letras, espacios, guiones y puntos',
      'string.max': 'El departamento no puede exceder 50 caracteres'
    }),
  
  birth_date: Joi.date()
    .max('now')
    .min('1900-01-01')
    .allow(null)
    .messages({
      'date.max': 'La fecha de nacimiento no puede ser en el futuro',
      'date.min': 'La fecha de nacimiento debe ser posterior a 1900'
    })
});

/**
 * Esquema de validación para actualizar un cliente
 */
const updateClientSchema = Joi.object({
  document_type: Joi.string()
    .valid(...DOCUMENT_TYPES)
    .messages({
      'any.only': `El tipo de documento debe ser uno de: ${DOCUMENT_TYPES.join(', ')}`
    }),
  
  document_number: Joi.string()
    .pattern(/^[0-9A-Za-z\-]+$/)
    .min(3)
    .max(20)
    .messages({
      'string.pattern.base': 'El número de documento solo puede contener números, letras y guiones',
      'string.min': 'El número de documento debe tener al menos 3 caracteres',
      'string.max': 'El número de documento no puede exceder 20 caracteres'
    }),
  
  name: Joi.string()
    .pattern(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/)
    .min(2)
    .max(50)
    .messages({
      'string.pattern.base': 'El nombre solo puede contener letras y espacios',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 50 caracteres'
    }),
  
  last_name: Joi.string()
    .pattern(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/)
    .min(2)
    .max(50)
    .allow('')
    .messages({
      'string.pattern.base': 'El apellido solo puede contener letras y espacios',
      'string.min': 'El apellido debe tener al menos 2 caracteres',
      'string.max': 'El apellido no puede exceder 50 caracteres'
    }),
  
  phone: Joi.string()
    .pattern(/^[\+]?[0-9\-\s\(\)]+$/)
    .min(7)
    .max(20)
    .allow('')
    .messages({
      'string.pattern.base': 'El teléfono solo puede contener números, espacios, guiones, paréntesis y el símbolo +',
      'string.min': 'El teléfono debe tener al menos 7 caracteres',
      'string.max': 'El teléfono no puede exceder 20 caracteres'
    }),
  
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(100)
    .allow('')
    .messages({
      'string.email': 'Debe proporcionar un email válido',
      'string.max': 'El email no puede exceder 100 caracteres'
    }),
  
  address: Joi.string()
    .max(255)
    .allow('')
    .messages({
      'string.max': 'La dirección no puede exceder 255 caracteres'
    }),
  
  city: Joi.string()
    .pattern(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\-\.]+$/)
    .max(50)
    .allow('')
    .messages({
      'string.pattern.base': 'La ciudad solo puede contener letras, espacios, guiones y puntos',
      'string.max': 'La ciudad no puede exceder 50 caracteres'
    }),
  
  department: Joi.string()
    .pattern(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\-\.]+$/)
    .max(50)
    .allow('')
    .messages({
      'string.pattern.base': 'El departamento solo puede contener letras, espacios, guiones y puntos',
      'string.max': 'El departamento no puede exceder 50 caracteres'
    }),
  
  birth_date: Joi.date()
    .max('now')
    .min('1900-01-01')
    .allow(null)
    .messages({
      'date.max': 'La fecha de nacimiento no puede ser en el futuro',
      'date.min': 'La fecha de nacimiento debe ser posterior a 1900'
    }),
  
  is_active: Joi.boolean()
    .messages({
      'boolean.base': 'is_active debe ser verdadero o falso'
    })
}).min(1);

/**
 * Esquema de validación para búsqueda de clientes
 */
const searchClientSchema = Joi.object({
  search: Joi.string()
    .min(1)
    .max(100)
    .messages({
      'string.min': 'El término de búsqueda debe tener al menos 1 caracter',
      'string.max': 'El término de búsqueda no puede exceder 100 caracteres'
    }),
  
  document_type: Joi.string()
    .valid(...DOCUMENT_TYPES)
    .messages({
      'any.only': `El tipo de documento debe ser uno de: ${DOCUMENT_TYPES.join(', ')}`
    }),
  
  city: Joi.string()
    .max(50)
    .messages({
      'string.max': 'La ciudad no puede exceder 50 caracteres'
    }),
  
  department: Joi.string()
    .max(50)
    .messages({
      'string.max': 'El departamento no puede exceder 50 caracteres'
    }),
  
  is_active: Joi.boolean()
    .messages({
      'boolean.base': 'is_active debe ser verdadero o falso'
    }),
  
  has_points: Joi.boolean()
    .messages({
      'boolean.base': 'has_points debe ser verdadero o falso'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'La página debe ser un número',
      'number.integer': 'La página debe ser un número entero',
      'number.min': 'La página debe ser mayor a 0'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'El límite debe ser un número',
      'number.integer': 'El límite debe ser un número entero',
      'number.min': 'El límite debe ser mayor a 0',
      'number.max': 'El límite no puede exceder 100'
    }),
  
  sort_by: Joi.string()
    .valid('name', 'created_at', 'total_purchases', 'current_points', 'last_name')
    .default('created_at')
    .messages({
      'any.only': 'sort_by debe ser uno de: name, created_at, total_purchases, current_points, last_name'
    }),
  
  sort_order: Joi.string()
    .valid('ASC', 'DESC')
    .default('DESC')
    .messages({
      'any.only': 'sort_order debe ser ASC o DESC'
    })
});

/**
 * Middleware de validación para crear cliente
 */
const validateCreateClient = (req, res, next) => {
  try {
    const { error, value } = createClientSchema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      logger.warn('Validación fallida para crear cliente:', {
        errors: errorMessages,
        body: req.body
      });
      
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errorMessages
      });
    }
    
    req.body = value;
    next();
  } catch (error) {
    logger.error('Error en middleware de validación de crear cliente:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware de validación para actualizar cliente
 */
const validateUpdateClient = (req, res, next) => {
  try {
    const { error, value } = updateClientSchema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      logger.warn('Validación fallida para actualizar cliente:', {
        errors: errorMessages,
        body: req.body,
        clientId: req.params.id
      });
      
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errorMessages
      });
    }
    
    req.body = value;
    next();
  } catch (error) {
    logger.error('Error en middleware de validación de actualizar cliente:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware de validación para búsqueda de clientes
 */
const validateSearchClients = (req, res, next) => {
  try {
    const { error, value } = searchClientSchema.validate(req.query, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      logger.warn('Validación fallida para búsqueda de clientes:', {
        errors: errorMessages,
        query: req.query
      });
      
      return res.status(400).json({
        success: false,
        message: 'Errores de validación en parámetros de búsqueda',
        errors: errorMessages
      });
    }
    
    req.query = value;
    next();
  } catch (error) {
    logger.error('Error en middleware de validación de búsqueda de clientes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Validar ID de cliente
 */
const validateClientId = (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cliente inválido'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Error validando ID de cliente:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  validateCreateClient,
  validateUpdateClient,
  validateSearchClients,
  validateClientId,
  DOCUMENT_TYPES
};