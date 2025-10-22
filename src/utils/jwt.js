/**
 * Utilidades JWT
 * Sistema POS Multitenant
 * 
 * Maneja la creación, verificación y gestión de tokens JWT
 */

const jwt = require('jsonwebtoken');
const { logger } = require('../config/database');

class JWTUtils {
  /**
   * Generar token de acceso
   * @param {Object} payload - Datos del usuario para el token
   * @returns {string} Token JWT
   */
  static generateAccessToken(payload) {
    try {
      const tokenPayload = {
        userId: payload.id,
        company_id: payload.company_id,
        role: payload.role,
        email: payload.email,
        name: payload.name
      };
      
      return jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        { 
          expiresIn: process.env.JWT_EXPIRATION || '24h',
          issuer: 'pos-multitenant-api',
          audience: 'pos-clients'
        }
      );
    } catch (error) {
      logger.error('Error generando access token:', { error: error.message, payload });
      throw new Error('Error generando token de acceso');
    }
  }
  
  /**
   * Generar refresh token
   * @param {Object} payload - Datos del usuario para el token
   * @returns {string} Refresh token JWT
   */
  static generateRefreshToken(payload) {
    try {
      const tokenPayload = {
        userId: payload.id,
        company_id: payload.company_id,
        tokenType: 'refresh'
      };
      
      return jwt.sign(
        tokenPayload,
        process.env.REFRESH_TOKEN_SECRET,
        { 
          expiresIn: '7d', // Refresh token válido por 7 días
          issuer: 'pos-multitenant-api',
          audience: 'pos-clients'
        }
      );
    } catch (error) {
      logger.error('Error generando refresh token:', { error: error.message, payload });
      throw new Error('Error generando refresh token');
    }
  }
  
  /**
   * Verificar token de acceso
   * @param {string} token - Token a verificar
   * @returns {Object} Payload decodificado
   */
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      logger.warn('Token de acceso inválido:', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Verificar refresh token
   * @param {string} token - Refresh token a verificar
   * @returns {Object} Payload decodificado
   */
  static verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
      
      if (decoded.tokenType !== 'refresh') {
        throw new Error('Token type mismatch');
      }
      
      return decoded;
    } catch (error) {
      logger.warn('Refresh token inválido:', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Decodificar token sin verificar (para debugging)
   * @param {string} token - Token a decodificar
   * @returns {Object} Payload decodificado
   */
  static decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.error('Error decodificando token:', { error: error.message });
      return null;
    }
  }
  
  /**
   * Verificar si un token está próximo a expirar
   * @param {string} token - Token a verificar
   * @param {number} minutesThreshold - Minutos antes de expiración para considerar "próximo"
   * @returns {boolean} True si está próximo a expirar
   */
  static isTokenExpiringSoon(token, minutesThreshold = 60) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.payload.exp) return false;
      
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = decoded.payload.exp;
      const timeUntilExpiration = expiresAt - now;
      
      return timeUntilExpiration < (minutesThreshold * 60);
    } catch (error) {
      logger.error('Error verificando expiración de token:', { error: error.message });
      return true; // Asumir que expira pronto si hay error
    }
  }
  
  /**
   * Extraer información básica del token
   * @param {string} token - Token a analizar
   * @returns {Object|null} Información básica del token
   */
  static getTokenInfo(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded) return null;
      
      const payload = decoded.payload;
      
      return {
        userId: payload.userId,
        company_id: payload.company_id,
        role: payload.role,
        email: payload.email,
        name: payload.name,
        issuedAt: new Date(payload.iat * 1000),
        expiresAt: new Date(payload.exp * 1000),
        issuer: payload.iss,
        audience: payload.aud
      };
    } catch (error) {
      logger.error('Error obteniendo información de token:', { error: error.message });
      return null;
    }
  }
  
  /**
   * Configurar opciones de cookies para tokens
   * @param {boolean} isProduction - Si está en producción
   * @returns {Object} Opciones de cookies
   */
  static getCookieOptions(isProduction = false) {
    return {
      httpOnly: true, // Prevenir acceso desde JavaScript
      secure: isProduction, // Solo HTTPS en producción
      sameSite: 'strict', // Prevenir CSRF
      maxAge: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
      path: '/'
    };
  }
  
  /**
   * Configurar opciones de cookies para refresh tokens
   * @param {boolean} isProduction - Si está en producción
   * @returns {Object} Opciones de cookies para refresh token
   */
  static getRefreshCookieOptions(isProduction = false) {
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/api/auth' // Solo disponible en rutas de auth
    };
  }
  
  /**
   * Limpiar cookies de autenticación
   * @param {Object} res - Response object de Express
   */
  static clearAuthCookies(res) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    };
    
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', { ...cookieOptions, path: '/api/auth' });
  }
  
  /**
   * Establecer cookies de autenticación
   * @param {Object} res - Response object de Express
   * @param {string} accessToken - Token de acceso
   * @param {string} refreshToken - Refresh token
   */
  static setAuthCookies(res, accessToken, refreshToken) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('accessToken', accessToken, this.getCookieOptions(isProduction));
    res.cookie('refreshToken', refreshToken, this.getRefreshCookieOptions(isProduction));
  }
  
  /**
   * Generar par de tokens (acceso + refresh)
   * @param {Object} user - Datos del usuario
   * @returns {Object} Par de tokens
   */
  static generateTokenPair(user) {
    try {
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);
      
      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_EXPIRATION || '24h'
      };
    } catch (error) {
      logger.error('Error generando par de tokens:', { 
        error: error.message, 
        userId: user.id 
      });
      throw new Error('Error generando tokens de autenticación');
    }
  }
}

module.exports = JWTUtils;