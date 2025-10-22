/**
 * Rutas de Ventas
 * Sistema POS Multitenant
 */

const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const authMiddleware = require('../middlewares/auth');
const { body, param } = require('express-validator');
const { DELIVERY_TYPES, PAYMENT_CHANNELS } = require('../utils/constants');

// Validaciones
const processSaleValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Se debe incluir al menos un producto'),
  body('items.*.product_id')
    .isUUID()
    .withMessage('ID de producto inválido'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero positivo'),
  body('payments')
    .isArray({ min: 1 })
    .withMessage('Se debe incluir al menos un método de pago'),
  body('payments.*.payment_method_id')
    .isUUID()
    .withMessage('ID de método de pago inválido'),
  body('payments.*.amount')
    .isFloat({ min: 0.01 })
    .withMessage('El monto debe ser mayor a 0'),
  body('total')
    .isFloat({ min: 0.01 })
    .withMessage('El total debe ser mayor a 0'),
  body('client_id')
    .optional()
    .isUUID()
    .withMessage('ID de cliente inválido'),
  body('delivery_type')
    .optional()
    .isIn(Object.values(DELIVERY_TYPES))
    .withMessage('Tipo de entrega inválido'),
  body('points_to_redeem')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Los puntos a redimir deben ser un número entero positivo'),
  body('discount_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El descuento debe ser un número positivo')
];

const voidSaleValidation = [
  body('reason')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('La razón de anulación debe tener entre 5 y 500 caracteres')
];

const saleIdValidation = [
  param('saleId')
    .isUUID()
    .withMessage('ID de venta inválido')
];

// Middlewares de autorización
const requireAdminOrManager = authMiddleware.requireRoles(['ADMIN', 'MANAGER']);

// Aplicar autenticación a todas las rutas
router.use(authMiddleware.authenticateToken);

// Rutas de ventas
router.post('/', processSaleValidation, saleController.processSale);
router.get('/', saleController.getSales);
router.get('/summary', saleController.getSalesSummary);
router.get('/top-products', saleController.getTopSellingProducts);
router.get('/today', saleController.getTodaySales);
router.get('/quick-stats', saleController.getQuickStats);
router.get('/limits', requireAdminOrManager, saleController.validateSaleLimits);
router.get('/:saleId', saleIdValidation, saleController.getSaleById);
router.post('/:saleId/void', requireAdminOrManager, saleIdValidation, voidSaleValidation, saleController.voidSale);

module.exports = router;