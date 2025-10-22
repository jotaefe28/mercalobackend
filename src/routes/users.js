/**
 * Rutas de Usuarios
 * Sistema POS Multitenant
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/auth');
const { body, param } = require('express-validator');
const { USER_ROLES } = require('../utils/constants');

// Validaciones
const createUserValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y símbolos'),
  body('role')
    .isIn(Object.values(USER_ROLES))
    .withMessage('Rol inválido')
];

const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Rol inválido')
];

const changeRoleValidation = [
  body('role')
    .isIn(Object.values(USER_ROLES))
    .withMessage('Rol inválido')
];

const resetPasswordValidation = [
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y símbolos')
];

const userIdValidation = [
  param('userId')
    .isUUID()
    .withMessage('ID de usuario inválido')
];

// Middlewares de autorización
const requireAdmin = authMiddleware.requireRoles(['ADMIN']);
const requireAdminOrManager = authMiddleware.requireRoles(['ADMIN', 'MANAGER']);

// Aplicar autenticación a todas las rutas
router.use(authMiddleware.authenticateToken);

// Rutas de usuarios
router.post('/', requireAdminOrManager, createUserValidation, userController.createUser);
router.get('/', requireAdminOrManager, userController.getUsers);
router.get('/stats', requireAdminOrManager, userController.getUserStats);
router.get('/limits', requireAdminOrManager, userController.validateUserLimits);
router.get('/:userId', requireAdminOrManager, userIdValidation, userController.getUserById);
router.put('/:userId', requireAdminOrManager, userIdValidation, updateUserValidation, userController.updateUser);
router.patch('/:userId/toggle-status', requireAdmin, userIdValidation, userController.toggleUserStatus);
router.patch('/:userId/change-role', requireAdmin, userIdValidation, changeRoleValidation, userController.changeUserRole);
router.post('/:userId/reset-password', requireAdmin, userIdValidation, resetPasswordValidation, userController.resetUserPassword);

module.exports = router;