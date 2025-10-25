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
   * Inicio de sesión con cookies seguras
   */
  async login(email, password, req, res) {
    console.log('🏭 [AuthService.login] === INICIO AUTHSERVICE LOGIN ===');
    console.log('🏭 [AuthService.login] Parámetros recibidos:', {
      email,
      password: '***',
      hasReq: !!req,
      hasRes: !!res,
      ip: req?.ip
    });

    try {
      logger.info('Intento de inicio de sesión', { email });

      console.log('🏭 [AuthService.login] Buscando usuario por email...');
      // Buscar usuario
      const user = await User.findByEmailWithPassword(email);
      
      if (!user) {
        console.log('❌ [AuthService.login] Usuario no encontrado para email:', email);
        throw {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Credenciales inválidas'
        };
      }

      console.log('✅ [AuthService.login] Usuario encontrado:', {
        id: user.id,
        name: user.name,
        email: user.email,
        is_active: user.is_active,
        company_id: user.company_id
      });

      console.log('🏭 [AuthService.login] Verificando contraseña...');
      // Verificar contraseña
      const isValidPassword = await bcryptUtils.verifyPassword(password, user.password);
      
      if (!isValidPassword) {
        console.log('❌ [AuthService.login] Contraseña incorrecta');
        throw {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Credenciales inválidas'
        };
      }

      console.log('✅ [AuthService.login] Contraseña válida');

      // Verificar que el usuario esté activo
      if (!user.is_active) {
        console.log('❌ [AuthService.login] Usuario inactivo');
        throw {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Usuario inactivo'
        };
      }

      console.log('🏭 [AuthService.login] Buscando información de empresa...');
      // Obtener información de la empresa
      const company = await Company.findById(user.company_id);
      
      if (!company || !company.is_active) {
        console.log('❌ [AuthService.login] Empresa no encontrada o inactiva:', {
          company_id: user.company_id,
          found: !!company,
          is_active: company?.is_active
        });
        throw {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Empresa inactiva'
        };
      }

      console.log('✅ [AuthService.login] Empresa válida:', {
        id: company.id,
        name: company.name,
        is_active: company.is_active
      });

      console.log('🏭 [AuthService.login] Generando tokens JWT...');
      // Generar tokens
      const payload = {
        user_id: user.id, // Cambiado para consistencia con middleware
        company_id: user.company_id,
        role: user.role,
        email: user.email,
        name: user.name
      };

      console.log('🏭 [AuthService.login] Payload para JWT:', payload);
      console.log('🏭 [AuthService.login] Verificando user.id específicamente:', {
        'user.id': user.id,
        'typeof user.id': typeof user.id,
        'user.id === undefined': user.id === undefined,
        'user.id === null': user.id === null
      });

      // Verificar que no haya campos undefined en el payload
      const undefinedFields = Object.entries(payload).filter(([key, value]) => value === undefined);
      if (undefinedFields.length > 0) {
        console.log('❌ [AuthService.login] Campos undefined en payload:', undefinedFields);
        throw new Error(`Campos undefined en payload: ${undefinedFields.map(([key]) => key).join(', ')}`);
      }

      const { accessToken, refreshToken } = jwtUtils.generateTokenPair(payload);
      
      console.log('✅ [AuthService.login] Tokens generados:', {
        accessToken: accessToken.substring(0, 20) + '...',
        refreshToken: refreshToken.substring(0, 20) + '...'
      });

      // Configurar cookies seguras
      const cookieOptions = {
        httpOnly: true, // No accesible desde JavaScript
        secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
        sameSite: 'strict', // Protección CSRF
        domain: process.env.COOKIE_DOMAIN || undefined, // Dominio específico
        path: '/' // Disponible para toda la aplicación
      };

      console.log('🏭 [AuthService.login] Configurando cookies con opciones:', cookieOptions);

      // Configurar refresh token como httpOnly cookie (7 días)
      res.cookie('refresh_token', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
      });

      // Access token con expiración más corta (15 minutos)
      // También como 'token' para compatibilidad con tu código
      res.cookie('access_token', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutos
      });

      res.cookie('token', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutos - compatible con tu código
      });

      console.log('✅ [AuthService.login] Cookies configuradas:', {
        refresh_token: 'Set (7 días)',
        access_token: 'Set (15 min)',
        token: 'Set (15 min) - compatibilidad'
      });

      // Actualizar último acceso
      console.log('🏭 [AuthService.login] Actualizando último login...');
      await User.updateLastLogin(user.id, user.company_id);

      logger.info('Inicio de sesión exitoso con cookies seguras', {
        userId: user.id,
        companyId: user.company_id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      const result = {
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
        expires_in: 15 * 60 // 15 minutos para el access token
      };

      console.log('✅ [AuthService.login] Resultado final:', result);
      console.log('🏭 [AuthService.login] === FIN AUTHSERVICE LOGIN EXITOSO ===');

      return result;

    } catch (error) {
      console.log('❌ [AuthService.login] ERROR EN AUTHSERVICE:', {
        message: error.message,
        code: error.code,
        stack: error.stack?.split('\n')[0]
      });

      logger.error('Error en inicio de sesión', { 
        email, 
        error: error.message 
      });
      
      console.log('🏭 [AuthService.login] === FIN AUTHSERVICE LOGIN CON ERROR ===');
      throw error;
    }
  }

  /**
   * Renovar token de acceso usando cookies
   */
  async refreshToken(req, res) {
    try {
      // Obtener refresh token de las cookies
      const refreshToken = req.cookies?.refresh_token;
      
      if (!refreshToken) {
        throw {
          code: ERROR_CODES.TOKEN_INVALID,
          message: 'Refresh token no encontrado'
        };
      }

      // Verificar refresh token
      const payload = jwtUtils.verifyRefreshToken(refreshToken);
      
      // Verificar que el usuario sigue activo
      const user = await User.findById(payload.user_id);
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
        user_id: user.id,
        company_id: user.company_id,
        role: user.role,
        email: user.email,
        name: user.name
      };

      const accessToken = jwtUtils.generateAccessToken(newPayload);

      // Configurar cookie para el nuevo access token
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: '/',
        maxAge: 15 * 60 * 1000 // 15 minutos
      };

      res.cookie('access_token', accessToken, cookieOptions);

      logger.info('Token renovado exitosamente', {
        userId: user.id,
        companyId: user.company_id,
        ip: req.ip
      });

      return { 
        success: true,
        expires_in: 15 * 60 // 15 minutos
      };

    } catch (error) {
      logger.error('Error renovando token', { error: error.message });
      throw {
        code: ERROR_CODES.TOKEN_INVALID,
        message: 'Token inválido'
      };
    }
  }

  /**
   * Cerrar sesión (limpiar cookies)
   */
  async logout(req, res) {
    try {
      const userId = req.user?.user_id;
      
      // Configurar opciones para limpiar cookies
      const clearCookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: '/'
      };

      // Limpiar ambas cookies
      res.clearCookie('access_token', clearCookieOptions);
      res.clearCookie('refresh_token', clearCookieOptions);

      logger.info('Logout exitoso', {
        userId: userId || 'unknown',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return { 
        success: true, 
        message: 'Sesión cerrada exitosamente' 
      };

    } catch (error) {
      logger.error('Error en logout', { error: error.message });
      throw error;
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