/**
 * Servicio de Usuarios
 * Sistema POS Multitenant
 */

const User = require('../models/User');
const bcryptUtils = require('../utils/bcrypt');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES, USER_ROLES } = require('../utils/constants');

class UserService {
  /**
   * Crear nuevo usuario
   */
  async createUser(userData, companyId, createdBy) {
    try {
      logger.info('Creando nuevo usuario', { 
        email: userData.email,
        companyId,
        createdBy 
      });

      // Verificar que no exista el email
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw {
          code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
          message: 'El email ya está registrado'
        };
      }

      // Agregar datos adicionales
      const userWithCompany = {
        ...userData,
        company_id: companyId,
        created_by: createdBy
      };

      // Crear usuario
      const user = await User.create(userWithCompany);

      logger.info('Usuario creado exitosamente', {
        userId: user.id,
        email: user.email,
        companyId
      });

      // Retornar sin la contraseña
      const { password, ...userResponse } = user;
      return userResponse;

    } catch (error) {
      logger.error('Error creando usuario', {
        email: userData.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(userId, companyId) {
    try {
      const user = await User.findByIdAndCompany(userId, companyId);
      if (!user) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Usuario no encontrado'
        };
      }

      // Retornar sin la contraseña
      const { password, ...userResponse } = user;
      return userResponse;

    } catch (error) {
      logger.error('Error obteniendo usuario', {
        userId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Listar usuarios de la empresa
   */
  async getUsers(companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        role = null,
        isActive = null
      } = options;

      logger.info('Listando usuarios', {
        companyId,
        page,
        limit,
        search,
        role,
        isActive
      });

      const filters = { company_id: companyId };
      
      if (role) filters.role = role;
      if (isActive !== null) filters.is_active = isActive;

      const result = await User.findAll(filters, {
        page,
        limit,
        search,
        searchFields: ['name', 'email']
      });

      // Remover contraseñas de todos los usuarios
      result.data = result.data.map(user => {
        const { password, ...userResponse } = user;
        return userResponse;
      });

      logger.info('Usuarios listados exitosamente', {
        companyId,
        total: result.total,
        returned: result.data.length
      });

      return result;

    } catch (error) {
      logger.error('Error listando usuarios', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Actualizar usuario
   */
  async updateUser(userId, updateData, companyId, updatedBy) {
    try {
      logger.info('Actualizando usuario', {
        userId,
        companyId,
        updatedBy
      });

      // Verificar que el usuario existe
      const existingUser = await User.findByIdAndCompany(userId, companyId);
      if (!existingUser) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Usuario no encontrado'
        };
      }

      // Si se actualiza el email, verificar que no esté en uso
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailInUse = await User.findByEmail(updateData.email);
        if (emailInUse) {
          throw {
            code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
            message: 'El email ya está en uso'
          };
        }
      }

      // Preparar datos de actualización
      const dataToUpdate = {
        ...updateData,
        updated_by: updatedBy,
        updated_at: new Date()
      };

      // Actualizar usuario
      const updatedUser = await User.update(userId, dataToUpdate);

      logger.info('Usuario actualizado exitosamente', {
        userId,
        companyId
      });

      // Retornar sin la contraseña
      const { password, ...userResponse } = updatedUser;
      return userResponse;

    } catch (error) {
      logger.error('Error actualizando usuario', {
        userId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cambiar estado activo/inactivo del usuario
   */
  async toggleUserStatus(userId, companyId, updatedBy) {
    try {
      logger.info('Cambiando estado de usuario', {
        userId,
        companyId,
        updatedBy
      });

      // Verificar que el usuario existe
      const user = await User.findByIdAndCompany(userId, companyId);
      if (!user) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Usuario no encontrado'
        };
      }

      // No permitir desactivar al último administrador
      if (user.role === USER_ROLES.ADMIN && user.is_active) {
        const activeAdmins = await User.countActiveAdmins(companyId);
        if (activeAdmins <= 1) {
          throw {
            code: ERROR_CODES.BUSINESS_RULE_VIOLATION,
            message: 'No se puede desactivar al último administrador'
          };
        }
      }

      const newStatus = !user.is_active;
      const updatedUser = await User.update(userId, {
        is_active: newStatus,
        updated_by: updatedBy,
        updated_at: new Date()
      });

      logger.info('Estado de usuario cambiado exitosamente', {
        userId,
        newStatus,
        companyId
      });

      // Retornar sin la contraseña
      const { password, ...userResponse } = updatedUser;
      return userResponse;

    } catch (error) {
      logger.error('Error cambiando estado de usuario', {
        userId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cambiar rol del usuario
   */
  async changeUserRole(userId, newRole, companyId, updatedBy) {
    try {
      logger.info('Cambiando rol de usuario', {
        userId,
        newRole,
        companyId,
        updatedBy
      });

      // Verificar que el usuario existe
      const user = await User.findByIdAndCompany(userId, companyId);
      if (!user) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Usuario no encontrado'
        };
      }

      // Verificar que el rol es válido
      if (!Object.values(USER_ROLES).includes(newRole)) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Rol inválido'
        };
      }

      // No permitir quitar rol ADMIN al último administrador
      if (user.role === USER_ROLES.ADMIN && newRole !== USER_ROLES.ADMIN) {
        const activeAdmins = await User.countActiveAdmins(companyId);
        if (activeAdmins <= 1) {
          throw {
            code: ERROR_CODES.BUSINESS_RULE_VIOLATION,
            message: 'No se puede cambiar el rol del último administrador'
          };
        }
      }

      const updatedUser = await User.update(userId, {
        role: newRole,
        updated_by: updatedBy,
        updated_at: new Date()
      });

      logger.info('Rol de usuario cambiado exitosamente', {
        userId,
        oldRole: user.role,
        newRole,
        companyId
      });

      // Retornar sin la contraseña
      const { password, ...userResponse } = updatedUser;
      return userResponse;

    } catch (error) {
      logger.error('Error cambiando rol de usuario', {
        userId,
        newRole,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Restablecer contraseña del usuario (solo admin)
   */
  async resetUserPassword(userId, newPassword, companyId, resetBy) {
    try {
      logger.info('Restableciendo contraseña de usuario', {
        userId,
        companyId,
        resetBy
      });

      // Verificar que el usuario existe
      const user = await User.findByIdAndCompany(userId, companyId);
      if (!user) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Usuario no encontrado'
        };
      }

      // Validar nueva contraseña
      const passwordValidation = bcryptUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'La contraseña no cumple con los requisitos de seguridad',
          details: passwordValidation.issues
        };
      }

      // Actualizar contraseña
      await User.updatePassword(userId, newPassword);

      logger.info('Contraseña de usuario restablecida exitosamente', {
        userId,
        companyId,
        resetBy
      });

      return { message: RESPONSE_MESSAGES.UPDATED };

    } catch (error) {
      logger.error('Error restableciendo contraseña de usuario', {
        userId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getUserStats(companyId) {
    try {
      logger.info('Obteniendo estadísticas de usuarios', { companyId });

      const stats = await User.getCompanyStats(companyId);

      logger.info('Estadísticas de usuarios obtenidas', {
        companyId,
        stats
      });

      return stats;

    } catch (error) {
      logger.error('Error obteniendo estadísticas de usuarios', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validar límites de plan para usuarios
   */
  async validateUserLimits(companyId) {
    try {
      const { canCreate, currentCount, limit } = await User.checkPlanLimits(companyId);
      
      return {
        canCreate,
        currentCount,
        limit,
        remaining: limit === -1 ? -1 : limit - currentCount
      };

    } catch (error) {
      logger.error('Error validando límites de usuarios', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new UserService();