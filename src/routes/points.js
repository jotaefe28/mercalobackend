/**
 * Rutas de Puntos
 * Sistema POS Multitenant - Sistema de Puntos (1 punto = $1)
 */

const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/pointsController');
const authMiddleware = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');
const { body, param, query } = require('express-validator');

// Rate limiting específico para operaciones de puntos
const pointsOperationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 operaciones por ventana
  message: {
    error: 'Demasiadas operaciones de puntos. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validaciones
const addPointsValidation = [
  body('client_id')
    .isUUID()
    .withMessage('ID de cliente inválido'),
  body('points')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Los puntos deben ser un número entero entre 1 y 10,000'),
  body('description')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('La descripción debe tener entre 5 y 255 caracteres'),
  body('expires_at')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de expiración inválido')
];

const redeemPointsValidation = [
  body('client_id')
    .isUUID()
    .withMessage('ID de cliente inválido'),
  body('points')
    .isInt({ min: 1 })
    .withMessage('Los puntos a redimir deben ser un número entero positivo'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('La descripción no puede exceder 255 caracteres')
];

const transferPointsValidation = [
  body('from_client_id')
    .isUUID()
    .withMessage('ID de cliente origen inválido'),
  body('to_client_id')
    .isUUID()
    .withMessage('ID de cliente destino inválido'),
  body('points')
    .isInt({ min: 1 })
    .withMessage('Los puntos a transferir deben ser un número entero positivo'),
  body('description')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('La descripción debe tener entre 5 y 255 caracteres')
];

const adjustPointsValidation = [
  body('client_id')
    .isUUID()
    .withMessage('ID de cliente inválido'),
  body('points')
    .isInt()
    .withMessage('Los puntos deben ser un número entero'),
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('La razón del ajuste debe tener entre 10 y 500 caracteres')
];

const clientIdValidation = [
  param('clientId')
    .isUUID()
    .withMessage('ID de cliente inválido')
];

const transactionIdValidation = [
  param('transactionId')
    .isUUID()
    .withMessage('ID de transacción inválido')
];

const historyValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inicial inválido'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha final inválido'),
  query('type')
    .optional()
    .isIn(['EARNED', 'REDEEMED', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'EXPIRED'])
    .withMessage('Tipo de transacción inválido'),
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

// Rutas de consulta de puntos (sin rate limiting especial)
router.get('/balance/:clientId', clientIdValidation, pointsController.getClientPointsBalance);
router.get('/history', historyValidation, pointsController.getClientPointsHistory);
router.get('/history/:clientId', clientIdValidation, historyValidation, pointsController.getClientPointsHistory);
router.get('/summary', pointsController.getCompanyPointsStats);
router.get('/top-clients', pointsController.getTopPointsClients);
router.get('/dashboard', pointsController.getPointsDashboard);

// Aplicar rate limiting a operaciones de puntos
router.use(pointsOperationLimit);

// Rutas de operaciones de puntos
router.post('/calculate-purchase', addPointsValidation, pointsController.calculatePointsForPurchase);
router.post('/calculate-discount', redeemPointsValidation, pointsController.calculateDiscountForPoints);
router.post('/validate-redemption', redeemPointsValidation, pointsController.validateRedemption);
router.post('/adjust', requireAdminOrManager, adjustPointsValidation, pointsController.adjustPoints);
router.post('/expire', requireAdminOrManager, pointsController.expirePoints);

module.exports = router;