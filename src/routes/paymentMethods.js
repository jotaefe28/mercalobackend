/**
 * Rutas de Métodos de Pago
 * Sistema POS Multitenant
 */

const express = require('express');
const router = express.Router();
const paymentMethodController = require('../controllers/paymentMethodController');
const authMiddleware = require('../middlewares/auth');
const { body, param } = require('express-validator');
const { PAYMENT_CHANNELS } = require('../utils/constants');

// Validaciones
const createPaymentMethodValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('type')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El tipo debe tener entre 2 y 50 caracteres'),
  body('channel')
    .isIn(Object.values(PAYMENT_CHANNELS))
    .withMessage('Canal de pago inválido'),
  body('commission_rate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('La comisión debe ser entre 0 y 100'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('El estado activo debe ser verdadero o falso'),
  body('requires_authorization')
    .optional()
    .isBoolean()
    .withMessage('El campo de autorización debe ser verdadero o falso'),
  body('min_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El monto mínimo debe ser positivo'),
  body('max_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El monto máximo debe ser positivo'),
  body('description')
    .optional()
    .isLength({ max: 255 })
    .withMessage('La descripción no puede exceder 255 caracteres')
];

const updatePaymentMethodValidation = [
  param('paymentMethodId')
    .isUUID()
    .withMessage('ID de método de pago inválido'),
  ...createPaymentMethodValidation
];

const paymentMethodIdValidation = [
  param('paymentMethodId')
    .isUUID()
    .withMessage('ID de método de pago inválido')
];

// Middlewares de autorización
const requireAdminOrManager = authMiddleware.requireRoles(['ADMIN', 'MANAGER']);

// Aplicar autenticación a todas las rutas
router.use(authMiddleware.authenticateToken);

// Rutas de métodos de pago
router.post('/', requireAdminOrManager, createPaymentMethodValidation, paymentMethodController.createPaymentMethod);
router.get('/', paymentMethodController.getPaymentMethods);
router.get('/stats', paymentMethodController.getPaymentMethodStats);
router.get('/:paymentMethodId', paymentMethodIdValidation, paymentMethodController.getPaymentMethodById);
router.put('/:paymentMethodId', requireAdminOrManager, updatePaymentMethodValidation, paymentMethodController.updatePaymentMethod);
router.post('/:paymentMethodId/toggle', requireAdminOrManager, paymentMethodIdValidation, paymentMethodController.togglePaymentMethodStatus);

module.exports = router;