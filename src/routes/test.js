/**
 * Rutas de Testing para Rate Limiting y Validaciones
 * Solo disponible en desarrollo
 */

const express = require('express');
const router = express.Router();
const { 
  authRateLimit, 
  registerRateLimit,
  salesRateLimit,
  speedLimiter 
} = require('../middlewares/rateLimiter.middleware');
const { authValidations } = require('../middlewares/validation.strict');

// Solo disponible en desarrollo
if (process.env.NODE_ENV === 'development') {
  
  /**
   * Test de CORS específico para frontend
   */
  router.options('/cors-frontend', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
  });

  router.get('/cors-frontend', (req, res) => {
    console.log('🌐 CORS Frontend Test Request:');
    console.log('- Origin:', req.get('Origin'));
    console.log('- User-Agent:', req.get('User-Agent'));
    console.log('- Cookies:', req.cookies);
    
    res.json({
      success: true,
      message: 'CORS frontend test passed successfully',
      origin: req.get('Origin') || 'No origin header',
      userAgent: req.get('User-Agent'),
      cookies: req.cookies,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Test de CORS
   */
  router.get('/cors', (req, res) => {
    res.json({
      success: true,
      message: 'CORS test passed successfully',
      origin: req.get('Origin') || 'No origin header',
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Test de cookies
   */
  router.post('/cookies', (req, res) => {
    // Configurar una cookie de test
    res.cookie('test_cookie', 'test_value', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60000 // 1 minuto
    });

    res.json({
      success: true,
      message: 'Cookie test - cookie has been set',
      receivedCookies: req.cookies,
      headers: {
        origin: req.get('Origin'),
        contentType: req.get('Content-Type'),
        userAgent: req.get('User-Agent')
      },
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Test de lectura de cookies
   */
  router.get('/cookies', (req, res) => {
    res.json({
      success: true,
      message: 'Cookie read test',
      cookies: req.cookies,
      hasCookies: Object.keys(req.cookies).length > 0,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Test de rate limiting de autenticación
   */
  router.get('/rate-limit/auth', authRateLimit, (req, res) => {
    res.json({
      success: true,
      message: 'Auth rate limit test passed',
      timestamp: new Date().toISOString(),
      ip: req.ip,
      remainingRequests: req.rateLimit?.remaining || 'unknown'
    });
  });

  /**
   * Test de rate limiting de registro
   */
  router.get('/rate-limit/register', registerRateLimit, (req, res) => {
    res.json({
      success: true,
      message: 'Register rate limit test passed',
      timestamp: new Date().toISOString(),
      ip: req.ip,
      remainingRequests: req.rateLimit?.remaining || 'unknown'
    });
  });

  /**
   * Test de validaciones estrictas
   */
  router.post('/validation/register', authValidations.register, (req, res) => {
    res.json({
      success: true,
      message: 'Validation test passed - data is valid',
      data: {
        company: req.body.company,
        user: {
          name: req.body.user.name,
          email: req.body.user.email,
          // No incluir contraseña en respuesta
        }
      }
    });
  });

  /**
   * Test de validaciones de login
   */
  router.post('/validation/login', authValidations.login, (req, res) => {
    res.json({
      success: true,
      message: 'Login validation test passed',
      email: req.body.email,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Test de speed limiter
   */
  router.get('/speed-limit', speedLimiter, (req, res) => {
    res.json({
      success: true,
      message: 'Speed limiter test - check response time',
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
  });

  /**
   * Información de rate limiting actual
   */
  router.get('/info', (req, res) => {
    res.json({
      success: true,
      message: 'Rate limiting configuration',
      config: {
        authWindow: process.env.AUTH_RATE_LIMIT_WINDOW || '900000ms',
        authMax: process.env.AUTH_RATE_LIMIT_MAX || '5',
        apiWindow: process.env.API_RATE_LIMIT_WINDOW || '60000ms',
        apiMax: process.env.API_RATE_LIMIT_MAX || '100',
        registerWindow: process.env.REGISTER_RATE_LIMIT_WINDOW || '3600000ms',
        registerMax: process.env.REGISTER_RATE_LIMIT_MAX || '3'
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });

} else {
  // En producción, todas las rutas retornan 404
  router.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Test endpoints not available in production'
    });
  });
}

module.exports = router;