/**
 * Middleware de Validación Estricta
 * Sistema POS Multitenant
 * 
 * Implementa validaciones robustas para todos los endpoints
 * con sanitización automática y reglas de negocio específicas
 */

const { body, param, query, validationResult } = require('express-validator');
const validator = require('validator');
const { logger } = require('../config/database');

/**
 * Middleware para manejar errores de validación
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path,
      value: error.value,
      message: error.msg,
      location: error.location
    }));
    
    logger.warn('Errores de validación detectados', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      errors: errorDetails,
      userId: req.user?.id,
      companyId: req.tenant?.companyId
    });
    
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errorDetails
    });
  }
  
  next();
};

/**
 * Validadores comunes reutilizables
 */
const commonValidators = {
  // Email con normalización y verificación estricta
  email: () => 
    body('email')
      .trim()
      .toLowerCase()
      .isEmail()
      .normalizeEmail({
        gmail_remove_dots: false,
        gmail_remove_subaddress: false,
        outlookdotcom_remove_subaddress: false
      })
      .isLength({ max: 255 })
      .withMessage('Email debe ser válido y no exceder 255 caracteres')
      .custom(async (value) => {
        // Verificar dominio no está en lista negra
        const blockedDomains = [
          'tempmail.org', '10minutemail.com', 'guerrillamail.com',
          'mailinator.com', 'yopmail.com', 'temp-mail.org'
        ];
        
        const domain = value.split('@')[1];
        if (blockedDomains.includes(domain)) {
          throw new Error('Dominio de email no permitido');
        }
        
        return true;
      }),

  // Contraseña con validación robusta
  password: (fieldName = 'password') =>
    body(fieldName)
      .isLength({ min: 8, max: 128 })
      .withMessage('La contraseña debe tener entre 8 y 128 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('La contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 símbolo (@$!%*?&)')
      .custom((value, { req }) => {
        // Verificar que no contenga información personal
        const email = req.body.email?.toLowerCase();
        const name = req.body.name?.toLowerCase();
        
        if (email && value.toLowerCase().includes(email.split('@')[0])) {
          throw new Error('La contraseña no puede contener parte del email');
        }
        
        if (name && value.toLowerCase().includes(name)) {
          throw new Error('La contraseña no puede contener el nombre');
        }
        
        // Verificar contraseñas comunes
        const commonPasswords = [
          'password', '123456', 'qwerty', 'abc123', 'password123',
          '12345678', 'admin', 'letmein', 'welcome', 'monkey'
        ];
        
        if (commonPasswords.includes(value.toLowerCase())) {
          throw new Error('Contraseña muy común, elija una más segura');
        }
        
        return true;
      }),

  // Nombre con sanitización
  name: (fieldName = 'name') =>
    body(fieldName)
      .trim()
      .escape()
      .isLength({ min: 2, max: 255 })
      .withMessage(`${fieldName} debe tener entre 2 y 255 caracteres`)
      .matches(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/)
      .withMessage(`${fieldName} solo puede contener letras y espacios`),

  // Teléfono con validación internacional
  phone: (fieldName = 'phone') =>
    body(fieldName)
      .optional()
      .trim()
      .isMobilePhone('any', { strictMode: false })
      .withMessage('Número de teléfono inválido')
      .isLength({ max: 20 })
      .withMessage('Número de teléfono muy largo'),

  // Precio/monto monetario
  price: (fieldName = 'price') =>
    body(fieldName)
      .isFloat({ min: 0, max: 999999999.99 })
      .withMessage(`${fieldName} debe ser un número positivo válido`)
      .toFloat(),

  // Cantidad/stock
  quantity: (fieldName = 'quantity') =>
    body(fieldName)
      .isInt({ min: 0, max: 999999 })
      .withMessage(`${fieldName} debe ser un número entero positivo`)
      .toInt(),

  // UUID para IDs
  uuid: (fieldName = 'id') =>
    param(fieldName)
      .isUUID(4)
      .withMessage(`${fieldName} debe ser un UUID válido`),

  // Paginación
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Página debe ser un número entre 1 y 1000')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Límite debe ser un número entre 1 y 100')
      .toInt()
  ],

  // Código de barras
  barcode: () =>
    body('barcode')
      .optional()
      .trim()
      .isLength({ min: 8, max: 20 })
      .withMessage('Código de barras debe tener entre 8 y 20 caracteres')
      .isAlphanumeric()
      .withMessage('Código de barras solo puede contener letras y números'),

  // Tax ID / RFC
  taxId: () =>
    body('tax_id')
      .trim()
      .isLength({ min: 10, max: 20 })
      .withMessage('Tax ID debe tener entre 10 y 20 caracteres')
      .isAlphanumeric()
      .withMessage('Tax ID solo puede contener letras y números'),

  // Dirección
  address: () =>
    body('address')
      .optional()
      .trim()
      .escape()
      .isLength({ max: 500 })
      .withMessage('Dirección no puede exceder 500 caracteres')
};

/**
 * Validaciones específicas para autenticación
 */
const authValidations = {
  register: [
    // Validaciones de empresa
    body('company.name')
      .trim()
      .escape()
      .isLength({ min: 2, max: 255 })
      .withMessage('Nombre de empresa debe tener entre 2 y 255 caracteres'),
    
    commonValidators.taxId(),
    
    body('company.email')
      .trim()
      .toLowerCase()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email de empresa inválido'),
    
    body('company.phone')
      .optional()
      .trim()
      .isMobilePhone('any')
      .withMessage('Teléfono de empresa inválido'),
    
    body('company.address')
      .optional()
      .trim()
      .escape()
      .isLength({ max: 500 })
      .withMessage('Dirección no puede exceder 500 caracteres'),

    // Validaciones de usuario administrador
    commonValidators.name('user.name'),
    commonValidators.email(),
    commonValidators.password(),
    
    body('user.confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.user.password) {
          throw new Error('Las contraseñas no coinciden');
        }
        return true;
      }),

    handleValidationErrors
  ],

  login: [
    commonValidators.email(),
    body('password')
      .notEmpty()
      .withMessage('Contraseña es requerida')
      .isLength({ max: 128 })
      .withMessage('Contraseña demasiado larga'),

    handleValidationErrors
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Contraseña actual requerida'),
    
    commonValidators.password('newPassword'),
    
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
        return true;
      }),

    handleValidationErrors
  ]
};

/**
 * Validaciones para productos
 */
const productValidations = {
  create: [
    body('name')
      .trim()
      .escape()
      .isLength({ min: 2, max: 255 })
      .withMessage('Nombre de producto debe tener entre 2 y 255 caracteres'),
    
    body('description')
      .optional()
      .trim()
      .escape()
      .isLength({ max: 1000 })
      .withMessage('Descripción no puede exceder 1000 caracteres'),
    
    body('sku')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('SKU debe tener entre 1 y 50 caracteres')
      .isAlphanumeric('en-US', { ignore: '-_' })
      .withMessage('SKU solo puede contener letras, números, guiones y guiones bajos'),
    
    commonValidators.barcode(),
    commonValidators.price(),
    commonValidators.price('cost'),
    commonValidators.quantity('stock'),
    commonValidators.quantity('min_stock'),
    
    body('category')
      .optional()
      .trim()
      .escape()
      .isLength({ max: 100 })
      .withMessage('Categoría no puede exceder 100 caracteres'),
    
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active debe ser verdadero o falso'),

    handleValidationErrors
  ],

  update: [
    commonValidators.uuid(),
    
    body('name')
      .optional()
      .trim()
      .escape()
      .isLength({ min: 2, max: 255 })
      .withMessage('Nombre de producto debe tener entre 2 y 255 caracteres'),
    
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Precio debe ser un número positivo')
      .toFloat(),
    
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock debe ser un número entero positivo')
      .toInt(),

    handleValidationErrors
  ]
};

/**
 * Validaciones para ventas
 */
const salesValidations = {
  create: [
    body('items')
      .isArray({ min: 1 })
      .withMessage('Debe incluir al menos un item'),
    
    body('items.*.product_id')
      .isUUID(4)
      .withMessage('ID de producto debe ser un UUID válido'),
    
    body('items.*.quantity')
      .isInt({ min: 1, max: 1000 })
      .withMessage('Cantidad debe ser entre 1 y 1000')
      .toInt(),
    
    body('items.*.unit_price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Precio unitario debe ser positivo')
      .toFloat(),
    
    body('client_id')
      .optional()
      .isUUID(4)
      .withMessage('ID de cliente debe ser un UUID válido'),
    
    body('total')
      .isFloat({ min: 0, max: 999999999.99 })
      .withMessage('Total debe ser un monto válido')
      .toFloat(),
    
    body('discount_amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Descuento debe ser positivo')
      .toFloat(),
    
    body('points_to_redeem')
      .optional()
      .isInt({ min: 0, max: 999999 })
      .withMessage('Puntos a redimir debe ser un número positivo')
      .toInt(),

    handleValidationErrors
  ]
};

/**
 * Validaciones para clientes
 */
const clientValidations = {
  create: [
    commonValidators.name(),
    commonValidators.phone(),
    commonValidators.email(),
    commonValidators.address(),
    
    body('rfc')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('RFC no puede exceder 20 caracteres'),
    
    body('birth_date')
      .optional()
      .isISO8601()
      .withMessage('Fecha de nacimiento debe ser una fecha válida')
      .toDate(),

    handleValidationErrors
  ]
};

/**
 * Middleware de sanitización adicional
 */
const sanitizeInput = (req, res, next) => {
  // Limpiar strings de caracteres peligrosos
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover scripts
      .replace(/javascript:/gi, '') // Remover javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remover event handlers
      .trim();
  };

  // Aplicar sanitización recursiva
  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') {
      return typeof obj === 'string' ? sanitizeString(obj) : obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  
  next();
};

module.exports = {
  handleValidationErrors,
  commonValidators,
  authValidations,
  productValidations,
  salesValidations,
  clientValidations,
  sanitizeInput
};