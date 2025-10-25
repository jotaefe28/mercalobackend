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

// Middleware de logging para todas las rutas de auth
router.use((req, res, next) => {
  console.log('🔐 [AuthRoutes] === NUEVA PETICIÓN AUTH ===');
  console.log('🔐 [AuthRoutes] Método:', req.method);
  console.log('🔐 [AuthRoutes] Ruta:', req.originalUrl);
  console.log('🔐 [AuthRoutes] IP:', req.ip);
  console.log('🔐 [AuthRoutes] User-Agent:', req.get('User-Agent'));
  console.log('🔐 [AuthRoutes] Origin:', req.get('Origin'));
  console.log('🔐 [AuthRoutes] Referer:', req.get('Referer'));
  console.log('🔐 [AuthRoutes] Cookies presentes:', Object.keys(req.cookies || {}));
  console.log('🔐 [AuthRoutes] Headers Auth:', req.headers.authorization ? 'Present' : 'Missing');
  console.log('🔐 [AuthRoutes] Body keys:', Object.keys(req.body || {}));
  console.log('🔐 [AuthRoutes] === =================== ===');
  next();
});

// Rutas públicas - Rate limiting deshabilitado temporalmente para debug
router.post('/register', authValidations.register, authController.register);
router.post('/login', authValidations.login, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Rutas protegidas
router.post('/logout', authController.logout);
router.get('/verify', authController.verify); // Nuevo endpoint como tu ejemplo

// Endpoint temporal de debug para cookies
router.get('/debug-cookies', (req, res) => {
  console.log('🔍 [DEBUG] === COOKIES DEBUG ENDPOINT ===');
  console.log('🔍 [DEBUG] req.cookies:', req.cookies);
  console.log('🔍 [DEBUG] Cookie header raw:', req.headers.cookie);
  console.log('🔍 [DEBUG] All headers:', Object.keys(req.headers));
  console.log('🔍 [DEBUG] Origin:', req.headers.origin);
  console.log('🔍 [DEBUG] === ========================= ===');
  
  res.json({
    success: true,
    cookies: req.cookies,
    cookieHeader: req.headers.cookie,
    cookieKeys: Object.keys(req.cookies || {}),
    cookieCount: Object.keys(req.cookies || {}).length,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']
  });
});

router.get('/profile', authMiddleware.authenticateToken, authController.getProfile);
router.get('/validate-session', authMiddleware.authenticateToken, authController.validateSession);
router.post('/change-password', authMiddleware.authenticateToken, authValidations.changePassword, authController.changePassword);

module.exports = router;