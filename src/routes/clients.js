/**
 * Rutas de Clientes
 * Sistema POS Multitenant
 */

const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middlewares/auth');
const { body, param, query } = require('express-validator');

// Validaciones
const createClientValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('Formato de teléfono inválido'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Formato de email inválido'),
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La dirección no puede exceder 500 caracteres'),
  body('rfc')
    .optional()
    .matches(/^[A-ZÑ&]{3,4}\d{6}[A-V1-9][A-Z1-9][0-9A]$/)
    .withMessage('Formato de RFC inválido'),
  body('company_name')
    .optional()
    .isLength({ max: 200 })
    .withMessage('El nombre de la empresa no puede exceder 200 caracteres'),
  body('birth_date')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha de nacimiento inválido')
];

const updateClientValidation = [
  param('clientId')
    .isUUID()
    .withMessage('ID de cliente inválido'),
  ...createClientValidation
];

const clientIdValidation = [
  param('clientId')
    .isUUID()
    .withMessage('ID de cliente inválido')
];

const clientStatsValidation = [
  param('clientId')
    .isUUID()
    .withMessage('ID de cliente inválido'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inicial inválido'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha final inválido')
];

const searchValidation = [
  query('term')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El término de búsqueda debe tener entre 2 y 100 caracteres'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('El límite debe ser entre 1 y 50')
];

// Middlewares de autorización
const requireAdminOrManager = authMiddleware.requireRoles(['ADMIN', 'MANAGER']);

// Aplicar autenticación a todas las rutas
router.use(authMiddleware.authenticateToken);

// Rutas de clientes
router.post('/', createClientValidation, clientController.createClient);
router.get('/', clientController.getClients);
router.get('/search', searchValidation, clientController.searchClients);
router.get('/top-customers', clientController.getTopClients);
router.get('/stats', clientController.getCompanyClientStats);
router.get('/:clientId', clientIdValidation, clientController.getClientById);
router.put('/:clientId', updateClientValidation, clientController.updateClient);
router.delete('/:clientId', requireAdminOrManager, clientIdValidation, clientController.toggleClientStatus);
router.get('/:clientId/history', clientIdValidation, clientController.getClientPurchaseHistory);
router.get('/:clientId/stats', clientStatsValidation, clientController.getClientStats);
router.post('/:clientId/activate', requireAdminOrManager, clientIdValidation, clientController.toggleClientStatus);
router.post('/:clientId/deactivate', requireAdminOrManager, clientIdValidation, clientController.toggleClientStatus);

module.exports = router;