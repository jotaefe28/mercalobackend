/**
 * Servicio de Autenticación
 * Sistema POS Multitenant
 */

const bcryptUtils = require('../utils/bcrypt');
const jwtUtils = require('../utils/jwt');
const User = require('../models/User');
const Company = require('../models/Company');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../utils/constants');

class AuthService {
  /**
   * Registro de empresa con usuario administrador
   */
  async register(companyData, userData) {
    try {
      logger.info('Iniciando registro de empresa', { 
        company: companyData.name,
        userEmail: userData.email 
      });

      // Verificar que no exista la empresa
      const existingCompany = await Company.findByTaxId(companyData.tax_id);
      if (existingCompany) {
        throw {
          code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
          message: 'La empresa ya está registrada'
        };
      }

      // Verificar que no exista el email de usuario
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw {
          code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
          message: 'El email ya está registrado'
        };
      }

      // Crear empresa
      const company = await Company.create(companyData);
      
      // Crear usuario administrador
      const adminUserData = {
        ...userData,
        role: 'ADMIN'
      };
      
      const user = await User.create(adminUserData, company.id);

      logger.info('Registro completado exitosamente', {
        companyId: company.id,
        userId: user.id
      });

      return {
        company: {
          id: company.id,
          name: company.name,
          plan: company.plan
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      };

    } catch (error) {
      logger.error('Error en registro', { error: error.message });
      throw error;
    }
  }

  /**
   * Inicio de sesión
   */
  async login(email, password) {
    try {
      logger.info('Intento de inicio de sesión', { email });

      // Buscar usuario
      const user = await User.findByEmailWithPassword(email);
      if (!user) {
        throw {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Credenciales inválidas'
        };
      }

      // Verificar contraseña
      const isValidPassword = await bcryptUtils.verifyPassword(password, user.password);
      if (!isValidPassword) {
        throw {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Credenciales inválidas'
        };
      }

      // Verificar que el usuario esté activo
      if (!user.is_active) {
        throw {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Usuario inactivo'
        };
      }

      // Obtener información de la empresa
      const company = await Company.findById(user.company_id);
      if (!company || !company.is_active) {
        throw {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Empresa inactiva'
        };
      }

      // Generar tokens
      const payload = {
        userId: user.id,
        companyId: user.company_id,
        role: user.role,
        email: user.email
      };

      const { accessToken, refreshToken } = jwtUtils.generateTokenPair(payload);

      // Actualizar último acceso
      await User.updateLastLogin(user.id, user.company_id);

      logger.info('Inicio de sesión exitoso', {
        userId: user.id,
        companyId: user.company_id
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company_id: user.company_id
        },
        company: {
          id: company.id,
          name: company.name,
          plan: company.plan
        },
        accessToken,
        refreshToken
      };

    } catch (error) {
      logger.error('Error en inicio de sesión', { 
        email, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Renovar token de acceso
   */
  async refreshToken(refreshToken) {
    try {
      // Verificar refresh token
      const payload = jwtUtils.verifyRefreshToken(refreshToken);
      
      // Verificar que el usuario sigue activo
      const user = await User.findById(payload.userId);
      if (!user || !user.is_active) {
        throw {
          code: ERROR_CODES.TOKEN_INVALID,
          message: 'Token inválido'
        };
      }

      // Verificar que la empresa sigue activa
      const company = await Company.findById(user.company_id);
      if (!company || !company.is_active) {
        throw {
          code: ERROR_CODES.TOKEN_INVALID,
          message: 'Token inválido'
        };
      }

      // Generar nuevo access token
      const newPayload = {
        userId: user.id,
        companyId: user.company_id,
        role: user.role,
        email: user.email
      };

      const accessToken = jwtUtils.generateAccessToken(newPayload);

      logger.info('Token renovado exitosamente', {
        userId: user.id,
        companyId: user.company_id
      });

      return { accessToken };

    } catch (error) {
      logger.error('Error renovando token', { error: error.message });
      throw {
        code: ERROR_CODES.TOKEN_INVALID,
        message: 'Token inválido'
      };
    }
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      logger.info('Cambio de contraseña solicitado', { userId });

      // Buscar usuario
      const user = await User.findById(userId);
      if (!user) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Usuario no encontrado'
        };
      }

      // Verificar contraseña actual
      const isValidPassword = await bcryptUtils.verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        throw {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Contraseña actual incorrecta'
        };
      }

      // Validar nueva contraseña
      const passwordValidation = bcryptUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'La nueva contraseña no cumple con los requisitos de seguridad',
          details: passwordValidation.issues
        };
      }

      // Actualizar contraseña
      await User.updatePassword(userId, newPassword);

      logger.info('Contraseña cambiada exitosamente', { userId });

      return { message: RESPONSE_MESSAGES.UPDATED };

    } catch (error) {
      logger.error('Error cambiando contraseña', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Solicitar restablecimiento de contraseña
   */
  async requestPasswordReset(email) {
    try {
      logger.info('Restablecimiento de contraseña solicitado', { email });

      // Buscar usuario
      const user = await User.findByEmail(email);
      if (!user) {
        // Por seguridad, no revelamos si el email existe
        logger.warn('Intento de reset con email inexistente', { email });
        return { message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' };
      }

      // Generar token de reset
      const resetToken = jwtUtils.generatePasswordResetToken({
        userId: user.id,
        email: user.email
      });

      // Aquí se enviaría el email con el token
      // Por ahora solo lo logueamos
      logger.info('Token de reset generado', {
        userId: user.id,
        email: user.email,
        resetToken: resetToken.substring(0, 20) + '...'
      });

      return { 
        message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña',
        // En desarrollo, retornamos el token para testing
        ...(process.env.NODE_ENV === 'development' && { resetToken })
      };

    } catch (error) {
      logger.error('Error en solicitud de reset', {
        email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Restablecer contraseña con token
   */
  async resetPassword(resetToken, newPassword) {
    try {
      logger.info('Restablecimiento de contraseña con token');

      // Verificar token de reset
      const payload = jwtUtils.verifyPasswordResetToken(resetToken);

      // Verificar que el usuario existe
      const user = await User.findById(payload.userId);
      if (!user) {
        throw {
          code: ERROR_CODES.TOKEN_INVALID,
          message: 'Token inválido'
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
      await User.updatePassword(user.id, newPassword);

      logger.info('Contraseña restablecida exitosamente', {
        userId: user.id
      });

      return { message: RESPONSE_MESSAGES.UPDATED };

    } catch (error) {
      logger.error('Error restableciendo contraseña', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validar sesión actual
   */
  async validateSession(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.is_active) {
        throw {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Sesión inválida'
        };
      }

      const company = await Company.findById(user.company_id);
      if (!company || !company.is_active) {
        throw {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Sesión inválida'
        };
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company_id: user.company_id
        },
        company: {
          id: company.id,
          name: company.name,
          plan: company.plan
        }
      };

    } catch (error) {
      logger.error('Error validando sesión', {
        userId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new AuthService();