/**
 * Controlador de Autenticación
 * Sistema POS Multitenant
 */

const authService = require('../services/authService');
const { validationResult } = require('express-validator');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../utils/constants');

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
   * Inicio de sesión
   */
  async login(req, res, next) {
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

      const { email, password } = req.body;

      logger.info('Intento de login', { email, ip: req.ip });

      const result = await authService.login(email, password);

      // Configurar cookies httpOnly
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
      });

      logger.info('Login exitoso', {
        userId: result.user.id,
        companyId: result.company.id
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.LOGIN_SUCCESS,
        data: {
          user: result.user,
          company: result.company
        }
      });

    } catch (error) {
      logger.error('Error en login', {
        email: req.body.email,
        error: error.message,
        ip: req.ip
      });
      next(error);
    }
  }

  /**
   * Renovar token de acceso
   */
  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Token de renovación requerido'
        });
      }

      const result = await authService.refreshToken(refreshToken);

      // Configurar nueva cookie de access token
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.TOKEN_REFRESHED
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
   * Cerrar sesión
   */
  async logout(req, res, next) {
    try {
      // Limpiar cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      logger.info('Logout exitoso', {
        userId: req.user?.userId,
        ip: req.ip
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.LOGOUT_SUCCESS
      });

    } catch (error) {
      logger.error('Error en logout', {
        error: error.message,
        userId: req.user?.userId
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
      const userId = req.user.userId;

      await authService.changePassword(userId, currentPassword, newPassword);

      logger.info('Contraseña cambiada', { userId });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED
      });

    } catch (error) {
      logger.error('Error cambiando contraseña', {
        userId: req.user?.userId,
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
      const userId = req.user.userId;

      const result = await authService.validateSession(userId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error obteniendo perfil', {
        userId: req.user?.userId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Validar sesión
   */
  async validateSession(req, res, next) {
    try {
      const userId = req.user.userId;

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
        userId: req.user?.userId,
        error: error.message
      });
      next(error);
    }
  }
}

module.exports = new AuthController();