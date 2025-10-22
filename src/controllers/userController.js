/**
 * Controlador de Usuarios
 * Sistema POS Multitenant
 */

const userService = require('../services/userService');
const { validationResult } = require('express-validator');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../utils/constants');

class UserController {
  /**
   * Crear nuevo usuario
   */
  async createUser(req, res, next) {
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

      const userData = req.body;
      const companyId = req.user.companyId;
      const createdBy = req.user.userId;

      logger.info('Creando usuario', {
        email: userData.email,
        companyId,
        createdBy
      });

      const user = await userService.createUser(userData, companyId, createdBy);

      logger.info('Usuario creado exitosamente', {
        userId: user.id,
        email: user.email
      });

      res.status(201).json({
        success: true,
        message: RESPONSE_MESSAGES.CREATED,
        data: user
      });

    } catch (error) {
      logger.error('Error creando usuario', {
        error: error.message,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(req, res, next) {
    try {
      const { userId } = req.params;
      const companyId = req.user.companyId;

      const user = await userService.getUserById(userId, companyId);

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      logger.error('Error obteniendo usuario', {
        userId: req.params.userId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Listar usuarios
   */
  async getUsers(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        search: req.query.search || '',
        role: req.query.role || null,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : null
      };

      logger.info('Listando usuarios', {
        companyId,
        options
      });

      const result = await userService.getUsers(companyId, options);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: options.page,
          limit: options.limit,
          total: result.total,
          pages: Math.ceil(result.total / options.limit)
        }
      });

    } catch (error) {
      logger.error('Error listando usuarios', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Actualizar usuario
   */
  async updateUser(req, res, next) {
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

      const { userId } = req.params;
      const updateData = req.body;
      const companyId = req.user.companyId;
      const updatedBy = req.user.userId;

      logger.info('Actualizando usuario', {
        userId,
        companyId,
        updatedBy
      });

      const user = await userService.updateUser(userId, updateData, companyId, updatedBy);

      logger.info('Usuario actualizado exitosamente', {
        userId,
        companyId
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED,
        data: user
      });

    } catch (error) {
      logger.error('Error actualizando usuario', {
        userId: req.params.userId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Cambiar estado del usuario
   */
  async toggleUserStatus(req, res, next) {
    try {
      const { userId } = req.params;
      const companyId = req.user.companyId;
      const updatedBy = req.user.userId;

      logger.info('Cambiando estado de usuario', {
        userId,
        companyId,
        updatedBy
      });

      const user = await userService.toggleUserStatus(userId, companyId, updatedBy);

      logger.info('Estado de usuario cambiado', {
        userId,
        newStatus: user.is_active
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED,
        data: user
      });

    } catch (error) {
      logger.error('Error cambiando estado de usuario', {
        userId: req.params.userId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Cambiar rol del usuario
   */
  async changeUserRole(req, res, next) {
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

      const { userId } = req.params;
      const { role } = req.body;
      const companyId = req.user.companyId;
      const updatedBy = req.user.userId;

      logger.info('Cambiando rol de usuario', {
        userId,
        newRole: role,
        companyId,
        updatedBy
      });

      const user = await userService.changeUserRole(userId, role, companyId, updatedBy);

      logger.info('Rol de usuario cambiado', {
        userId,
        newRole: role
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED,
        data: user
      });

    } catch (error) {
      logger.error('Error cambiando rol de usuario', {
        userId: req.params.userId,
        newRole: req.body.role,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Restablecer contraseña del usuario (solo admin)
   */
  async resetUserPassword(req, res, next) {
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

      const { userId } = req.params;
      const { newPassword } = req.body;
      const companyId = req.user.companyId;
      const resetBy = req.user.userId;

      logger.info('Restableciendo contraseña de usuario', {
        userId,
        companyId,
        resetBy
      });

      await userService.resetUserPassword(userId, newPassword, companyId, resetBy);

      logger.info('Contraseña de usuario restablecida', {
        userId,
        resetBy
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED
      });

    } catch (error) {
      logger.error('Error restableciendo contraseña de usuario', {
        userId: req.params.userId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getUserStats(req, res, next) {
    try {
      const companyId = req.user.companyId;

      logger.info('Obteniendo estadísticas de usuarios', { companyId });

      const stats = await userService.getUserStats(companyId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error obteniendo estadísticas de usuarios', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Validar límites de usuarios por plan
   */
  async validateUserLimits(req, res, next) {
    try {
      const companyId = req.user.companyId;

      const limits = await userService.validateUserLimits(companyId);

      res.json({
        success: true,
        data: limits
      });

    } catch (error) {
      logger.error('Error validando límites de usuarios', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }
}

module.exports = new UserController();