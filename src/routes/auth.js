/**
 * Rutas de Autenticación
 * Sistema POS Multitenant
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');
const { body } = require('express-validator');
const { authRateLimit, registerRateLimit } = require('../middlewares/rateLimiter.simple');
const { authValidations } = require('../middlewares/validation.strict');

// Rutas públicas
router.post('/register', registerRateLimit, authValidations.register, authController.register);
router.post('/login', authRateLimit, authValidations.login, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Rutas protegidas
router.post('/logout', authController.logout);
router.get('/profile', authMiddleware.authenticateToken, authController.getProfile);
router.get('/validate-session', authMiddleware.authenticateToken, authController.validateSession);
router.post('/change-password', authMiddleware.authenticateToken, authValidations.changePassword, authController.changePassword);

module.exports = router;