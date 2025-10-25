/**
 * Rutas de Sale (Venta)
 * Sistema POS Multitenant
 * 
 * Rutas mejoradas con validaciones completas, rate limiting y middlewares de seguridad
 */

const express = require('express');
const router = express.Router();
const SaleController = require('../controllers/saleController');
const authMiddleware = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter.middleware');
const {
  validateCreateSale,
  validateUpdateSale,
  validateSaleFilters,
  validateCancelSale,
  validateSalesReport,
  validateSaleId
} = require('../validators/sale.validator');

// Rate limiting específico para diferentes operaciones
const createSaleLimit = rateLimiter.salesRateLimit;
const reportLimit = rateLimiter.reportRateLimit;
const generalLimit = rateLimiter.apiRateLimit;

// Middleware de autenticación para todas las rutas
router.use(authMiddleware.authenticateToken);

// ==================== RUTAS DE VENTAS ====================

/**
 * @route POST /api/sales
 * @desc Crear una nueva venta
 * @access Private
 * @rateLimit 10 requests/min
 */
router.post(
  '/',
  createSaleLimit,
  validateCreateSale,
  SaleController.createSale
);

/**
 * @route GET /api/sales
 * @desc Obtener ventas con filtros y paginación
 * @access Private
 * @rateLimit 100 requests/min
 */
router.get(
  '/',
  generalLimit,
  validateSaleFilters,
  SaleController.getSales
);

/**
 * @route GET /api/sales/:id
 * @desc Obtener una venta específica por ID
 * @access Private
 * @rateLimit 100 requests/min
 */
router.get(
  '/:id',
  generalLimit,
  validateSaleId,
  SaleController.getSaleById
);

/**
 * @route PUT /api/sales/:id
 * @desc Actualizar una venta
 * @access Private
 * @rateLimit 100 requests/min
 */
router.put(
  '/:id',
  generalLimit,
  validateSaleId,
  validateUpdateSale,
  SaleController.updateSale
);

/**
 * @route POST /api/sales/:id/cancel
 * @desc Cancelar una venta
 * @access Private (requiere permisos especiales)
 * @rateLimit 100 requests/min
 */
router.post(
  '/:id/cancel',
  generalLimit,
  authMiddleware.requireRoles(['ADMIN', 'MANAGER']), // Solo admin y manager pueden cancelar
  validateSaleId,
  validateCancelSale,
  SaleController.cancelSale
);

// ==================== RUTAS DE REPORTES ====================

/**
 * @route GET /api/sales/summary
 * @desc Obtener resumen de ventas por período
 * @access Private
 * @rateLimit 20 requests/min
 */
router.get(
  '/summary',
  reportLimit,
  validateSalesReport,
  SaleController.getSalesSummary
);

/**
 * @route GET /api/sales/by-day
 * @desc Obtener ventas agrupadas por día
 * @access Private
 * @rateLimit 20 requests/min
 */
router.get(
  '/by-day',
  reportLimit,
  validateSalesReport,
  SaleController.getSalesByDay
);

/**
 * @route GET /api/sales/top-products
 * @desc Obtener productos más vendidos
 * @access Private
 * @rateLimit 20 requests/min
 */
router.get(
  '/top-products',
  reportLimit,
  validateSalesReport,
  SaleController.getTopSellingProducts
);

/**
 * @route GET /api/sales/stats
 * @desc Obtener estadísticas generales de ventas
 * @access Private
 * @rateLimit 20 requests/min
 */
router.get(
  '/stats',
  reportLimit,
  SaleController.getSalesStats
);

// ==================== RUTAS ESPECÍFICAS ====================

/**
 * @route GET /api/sales/by-client/:clientId
 * @desc Obtener ventas de un cliente específico
 * @access Private
 * @rateLimit 100 requests/min
 */
router.get(
  '/by-client/:clientId',
  generalLimit,
  validateSaleId, // Reutilizamos para validar UUID del cliente
  SaleController.getSalesByClient
);

/**
 * @route GET /api/sales/:id/receipt
 * @desc Obtener datos de recibo para impresión
 * @access Private
 * @rateLimit 100 requests/min
 */
router.get(
  '/:id/receipt',
  generalLimit,
  validateSaleId,
  SaleController.getSaleReceipt
);

/**
 * @route POST /api/sales/:id/duplicate
 * @desc Duplicar una venta existente
 * @access Private
 * @rateLimit 10 requests/min
 */
router.post(
  '/:id/duplicate',
  createSaleLimit,
  validateSaleId,
  SaleController.duplicateSale
);

// ==================== MANEJO DE ERRORES ====================

// Middleware de manejo de errores específico para rutas de ventas
router.use((err, req, res, next) => {
  console.error('Error en rutas de ventas:', err);
  
  // Error de validación de Joi
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      })),
      error_code: 'VALIDATION_ERROR'
    });
  }
  
  // Error de rate limiting
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes',
      error_code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error_code: 'INTERNAL_ERROR'
  });
});

module.exports = router;