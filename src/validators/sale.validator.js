/**
 * Validador de Sale (Venta)
 * Sistema POS Multitenant
 * 
 * Validaciones para todas las operaciones relacionadas con ventas,
 * integrado con validaciones de productos, clientes y métodos de pago
 */

const Joi = require('joi');
const { logger } = require('../middlewares/logger');

// Estados válidos para ventas
const SALE_STATUSES = [
  'pending',
  'completed', 
  'cancelled',
  'refunded'
];

// Tipos de entrega válidos
const DELIVERY_TYPES = [
  'store',      // Recogida en tienda
  'delivery',   // Entrega a domicilio
  'pickup'      // Punto de recogida
];

// Esquema para validar un item de venta
const saleItemSchema = Joi.object({
  product_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID del producto debe ser un UUID válido',
      'any.required': 'El ID del producto es obligatorio'
    }),
    
  quantity: Joi.number()
    .positive()
    .max(10000)
    .required()
    .messages({
      'number.positive': 'La cantidad debe ser un número positivo',
      'number.max': 'La cantidad no puede exceder 10,000 unidades',
      'any.required': 'La cantidad es obligatoria'
    }),
    
  unit_price: Joi.number()
    .positive()
    .precision(2)
    .max(999999.99)
    .required()
    .messages({
      'number.positive': 'El precio unitario debe ser positivo',
      'number.precision': 'El precio puede tener máximo 2 decimales',
      'number.max': 'El precio unitario no puede exceder $999,999.99',
      'any.required': 'El precio unitario es obligatorio'
    }),
    
  discount_amount: Joi.number()
    .min(0)
    .precision(2)
    .max(999999.99)
    .default(0)
    .messages({
      'number.min': 'El descuento no puede ser negativo',
      'number.precision': 'El descuento puede tener máximo 2 decimales',
      'number.max': 'El descuento no puede exceder $999,999.99'
    }),
    
  subtotal: Joi.number()
    .positive()
    .precision(2)
    .max(9999999.99)
    .required()
    .messages({
      'number.positive': 'El subtotal debe ser positivo',
      'number.precision': 'El subtotal puede tener máximo 2 decimales',
      'number.max': 'El subtotal no puede exceder $9,999,999.99',
      'any.required': 'El subtotal es obligatorio'
    })
});

// Esquema para validar un método de pago
const paymentMethodSchema = Joi.object({
  method_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID del método de pago debe ser un UUID válido',
      'any.required': 'El ID del método de pago es obligatorio'
    }),
    
  amount: Joi.number()
    .positive()
    .precision(2)
    .max(9999999.99)
    .required()
    .messages({
      'number.positive': 'El monto del pago debe ser positivo',
      'number.precision': 'El monto puede tener máximo 2 decimales',
      'number.max': 'El monto no puede exceder $9,999,999.99',
      'any.required': 'El monto del pago es obligatorio'
    }),
    
  reference: Joi.string()
    .max(100)
    .allow('')
    .messages({
      'string.max': 'La referencia no puede exceder 100 caracteres'
    })
});

// Esquema principal para crear una venta
const createSaleSchema = Joi.object({
  client_id: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.guid': 'El ID del cliente debe ser un UUID válido'
    }),
    
  user_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID del usuario debe ser un UUID válido',
      'any.required': 'El ID del usuario es obligatorio'
    }),
    
  invoice_number: Joi.string()
    .max(50)
    .required()
    .messages({
      'string.max': 'El número de factura no puede exceder 50 caracteres',
      'any.required': 'El número de factura es obligatorio'
    }),
    
  items: Joi.array()
    .items(saleItemSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'Debe incluir al menos un item en la venta',
      'array.max': 'No se pueden incluir más de 100 items por venta',
      'any.required': 'Los items de la venta son obligatorios'
    }),
    
  payment_methods: Joi.array()
    .items(paymentMethodSchema)
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'Debe incluir al menos un método de pago',
      'array.max': 'No se pueden incluir más de 10 métodos de pago',
      'any.required': 'Los métodos de pago son obligatorios'
    }),
    
  subtotal: Joi.number()
    .positive()
    .precision(2)
    .max(9999999.99)
    .required()
    .messages({
      'number.positive': 'El subtotal debe ser positivo',
      'number.precision': 'El subtotal puede tener máximo 2 decimales',
      'number.max': 'El subtotal no puede exceder $9,999,999.99',
      'any.required': 'El subtotal es obligatorio'
    }),
    
  tax_amount: Joi.number()
    .min(0)
    .precision(2)
    .max(999999.99)
    .default(0)
    .messages({
      'number.min': 'El impuesto no puede ser negativo',
      'number.precision': 'El impuesto puede tener máximo 2 decimales',
      'number.max': 'El impuesto no puede exceder $999,999.99'
    }),
    
  discount_amount: Joi.number()
    .min(0)
    .precision(2)
    .max(999999.99)
    .default(0)
    .messages({
      'number.min': 'El descuento no puede ser negativo',
      'number.precision': 'El descuento puede tener máximo 2 decimales',
      'number.max': 'El descuento no puede exceder $999,999.99'
    }),
    
  points_redeemed: Joi.number()
    .integer()
    .min(0)
    .max(1000000)
    .default(0)
    .messages({
      'number.integer': 'Los puntos redimidos deben ser un número entero',
      'number.min': 'Los puntos redimidos no pueden ser negativos',
      'number.max': 'No se pueden redimir más de 1,000,000 puntos'
    }),
    
  total: Joi.number()
    .positive()
    .precision(2)
    .max(9999999.99)
    .required()
    .messages({
      'number.positive': 'El total debe ser positivo',
      'number.precision': 'El total puede tener máximo 2 decimales',
      'number.max': 'El total no puede exceder $9,999,999.99',
      'any.required': 'El total es obligatorio'
    }),
    
  status: Joi.string()
    .valid(...SALE_STATUSES)
    .default('completed')
    .messages({
      'any.only': `El estado debe ser uno de: ${SALE_STATUSES.join(', ')}`
    }),
    
  delivery_type: Joi.string()
    .valid(...DELIVERY_TYPES)
    .default('store')
    .messages({
      'any.only': `El tipo de entrega debe ser uno de: ${DELIVERY_TYPES.join(', ')}`
    }),
    
  delivery_address: Joi.string()
    .max(500)
    .allow('')
    .when('delivery_type', {
      is: 'delivery',
      then: Joi.string().required(),
      otherwise: Joi.string().allow('', null)
    })
    .messages({
      'string.max': 'La dirección de entrega no puede exceder 500 caracteres',
      'any.required': 'La dirección de entrega es obligatoria para entregas a domicilio'
    }),
    
  delivery_fee: Joi.number()
    .min(0)
    .precision(2)
    .max(99999.99)
    .default(0)
    .messages({
      'number.min': 'La tarifa de entrega no puede ser negativa',
      'number.precision': 'La tarifa de entrega puede tener máximo 2 decimales',
      'number.max': 'La tarifa de entrega no puede exceder $99,999.99'
    }),
    
  notes: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Las notas no pueden exceder 1000 caracteres'
    })
});

// Esquema para actualizar una venta
const updateSaleSchema = Joi.object({
  delivery_address: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'La dirección de entrega no puede exceder 500 caracteres'
    }),
    
  delivery_fee: Joi.number()
    .min(0)
    .precision(2)
    .max(99999.99)
    .messages({
      'number.min': 'La tarifa de entrega no puede ser negativa',
      'number.precision': 'La tarifa de entrega puede tener máximo 2 decimales',
      'number.max': 'La tarifa de entrega no puede exceder $99,999.99'
    }),
    
  notes: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Las notas no pueden exceder 1000 caracteres'
    }),
    
  status: Joi.string()
    .valid(...SALE_STATUSES)
    .messages({
      'any.only': `El estado debe ser uno de: ${SALE_STATUSES.join(', ')}`
    })
}).min(1);

// Esquema para filtros de búsqueda
const saleFiltersSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'La página debe ser un número entero',
      'number.min': 'La página debe ser mayor a 0'
    }),
    
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .messages({
      'number.integer': 'El límite debe ser un número entero',
      'number.min': 'El límite debe ser mayor a 0',
      'number.max': 'El límite no puede exceder 100'
    }),
    
  client_id: Joi.string()
    .uuid()
    .messages({
      'string.guid': 'El ID del cliente debe ser un UUID válido'
    }),
    
  user_id: Joi.string()
    .uuid()
    .messages({
      'string.guid': 'El ID del usuario debe ser un UUID válido'
    }),
    
  status: Joi.string()
    .valid(...SALE_STATUSES)
    .messages({
      'any.only': `El estado debe ser uno de: ${SALE_STATUSES.join(', ')}`
    }),
    
  date_from: Joi.date()
    .iso()
    .messages({
      'date.format': 'La fecha desde debe estar en formato ISO (YYYY-MM-DD)'
    }),
    
  date_to: Joi.date()
    .iso()
    .min(Joi.ref('date_from'))
    .messages({
      'date.format': 'La fecha hasta debe estar en formato ISO (YYYY-MM-DD)',
      'date.min': 'La fecha hasta debe ser posterior a la fecha desde'
    }),
    
  delivery_type: Joi.string()
    .valid(...DELIVERY_TYPES)
    .messages({
      'any.only': `El tipo de entrega debe ser uno de: ${DELIVERY_TYPES.join(', ')}`
    }),
    
  min_total: Joi.number()
    .min(0)
    .precision(2)
    .messages({
      'number.min': 'El total mínimo no puede ser negativo',
      'number.precision': 'El total mínimo puede tener máximo 2 decimales'
    }),
    
  max_total: Joi.number()
    .min(Joi.ref('min_total'))
    .precision(2)
    .messages({
      'number.min': 'El total máximo debe ser mayor al total mínimo',
      'number.precision': 'El total máximo puede tener máximo 2 decimales'
    }),
    
  invoice_number: Joi.string()
    .max(50)
    .messages({
      'string.max': 'El número de factura no puede exceder 50 caracteres'
    }),
    
  search: Joi.string()
    .max(100)
    .messages({
      'string.max': 'El término de búsqueda no puede exceder 100 caracteres'
    })
});

// Esquema para cancelar una venta
const cancelSaleSchema = Joi.object({
  reason: Joi.string()
    .max(500)
    .required()
    .messages({
      'string.max': 'La razón de cancelación no puede exceder 500 caracteres',
      'any.required': 'La razón de cancelación es obligatoria'
    })
});

// Esquema para parámetros de reporte
const salesReportSchema = Joi.object({
  date_from: Joi.date()
    .iso()
    .required()
    .messages({
      'date.format': 'La fecha desde debe estar en formato ISO (YYYY-MM-DD)',
      'any.required': 'La fecha desde es obligatoria'
    }),
    
  date_to: Joi.date()
    .iso()
    .min(Joi.ref('date_from'))
    .required()
    .messages({
      'date.format': 'La fecha hasta debe estar en formato ISO (YYYY-MM-DD)',
      'date.min': 'La fecha hasta debe ser posterior a la fecha desde',
      'any.required': 'La fecha hasta es obligatoria'
    }),
    
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.integer': 'El límite debe ser un número entero',
      'number.min': 'El límite debe ser mayor a 0',
      'number.max': 'El límite no puede exceder 100'
    })
});

/**
 * Middleware para validar creación de venta
 */
const validateCreateSale = (req, res, next) => {
  try {
    const { error, value } = createSaleSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.warn('Error de validación en creación de venta:', {
        errors: error.details.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
        body: req.body
      });

      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: error.details.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    req.body = value;
    next();
  } catch (err) {
    logger.error('Error en validación de creación de venta:', err);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware para validar actualización de venta
 */
const validateUpdateSale = (req, res, next) => {
  try {
    const { error, value } = updateSaleSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.warn('Error de validación en actualización de venta:', {
        errors: error.details.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
        body: req.body
      });

      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: error.details.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    req.body = value;
    next();
  } catch (err) {
    logger.error('Error en validación de actualización de venta:', err);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware para validar filtros de búsqueda
 */
const validateSaleFilters = (req, res, next) => {
  try {
    const { error, value } = saleFiltersSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.warn('Error de validación en filtros de venta:', {
        errors: error.details.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
        query: req.query
      });

      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: error.details.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    req.query = value;
    next();
  } catch (err) {
    logger.error('Error en validación de filtros de venta:', err);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware para validar cancelación de venta
 */
const validateCancelSale = (req, res, next) => {
  try {
    const { error, value } = cancelSaleSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.warn('Error de validación en cancelación de venta:', {
        errors: error.details.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
        body: req.body
      });

      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: error.details.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    req.body = value;
    next();
  } catch (err) {
    logger.error('Error en validación de cancelación de venta:', err);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware para validar parámetros de reporte
 */
const validateSalesReport = (req, res, next) => {
  try {
    const { error, value } = salesReportSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.warn('Error de validación en reporte de ventas:', {
        errors: error.details.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
        query: req.query
      });

      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: error.details.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    req.query = value;
    next();
  } catch (err) {
    logger.error('Error en validación de reporte de ventas:', err);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Validar UUID de venta
 */
const validateSaleId = (req, res, next) => {
  try {
    const { id } = req.params;
    
    const schema = Joi.string().uuid().required();
    const { error } = schema.validate(id);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'ID de venta inválido',
        error: 'El ID debe ser un UUID válido'
      });
    }
    
    next();
  } catch (err) {
    logger.error('Error en validación de ID de venta:', err);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  // Esquemas exportados para reutilización
  createSaleSchema,
  updateSaleSchema,
  saleFiltersSchema,
  cancelSaleSchema,
  salesReportSchema,
  
  // Constantes
  SALE_STATUSES,
  DELIVERY_TYPES,
  
  // Middlewares de validación
  validateCreateSale,
  validateUpdateSale,
  validateSaleFilters,
  validateCancelSale,
  validateSalesReport,
  validateSaleId
};