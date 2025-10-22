/**
 * Rutas de Autenticación
 * Sistema POS Multitenant
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');
const { rateLimit } = require('express-rate-limit');
const { body } = require('express-validator');

// Rate limiting para autenticación
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por IP
  message: {
    success: false,
    message: 'Demasiados intentos de autenticación. Intenta nuevamente en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting general
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  standardHeaders: true,
  legacyHeaders: false
});

// Validaciones
const registerValidation = [
  body('company.name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre de la empresa debe tener entre 2 y 255 caracteres'),
  body('company.tax_id')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('El NIT debe tener entre 5 y 50 caracteres'),
  body('company.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email de empresa inválido'),
  body('user.name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre del usuario debe tener entre 2 y 255 caracteres'),
  body('user.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email de usuario inválido'),
  body('user.password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y símbolos')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y símbolos')
];

const requestPasswordResetValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido')
];

const resetPasswordValidation = [
  body('resetToken')
    .notEmpty()
    .withMessage('Token de restablecimiento requerido'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y símbolos')
];

// Rutas públicas
router.post('/register', generalRateLimit, registerValidation, authController.register);
router.post('/login', authRateLimit, loginValidation, authController.login);
router.post('/refresh-token', generalRateLimit, authController.refreshToken);
router.post('/request-password-reset', authRateLimit, requestPasswordResetValidation, authController.requestPasswordReset);
router.post('/reset-password', authRateLimit, resetPasswordValidation, authController.resetPassword);

// Rutas protegidas
router.post('/logout', generalRateLimit, authController.logout);
router.get('/profile', generalRateLimit, authMiddleware.authenticateToken, authController.getProfile);
router.get('/validate-session', generalRateLimit, authMiddleware.authenticateToken, authController.validateSession);
router.post('/change-password', generalRateLimit, authMiddleware.authenticateToken, changePasswordValidation, authController.changePassword);

module.exports = router;