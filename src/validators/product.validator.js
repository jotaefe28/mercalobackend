const Joi = require('joi');
const { logger } = require('../middlewares/logger');

// Categorías de productos válidas
const PRODUCT_CATEGORIES = [
  'alimentos',
  'bebidas',
  'snacks',
  'lacteos',
  'carnes',
  'frutas',
  'verduras',
  'panaderia',
  'limpieza',
  'cuidado_personal',
  'farmacia',
  'electrodomesticos',
  'tecnologia',
  'ropa',
  'calzado',
  'deportes',
  'juguetes',
  'libros',
  'musica',
  'hogar',
  'jardin',
  'automotriz',
  'mascotas',
  'oficina',
  'otros'
];

// Unidades de medida válidas
const UNITS_OF_MEASURE = [
  'unidad',
  'kilogramo',
  'gramo',
  'libra',
  'onza',
  'litro',
  'mililitro',
  'galon',
  'metro',
  'centimetro',
  'pulgada',
  'pie',
  'metro_cuadrado',
  'metro_cubico',
  'caja',
  'paquete',
  'docena',
  'par',
  'pieza',
  'rollo',
  'botella',
  'lata',
  'frasco',
  'bolsa',
  'saco'
];

/**
 * Esquema de validación para crear un producto
 */
const createProductSchema = Joi.object({
  sku: Joi.string()
    .pattern(/^[A-Za-z0-9\-_]+$/)
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.pattern.base': 'El SKU solo puede contener letras, números, guiones y guiones bajos',
      'string.min': 'El SKU debe tener al menos 3 caracteres',
      'string.max': 'El SKU no puede exceder 50 caracteres',
      'any.required': 'El SKU es obligatorio'
    }),
  
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'any.required': 'El nombre es obligatorio'
    }),
  
  description: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'La descripción no puede exceder 500 caracteres'
    }),
  
  category: Joi.string()
    .valid(...PRODUCT_CATEGORIES)
    .allow('')
    .messages({
      'any.only': `La categoría debe ser una de: ${PRODUCT_CATEGORIES.join(', ')}`
    }),
  
  brand: Joi.string()
    .max(50)
    .allow('')
    .messages({
      'string.max': 'La marca no puede exceder 50 caracteres'
    }),
  
  barcode: Joi.string()
    .pattern(/^[0-9]{8,13}$/)
    .allow('')
    .messages({
      'string.pattern.base': 'El código de barras debe contener entre 8 y 13 dígitos'
    }),
  
  price: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.positive': 'El precio debe ser un número positivo',
      'any.required': 'El precio es obligatorio'
    }),
  
  cost: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.positive': 'El costo debe ser un número positivo'
    }),
  
  stock: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.integer': 'El stock debe ser un número entero',
      'number.min': 'El stock no puede ser negativo',
      'any.required': 'El stock es obligatorio'
    }),
  
  min_stock: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.integer': 'El stock mínimo debe ser un número entero',
      'number.min': 'El stock mínimo no puede ser negativo'
    }),
  
  max_stock: Joi.number()
    .integer()
    .min(0)
    .messages({
      'number.integer': 'El stock máximo debe ser un número entero',
      'number.min': 'El stock máximo no puede ser negativo'
    }),
  
  unit_of_measure: Joi.string()
    .valid(...UNITS_OF_MEASURE)
    .default('unidad')
    .messages({
      'any.only': `La unidad de medida debe ser una de: ${UNITS_OF_MEASURE.join(', ')}`
    }),
  
  weight: Joi.number()
    .positive()
    .precision(3)
    .messages({
      'number.positive': 'El peso debe ser un número positivo'
    }),
  
  dimensions: Joi.object({
    length: Joi.number().positive().precision(2),
    width: Joi.number().positive().precision(2),
    height: Joi.number().positive().precision(2)
  }).messages({
    'object.base': 'Las dimensiones deben ser un objeto válido'
  }),
  
  tax_rate: Joi.number()
    .min(0)
    .max(100)
    .precision(2)
    .default(0)
    .messages({
      'number.min': 'La tasa de impuesto no puede ser negativa',
      'number.max': 'La tasa de impuesto no puede exceder 100%'
    }),
  
  discount_price: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.positive': 'El precio con descuento debe ser un número positivo'
    }),
  
  expiry_date: Joi.date()
    .min('now')
    .messages({
      'date.min': 'La fecha de vencimiento debe ser futura'
    }),
  
  supplier_id: Joi.string()
    .uuid()
    .messages({
      'string.uuid': 'El ID del proveedor debe ser un UUID válido'
    }),
  
  image_url: Joi.string()
    .uri()
    .max(255)
    .messages({
      'string.uri': 'La URL de la imagen debe ser válida',
      'string.max': 'La URL de la imagen no puede exceder 255 caracteres'
    }),
  
  tags: Joi.array()
    .items(Joi.string().max(30))
    .max(10)
    .messages({
      'array.max': 'No se pueden tener más de 10 etiquetas'
    }),
  
  is_service: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'is_service debe ser verdadero o falso'
    }),
  
  is_featured: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'is_featured debe ser verdadero o falso'
    }),
  
  is_digital: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'is_digital debe ser verdadero o falso'
    }),
  
  requires_prescription: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'requires_prescription debe ser verdadero o falso'
    }),
  
  age_restriction: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .messages({
      'number.integer': 'La restricción de edad debe ser un número entero',
      'number.min': 'La restricción de edad no puede ser negativa',
      'number.max': 'La restricción de edad no puede exceder 100 años'
    })
});

/**
 * Esquema de validación para actualizar un producto
 */
const updateProductSchema = Joi.object({
  sku: Joi.string()
    .pattern(/^[A-Za-z0-9\-_]+$/)
    .min(3)
    .max(50)
    .messages({
      'string.pattern.base': 'El SKU solo puede contener letras, números, guiones y guiones bajos',
      'string.min': 'El SKU debe tener al menos 3 caracteres',
      'string.max': 'El SKU no puede exceder 50 caracteres'
    }),
  
  name: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres'
    }),
  
  description: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'La descripción no puede exceder 500 caracteres'
    }),
  
  category: Joi.string()
    .valid(...PRODUCT_CATEGORIES)
    .allow('')
    .messages({
      'any.only': `La categoría debe ser una de: ${PRODUCT_CATEGORIES.join(', ')}`
    }),
  
  brand: Joi.string()
    .max(50)
    .allow('')
    .messages({
      'string.max': 'La marca no puede exceder 50 caracteres'
    }),
  
  barcode: Joi.string()
    .pattern(/^[0-9]{8,13}$/)
    .allow('')
    .messages({
      'string.pattern.base': 'El código de barras debe contener entre 8 y 13 dígitos'
    }),
  
  price: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.positive': 'El precio debe ser un número positivo'
    }),
  
  cost: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.positive': 'El costo debe ser un número positivo'
    }),
  
  stock: Joi.number()
    .integer()
    .min(0)
    .messages({
      'number.integer': 'El stock debe ser un número entero',
      'number.min': 'El stock no puede ser negativo'
    }),
  
  min_stock: Joi.number()
    .integer()
    .min(0)
    .messages({
      'number.integer': 'El stock mínimo debe ser un número entero',
      'number.min': 'El stock mínimo no puede ser negativo'
    }),
  
  max_stock: Joi.number()
    .integer()
    .min(0)
    .messages({
      'number.integer': 'El stock máximo debe ser un número entero',
      'number.min': 'El stock máximo no puede ser negativo'
    }),
  
  unit_of_measure: Joi.string()
    .valid(...UNITS_OF_MEASURE)
    .messages({
      'any.only': `La unidad de medida debe ser una de: ${UNITS_OF_MEASURE.join(', ')}`
    }),
  
  weight: Joi.number()
    .positive()
    .precision(3)
    .messages({
      'number.positive': 'El peso debe ser un número positivo'
    }),
  
  dimensions: Joi.object({
    length: Joi.number().positive().precision(2),
    width: Joi.number().positive().precision(2),
    height: Joi.number().positive().precision(2)
  }).messages({
    'object.base': 'Las dimensiones deben ser un objeto válido'
  }),
  
  tax_rate: Joi.number()
    .min(0)
    .max(100)
    .precision(2)
    .messages({
      'number.min': 'La tasa de impuesto no puede ser negativa',
      'number.max': 'La tasa de impuesto no puede exceder 100%'
    }),
  
  discount_price: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.positive': 'El precio con descuento debe ser un número positivo'
    }),
  
  expiry_date: Joi.date()
    .min('now')
    .messages({
      'date.min': 'La fecha de vencimiento debe ser futura'
    }),
  
  supplier_id: Joi.string()
    .uuid()
    .messages({
      'string.uuid': 'El ID del proveedor debe ser un UUID válido'
    }),
  
  image_url: Joi.string()
    .uri()
    .max(255)
    .messages({
      'string.uri': 'La URL de la imagen debe ser válida',
      'string.max': 'La URL de la imagen no puede exceder 255 caracteres'
    }),
  
  tags: Joi.array()
    .items(Joi.string().max(30))
    .max(10)
    .messages({
      'array.max': 'No se pueden tener más de 10 etiquetas'
    }),
  
  is_service: Joi.boolean()
    .messages({
      'boolean.base': 'is_service debe ser verdadero o falso'
    }),
  
  is_featured: Joi.boolean()
    .messages({
      'boolean.base': 'is_featured debe ser verdadero o falso'
    }),
  
  is_digital: Joi.boolean()
    .messages({
      'boolean.base': 'is_digital debe ser verdadero o falso'
    }),
  
  requires_prescription: Joi.boolean()
    .messages({
      'boolean.base': 'requires_prescription debe ser verdadero o falso'
    }),
  
  age_restriction: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .messages({
      'number.integer': 'La restricción de edad debe ser un número entero',
      'number.min': 'La restricción de edad no puede ser negativa',
      'number.max': 'La restricción de edad no puede exceder 100 años'
    }),
  
  is_active: Joi.boolean()
    .messages({
      'boolean.base': 'is_active debe ser verdadero o falso'
    })
}).min(1);

/**
 * Esquema de validación para búsqueda de productos
 */
const searchProductSchema = Joi.object({
  search: Joi.string()
    .min(1)
    .max(100)
    .messages({
      'string.min': 'El término de búsqueda debe tener al menos 1 caracter',
      'string.max': 'El término de búsqueda no puede exceder 100 caracteres'
    }),
  
  category: Joi.string()
    .valid(...PRODUCT_CATEGORIES)
    .messages({
      'any.only': `La categoría debe ser una de: ${PRODUCT_CATEGORIES.join(', ')}`
    }),
  
  brand: Joi.string()
    .max(50)
    .messages({
      'string.max': 'La marca no puede exceder 50 caracteres'
    }),
  
  min_price: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.positive': 'El precio mínimo debe ser un número positivo'
    }),
  
  max_price: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.positive': 'El precio máximo debe ser un número positivo'
    }),
  
  in_stock: Joi.boolean()
    .messages({
      'boolean.base': 'in_stock debe ser verdadero o falso'
    }),
  
  low_stock: Joi.boolean()
    .messages({
      'boolean.base': 'low_stock debe ser verdadero o falso'
    }),
  
  is_active: Joi.boolean()
    .messages({
      'boolean.base': 'is_active debe ser verdadero o falso'
    }),
  
  is_featured: Joi.boolean()
    .messages({
      'boolean.base': 'is_featured debe ser verdadero o falso'
    }),
  
  is_service: Joi.boolean()
    .messages({
      'boolean.base': 'is_service debe ser verdadero o falso'
    }),
  
  is_digital: Joi.boolean()
    .messages({
      'boolean.base': 'is_digital debe ser verdadero o falso'
    }),
  
  requires_prescription: Joi.boolean()
    .messages({
      'boolean.base': 'requires_prescription debe ser verdadero o falso'
    }),
  
  expiring_soon: Joi.boolean()
    .messages({
      'boolean.base': 'expiring_soon debe ser verdadero o falso'
    }),
  
  has_discount: Joi.boolean()
    .messages({
      'boolean.base': 'has_discount debe ser verdadero o falso'
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
    .valid('name', 'price', 'cost', 'stock', 'created_at', 'updated_at', 'category', 'brand', 'sku')
    .default('created_at')
    .messages({
      'any.only': 'sort_by debe ser uno de: name, price, cost, stock, created_at, updated_at, category, brand, sku'
    }),
  
  sort_order: Joi.string()
    .valid('ASC', 'DESC')
    .default('DESC')
    .messages({
      'any.only': 'sort_order debe ser ASC o DESC'
    })
});

/**
 * Esquema de validación para ajuste de stock
 */
const stockAdjustmentSchema = Joi.object({
  adjustment: Joi.number()
    .integer()
    .required()
    .messages({
      'number.integer': 'El ajuste debe ser un número entero',
      'any.required': 'El ajuste es obligatorio'
    }),
  
  reason: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.min': 'La razón debe tener al menos 3 caracteres',
      'string.max': 'La razón no puede exceder 200 caracteres',
      'any.required': 'La razón es obligatoria'
    })
});

/**
 * Esquema de validación para actualización de precios masiva
 */
const bulkPriceUpdateSchema = Joi.object({
  products: Joi.array()
    .items(
      Joi.object({
        id: Joi.string()
          .uuid()
          .required()
          .messages({
            'string.uuid': 'El ID debe ser un UUID válido',
            'any.required': 'El ID del producto es obligatorio'
          }),
        
        price: Joi.number()
          .positive()
          .precision(2)
          .required()
          .messages({
            'number.positive': 'El precio debe ser un número positivo',
            'any.required': 'El precio es obligatorio'
          }),
        
        cost: Joi.number()
          .min(0)
          .precision(2)
          .messages({
            'number.min': 'El costo no puede ser negativo'
          })
      })
    )
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'Debe incluir al menos un producto',
      'array.max': 'No se pueden actualizar más de 100 productos a la vez',
      'any.required': 'La lista de productos es obligatoria'
    })
});

/**
 * Middleware de validación para crear producto
 */
const validateCreateProduct = (req, res, next) => {
  try {
    const { error, value } = createProductSchema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      logger.warn('Validación fallida para crear producto:', {
        errors: errorMessages,
        body: req.body
      });
      
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errorMessages
      });
    }
    
    // Validación adicional: precio debe ser mayor que costo
    if (value.price <= value.cost) {
      return res.status(400).json({
        success: false,
        message: 'El precio debe ser mayor que el costo',
        errors: ['El precio debe ser mayor que el costo para tener margen de ganancia']
      });
    }
    
    req.body = value;
    next();
  } catch (error) {
    logger.error('Error en middleware de validación de crear producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware de validación para actualizar producto
 */
const validateUpdateProduct = (req, res, next) => {
  try {
    const { error, value } = updateProductSchema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      logger.warn('Validación fallida para actualizar producto:', {
        errors: errorMessages,
        body: req.body,
        productId: req.params.id
      });
      
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errorMessages
      });
    }
    
    // Validación adicional: si se proporcionan precio y costo, precio debe ser mayor
    if (value.price && value.cost && value.price <= value.cost) {
      return res.status(400).json({
        success: false,
        message: 'El precio debe ser mayor que el costo',
        errors: ['El precio debe ser mayor que el costo para tener margen de ganancia']
      });
    }
    
    req.body = value;
    next();
  } catch (error) {
    logger.error('Error en middleware de validación de actualizar producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware de validación para búsqueda de productos
 */
const validateSearchProducts = (req, res, next) => {
  try {
    const { error, value } = searchProductSchema.validate(req.query, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      logger.warn('Validación fallida para búsqueda de productos:', {
        errors: errorMessages,
        query: req.query
      });
      
      return res.status(400).json({
        success: false,
        message: 'Errores de validación en parámetros de búsqueda',
        errors: errorMessages
      });
    }
    
    // Validación adicional: max_price debe ser mayor que min_price
    if (value.min_price && value.max_price && value.max_price <= value.min_price) {
      return res.status(400).json({
        success: false,
        message: 'El precio máximo debe ser mayor que el precio mínimo',
        errors: ['El precio máximo debe ser mayor que el precio mínimo']
      });
    }
    
    req.query = value;
    next();
  } catch (error) {
    logger.error('Error en middleware de validación de búsqueda de productos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware de validación para ajuste de stock
 */
const validateStockAdjustment = (req, res, next) => {
  try {
    const { error, value } = stockAdjustmentSchema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      logger.warn('Validación fallida para ajuste de stock:', {
        errors: errorMessages,
        body: req.body,
        productId: req.params.id
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
    logger.error('Error en middleware de validación de ajuste de stock:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware de validación para actualización masiva de precios
 */
const validateBulkPriceUpdate = (req, res, next) => {
  try {
    const { error, value } = bulkPriceUpdateSchema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      logger.warn('Validación fallida para actualización masiva de precios:', {
        errors: errorMessages,
        body: req.body
      });
      
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errorMessages
      });
    }
    
    // Validación adicional: todos los precios deben ser mayores que sus costos
    const invalidProducts = value.products.filter(product => 
      product.cost && product.price <= product.cost
    );
    
    if (invalidProducts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Algunos productos tienen precio menor o igual al costo',
        errors: invalidProducts.map(p => `Producto ${p.id}: precio debe ser mayor que costo`)
      });
    }
    
    req.body = value;
    next();
  } catch (error) {
    logger.error('Error en middleware de validación de actualización masiva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Validar ID de producto
 */
const validateProductId = (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de producto inválido'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Error validando ID de producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Validar SKU
 */
const validateSKU = (req, res, next) => {
  try {
    const { sku } = req.params;
    
    // Validar formato SKU
    const skuRegex = /^[A-Z0-9\-_]{2,20}$/;
    
    if (!skuRegex.test(sku)) {
      return res.status(400).json({
        success: false,
        message: 'SKU inválido - debe contener solo letras mayúsculas, números, guiones y guiones bajos (2-20 caracteres)'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Error validando SKU:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  validateCreateProduct,
  validateUpdateProduct,
  validateSearchProducts,
  validateStockAdjustment,
  validateBulkPriceUpdate,
  validateProductId,
  validateSKU,
  PRODUCT_CATEGORIES,
  UNITS_OF_MEASURE
};