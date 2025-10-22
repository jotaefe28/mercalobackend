/**
 * Rutas de Órdenes
 * Sistema POS Multitenant
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/auth');
const { body, param, query } = require('express-validator');
const { ORDER_STATUS, DELIVERY_TYPES } = require('../utils/constants');

// Validaciones
const createOrderValidation = [
  body('client_id')
    .optional()
    .isUUID()
    .withMessage('ID de cliente inválido'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Se debe incluir al menos un producto'),
  body('items.*.product_id')
    .isUUID()
    .withMessage('ID de producto inválido'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero positivo'),
  body('items.*.unit_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio unitario debe ser positivo'),
  body('delivery_type')
    .isIn(Object.values(DELIVERY_TYPES))
    .withMessage('Tipo de entrega inválido'),
  body('delivery_address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La dirección de entrega no puede exceder 500 caracteres'),
  body('delivery_notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las notas de entrega no pueden exceder 1000 caracteres'),
  body('scheduled_delivery')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de entrega programada inválido'),
  body('discount_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El descuento debe ser positivo'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres')
];

const updateOrderValidation = [
  param('orderId')
    .isUUID()
    .withMessage('ID de orden inválido'),
  body('client_id')
    .optional()
    .isUUID()
    .withMessage('ID de cliente inválido'),
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Se debe incluir al menos un producto'),
  body('items.*.product_id')
    .optional()
    .isUUID()
    .withMessage('ID de producto inválido'),
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero positivo'),
  body('delivery_type')
    .optional()
    .isIn(Object.values(DELIVERY_TYPES))
    .withMessage('Tipo de entrega inválido'),
  body('delivery_address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La dirección de entrega no puede exceder 500 caracteres'),
  body('delivery_notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las notas de entrega no pueden exceder 1000 caracteres'),
  body('scheduled_delivery')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de entrega programada inválido'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres')
];

const updateStatusValidation = [
  param('orderId')
    .isUUID()
    .withMessage('ID de orden inválido'),
  body('status')
    .isIn(Object.values(ORDER_STATUS))
    .withMessage('Estado de orden inválido'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
];

const orderIdValidation = [
  param('orderId')
    .isUUID()
    .withMessage('ID de orden inválido')
];

const ordersQueryValidation = [
  query('status')
    .optional()
    .isIn(Object.values(ORDER_STATUS))
    .withMessage('Estado de orden inválido'),
  query('delivery_type')
    .optional()
    .isIn(Object.values(DELIVERY_TYPES))
    .withMessage('Tipo de entrega inválido'),
  query('client_id')
    .optional()
    .isUUID()
    .withMessage('ID de cliente inválido'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inicial inválido'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha final inválido'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser entre 1 y 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El offset debe ser un número positivo')
];

// Middlewares de autorización
const requireAdminOrManager = authMiddleware.requireRoles(['ADMIN', 'MANAGER']);

// Aplicar autenticación a todas las rutas
router.use(authMiddleware.authenticateToken);

// Rutas de órdenes
router.post('/', createOrderValidation, orderController.createOrder);
router.get('/', ordersQueryValidation, orderController.getOrders);
router.get('/pending', orderController.getPendingOrders);
router.get('/ready', orderController.getReadyOrders);
router.get('/delivered', orderController.getDeliveredOrders);
router.get('/summary', orderController.getOrdersSummary);
router.get('/:orderId', orderIdValidation, orderController.getOrderById);
router.put('/:orderId', updateOrderValidation, orderController.updateOrder);
router.patch('/:orderId/status', updateStatusValidation, orderController.updateOrderStatus);
router.delete('/:orderId', requireAdminOrManager, orderIdValidation, orderController.cancelOrder);
router.post('/:orderId/complete', orderIdValidation, orderController.completeOrder);
router.post('/:orderId/deliver', orderIdValidation, orderController.deliverOrder);

module.exports = router;