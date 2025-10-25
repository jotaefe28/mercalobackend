/**
 * Controlador de Autenticación
 * Sistema POS Multitenant
 */

const authService = require('../services/authService');
const { validationResult } = require('express-validator');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../utils/constants');
const jwtUtils = require('../utils/jwt');
const User = require('../models/User');

class AuthController {
  /**
   * Registro de empresa y usuario administrador
   */
  async register(req, res, next) {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { company, user } = req.body;

      logger.info('Registro iniciado', {
        companyName: company.name,
        userEmail: user.email,
        ip: req.ip
      });

      const result = await authService.register(company, user);

      logger.info('Registro completado', {
        companyId: result.company.id,
        userId: result.user.id
      });

      res.status(201).json({
        success: true,
        message: RESPONSE_MESSAGES.CREATED,
        data: result
      });

    } catch (error) {
      logger.error('Error en registro', {
        error: error.message,
        stack: error.stack
      });
      next(error);
    }
  }

  /**
   * Inicio de sesión con cookies seguras (versión simplificada)
   */
  async login(req, res, next) {
    console.log('🎯 [AuthController.login] === INICIO LOGIN ===');
    console.log('🎯 [AuthController.login] Headers recibidos:', {
      origin: req.headers.origin,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer
    });
    console.log('🎯 [AuthController.login] Cookies recibidas:', req.cookies);
    console.log('🎯 [AuthController.login] Body:', req.body);

    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ [AuthController.login] Errores de validación:', errors.array());
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;
      console.log('🎯 [AuthController.login] Credenciales extraídas:', { email, password: '***' });

      logger.info('Intento de login', { email, ip: req.ip });

      console.log('🎯 [AuthController.login] Llamando a authService.login...');
      // Llamar al servicio con req y res para configurar cookies
      const result = await authService.login(email, password, req, res);
      console.log('✅ [AuthController.login] AuthService respondió:', {
        user: result.user?.name,
        company: result.company?.name,
        expires_in: result.expires_in
      });

      logger.info('Login exitoso', {
        userId: result.user.id,
        companyId: result.company.id
      });

      // Respuesta simple como tu ejemplo
      const response = { 
        message: 'Login exitoso', 
        ok: true,
        user: {
          name: result.user.name,
          email: result.user.email,
          company: result.company.name
        }
      };

      console.log('✅ [AuthController.login] Enviando respuesta:', response);
      res.status(200).json(response);
      console.log('🎯 [AuthController.login] === FIN LOGIN EXITOSO ===');

    } catch (error) {
      console.log('❌ [AuthController.login] ERROR CAPTURADO:', {
        message: error.message,
        code: error.code,
        stack: error.stack?.split('\n')[0]
      });

      logger.error('Error en login', {
        email: req.body.email,
        error: error.message,
        ip: req.ip
      });
      
      // Error simple como tu ejemplo
      console.log('❌ [AuthController.login] Enviando error 401');
      res.status(401).json({ message: 'Invalid credentials' });
      console.log('🎯 [AuthController.login] === FIN LOGIN CON ERROR ===');
    }
  }

  /**
   * Renovar token de acceso usando cookies
   */
  async refreshToken(req, res, next) {
    try {
      const result = await authService.refreshToken(req, res);

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.TOKEN_REFRESHED,
        data: {
          expires_in: result.expires_in
        }
      });

    } catch (error) {
      logger.error('Error renovando token', {
        error: error.message,
        ip: req.ip
      });
      next(error);
    }
  }

  /**
   * Cerrar sesión con limpieza de cookies
   */
  async logout(req, res, next) {
    try {
      const result = await authService.logout(req, res);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      logger.error('Error en logout', {
        error: error.message,
        userId: req.user?.user_id
      });
      next(error);
    }
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(req, res, next) {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.user_id;

      await authService.changePassword(userId, currentPassword, newPassword);

      logger.info('Contraseña cambiada', { userId });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED
      });

    } catch (error) {
      logger.error('Error cambiando contraseña', {
        userId: req.user?.user_id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Solicitar restablecimiento de contraseña
   */
  async requestPasswordReset(req, res, next) {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { email } = req.body;

      const result = await authService.requestPasswordReset(email);

      res.json({
        success: true,
        message: result.message,
        ...(process.env.NODE_ENV === 'development' && { 
          resetToken: result.resetToken 
        })
      });

    } catch (error) {
      logger.error('Error solicitando reset de contraseña', {
        email: req.body.email,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Restablecer contraseña con token
   */
  async resetPassword(req, res, next) {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { resetToken, newPassword } = req.body;

      await authService.resetPassword(resetToken, newPassword);

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED
      });

    } catch (error) {
      logger.error('Error restableciendo contraseña', {
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener perfil del usuario actual
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.user_id;

      const result = await authService.validateSession(userId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error obteniendo perfil', {
        userId: req.user?.user_id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Validar sesión (endpoint /verify como tu ejemplo)
   */
  async verify(req, res, next) {
    console.log('🔍 [AuthController.verify] === INICIO VERIFY ===');
    console.log('🔍 [AuthController.verify] Headers recibidos:', {
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      authorization: req.headers.authorization ? 'Present' : 'Missing'
    });
    console.log('🔍 [AuthController.verify] Cookies recibidas:', req.cookies);
    console.log('🔍 [AuthController.verify] Todas las cookies disponibles:', Object.keys(req.cookies || {}));

    try {
      // Buscar token en múltiples ubicaciones posibles
      let token = null;
      let tokenSource = '';
      
      // Prioridad 1: access_token cookie
      if (req.cookies && req.cookies.access_token) {
        token = req.cookies.access_token;
        tokenSource = 'access_token cookie';
      }
      // Prioridad 2: token cookie  
      else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
        tokenSource = 'token cookie';
      }
      // Prioridad 3: Authorization header como fallback
      else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.substring(7);
        tokenSource = 'Authorization header';
      }
      
      console.log('🔍 [AuthController.verify] Búsqueda de token:', {
        access_token: req.cookies?.access_token ? 'Present' : 'Missing',
        token: req.cookies?.token ? 'Present' : 'Missing',
        authHeader: req.headers.authorization ? 'Present' : 'Missing',
        tokenFound: !!token,
        source: tokenSource
      });
      
      if (!token) {
        console.log('❌ [AuthController.verify] No token encontrado en ninguna ubicación');
        return res.status(401).json({ 
          authenticated: false, 
          message: 'No token provided',
          debug: {
            cookiesAvailable: Object.keys(req.cookies || {}),
            authHeaderPresent: !!req.headers.authorization
          }
        });
      }

      try {
        console.log('🔍 [AuthController.verify] Verificando token con jwtUtils...');
        console.log('🔍 [AuthController.verify] Token fuente:', tokenSource);
        console.log('🔍 [AuthController.verify] Token (primeros 20 chars):', token.substring(0, 20) + '...');
        
        const decoded = jwtUtils.verifyAccessToken(token);
        console.log('✅ [AuthController.verify] Token decodificado exitosamente:', {
          user_id: decoded.user_id,
          email: decoded.email,
          company_id: decoded.company_id,
          exp: new Date(decoded.exp * 1000).toISOString()
        });
        
        // Verificar que el usuario sigue activo
        console.log('🔍 [AuthController.verify] Buscando usuario en BD...');
        const user = await User.findById(decoded.user_id);
        
        if (!user) {
          console.log('❌ [AuthController.verify] Usuario no encontrado en BD');
          return res.status(401).json({ 
            authenticated: false, 
            message: 'User not found' 
          });
        }
        
        if (!user.is_active) {
          console.log('❌ [AuthController.verify] Usuario inactivo');
          return res.status(401).json({ 
            authenticated: false, 
            message: 'User inactive' 
          });
        }

        console.log('✅ [AuthController.verify] Usuario válido:', {
          id: user.id,
          name: user.name,
          email: user.email,
          is_active: user.is_active
        });

        const userData = {
          name: user.name,
          email: user.email,
          company: user.company_name || 'N/A'
        };

        const response = { 
          authenticated: true, 
          user: userData 
        };

        console.log('✅ [AuthController.verify] Enviando respuesta exitosa:', response);
        res.status(200).json(response);
        console.log('🔍 [AuthController.verify] === FIN VERIFY EXITOSO ===');

      } catch (jwtError) {
        console.log('❌ [AuthController.verify] Error JWT:', {
          message: jwtError.message,
          name: jwtError.name,
          tokenSource: tokenSource
        });
        
        // Devolver 401 para errores de token (expired, invalid, etc.)
        return res.status(401).json({ 
          authenticated: false, 
          message: 'Invalid or expired token',
          error: jwtError.name 
        });
      }

    } catch (error) {
      console.log('❌ [AuthController.verify] ERROR GENERAL:', {
        message: error.message,
        stack: error.stack?.split('\n')[0]
      });

      logger.error('Error en verify', {
        error: error.message,
        userId: req.user?.user_id
      });
      
      res.status(500).json({ 
        authenticated: false, 
        message: 'Internal server error' 
      });
      console.log('🔍 [AuthController.verify] === FIN VERIFY CON ERROR ===');
    }
  }

  /**
   * Validar sesión
   */
  async validateSession(req, res, next) {
    try {
      const userId = req.user.user_id;

      const result = await authService.validateSession(userId);

      res.json({
        success: true,
        data: {
          valid: true,
          user: result.user,
          company: result.company
        }
      });

    } catch (error) {
      logger.error('Error validando sesión', {
        userId: req.user?.user_id,
        error: error.message
      });
      next(error);
    }
  }
}

module.exports = new AuthController();