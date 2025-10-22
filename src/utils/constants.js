/**
 * Constantes del Sistema
 * Sistema POS Multitenant
 */

// Roles de usuario
const USER_ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER'
};

// Planes de empresa
const COMPANY_PLANS = {
  BASIC: 'BASIC',
  PREMIUM: 'PREMIUM',
  ENTERPRISE: 'ENTERPRISE'
};

// Estados de venta
const SALE_STATUS = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  VOID: 'void'
};

// Tipos de entrega
const DELIVERY_TYPES = {
  STORE: 'store',
  DELIVERY: 'delivery'
};

// Estados de pedido
const ORDER_STATUS = {
  PENDING: 'PENDING',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

// Canales de pago
const PAYMENT_CHANNELS = {
  CASH: 'cash',
  CARD: 'card',
  QR: 'qr',
  TRANSFER: 'transfer',
  LATER: 'later'
};

// Estados de stock
const STOCK_STATUS = {
  IN_STOCK: 'IN_STOCK',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK'
};

// Tipos de movimiento de inventario
const INVENTORY_MOVEMENT_TYPES = {
  IN: 'IN',
  OUT: 'OUT',
  ADJUSTMENT: 'ADJUSTMENT'
};

// Razones de movimiento de puntos
const POINTS_REASONS = {
  PURCHASE: 'Compra',
  REDEMPTION: 'Redención',
  ADJUSTMENT: 'Ajuste manual',
  BONUS: 'Bonificación',
  EXPIRATION: 'Expiración'
};

// Códigos de error comunes
const ERROR_CODES = {
  // Autenticación
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Validación
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Recursos
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_IN_USE: 'RESOURCE_IN_USE',
  
  // Negocio
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INSUFFICIENT_POINTS: 'INSUFFICIENT_POINTS',
  INVALID_OPERATION: 'INVALID_OPERATION',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  
  // Sistema
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

// Configuraciones por defecto
const DEFAULT_CONFIG = {
  // Paginación
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Puntos
  POINTS_PER_DOLLAR: 1,
  POINTS_TO_DOLLAR_RATIO: 1,
  
  // Archivos
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  
  // Búsqueda
  MIN_SEARCH_LENGTH: 2,
  MAX_SEARCH_RESULTS: 50,
  
  // Rate limiting
  DEFAULT_RATE_LIMIT: 100, // requests per minute
  AUTH_RATE_LIMIT: 5, // auth attempts per 15 minutes
  
  // Cookies
  COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 horas
  REFRESH_COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 días
  
  // Impuestos
  DEFAULT_TAX_RATE: 0.19, // 19% IVA Colombia
  
  // Inventario
  DEFAULT_MIN_STOCK: 0,
  STOCK_ALERT_THRESHOLD: 10
};

// Límites por plan
const PLAN_LIMITS = {
  [COMPANY_PLANS.BASIC]: {
    max_users: 5,
    max_products: 100,
    max_sales_per_day: 50,
    features: ['basic_reports', 'basic_inventory']
  },
  [COMPANY_PLANS.PREMIUM]: {
    max_users: 20,
    max_products: 1000,
    max_sales_per_day: 200,
    features: ['advanced_reports', 'inventory_alerts', 'customer_management']
  },
  [COMPANY_PLANS.ENTERPRISE]: {
    max_users: -1, // Ilimitado
    max_products: -1,
    max_sales_per_day: -1,
    features: ['all_features', 'api_access', 'custom_integrations']
  }
};

// Mensajes de respuesta estándar
const RESPONSE_MESSAGES = {
  // Éxito
  SUCCESS: 'Operación realizada exitosamente',
  CREATED: 'Recurso creado exitosamente',
  UPDATED: 'Recurso actualizado exitosamente',
  DELETED: 'Recurso eliminado exitosamente',
  
  // Autenticación
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGOUT_SUCCESS: 'Sesión cerrada exitosamente',
  TOKEN_REFRESHED: 'Token renovado exitosamente',
  
  // Errores comunes
  NOT_FOUND: 'Recurso no encontrado',
  ALREADY_EXISTS: 'El recurso ya existe',
  INVALID_INPUT: 'Datos de entrada inválidos',
  ACCESS_DENIED: 'Acceso denegado',
  OPERATION_FAILED: 'La operación no pudo completarse'
};

// Patrones de validación
const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]{7,20}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  SKU: /^[A-Z0-9\-_]{1,50}$/i,
  DOCUMENT: /^[A-Za-z0-9]{5,20}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  TAX_ID: /^[0-9]{9,15}(-[0-9])?$/ // Para Colombia: NIT
};

// Headers HTTP personalizados
const CUSTOM_HEADERS = {
  TENANT_ID: 'X-Tenant-ID',
  API_VERSION: 'X-API-Version',
  REQUEST_ID: 'X-Request-ID',
  RATE_LIMIT_REMAINING: 'X-RateLimit-Remaining',
  RATE_LIMIT_RESET: 'X-RateLimit-Reset'
};

// Configuración de logging
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

module.exports = {
  USER_ROLES,
  COMPANY_PLANS,
  SALE_STATUS,
  DELIVERY_TYPES,
  ORDER_STATUS,
  PAYMENT_CHANNELS,
  STOCK_STATUS,
  INVENTORY_MOVEMENT_TYPES,
  POINTS_REASONS,
  ERROR_CODES,
  DEFAULT_CONFIG,
  PLAN_LIMITS,
  RESPONSE_MESSAGES,
  VALIDATION_PATTERNS,
  CUSTOM_HEADERS,
  LOG_LEVELS
};