/**
 * Utilidades para Bcrypt
 * Sistema POS Multitenant
 * 
 * Maneja el hash y verificación de contraseñas
 */

const bcrypt = require('bcrypt');
const { logger } = require('../config/database');

class BcryptUtils {
  /**
   * Hash de contraseña
   * @param {string} password - Contraseña en texto plano
   * @returns {Promise<string>} Contraseña hasheada
   */
  static async hashPassword(password) {
    try {
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      logger.error('Error hasheando contraseña:', { error: error.message });
      throw new Error('Error procesando contraseña');
    }
  }
  
  /**
   * Verificar contraseña
   * @param {string} password - Contraseña en texto plano
   * @param {string} hash - Hash almacenado
   * @returns {Promise<boolean>} True si coincide
   */
  static async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Error verificando contraseña:', { error: error.message });
      return false;
    }
  }
  
  /**
   * Generar salt
   * @param {number} rounds - Número de rounds (opcional)
   * @returns {Promise<string>} Salt generado
   */
  static async generateSalt(rounds = null) {
    try {
      const saltRounds = rounds || parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      return await bcrypt.genSalt(saltRounds);
    } catch (error) {
      logger.error('Error generando salt:', { error: error.message });
      throw new Error('Error generando salt');
    }
  }
  
  /**
   * Verificar fuerza de la contraseña
   * @param {string} password - Contraseña a verificar
   * @returns {Object} Resultado de la verificación
   */
  static checkPasswordStrength(password) {
    const result = {
      isValid: false,
      score: 0,
      requirements: {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSpecialChars: /[@$!%*?&]/.test(password)
      },
      feedback: []
    };
    
    // Calcular score basado en requisitos cumplidos
    result.score = Object.values(result.requirements).reduce((score, req) => {
      return score + (req ? 1 : 0);
    }, 0);
    
    // Verificar si cumple requisitos mínimos
    result.isValid = result.score >= 4;
    
    // Generar feedback
    if (!result.requirements.minLength) {
      result.feedback.push('La contraseña debe tener al menos 8 caracteres');
    }
    if (!result.requirements.hasUppercase) {
      result.feedback.push('Debe incluir al menos una letra mayúscula');
    }
    if (!result.requirements.hasLowercase) {
      result.feedback.push('Debe incluir al menos una letra minúscula');
    }
    if (!result.requirements.hasNumbers) {
      result.feedback.push('Debe incluir al menos un número');
    }
    if (!result.requirements.hasSpecialChars) {
      result.feedback.push('Debe incluir al menos un carácter especial (@$!%*?&)');
    }
    
    // Verificaciones adicionales de seguridad
    const commonPasswords = [
      'password', '123456', 'qwerty', 'abc123', 'password123',
      '12345678', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      result.isValid = false;
      result.feedback.push('No use contraseñas comunes');
    }
    
    // Verificar patrones repetitivos
    if (/(.)\1{2,}/.test(password)) {
      result.feedback.push('Evite caracteres repetitivos');
    }
    
    // Verificar secuencias
    if (/123|abc|qwe|asd|zxc/i.test(password)) {
      result.feedback.push('Evite secuencias de teclado obvias');
    }
    
    return result;
  }
  
  /**
   * Generar contraseña temporal segura
   * @param {number} length - Longitud de la contraseña
   * @returns {string} Contraseña temporal
   */
  static generateTempPassword(length = 12) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '@$!%*?&';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    
    // Asegurar que tenga al menos uno de cada tipo
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Completar el resto de la longitud
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Mezclar la contraseña
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
  
  /**
   * Verificar si un hash es válido para bcrypt
   * @param {string} hash - Hash a verificar
   * @returns {boolean} True si es un hash bcrypt válido
   */
  static isValidBcryptHash(hash) {
    try {
      // Un hash bcrypt válido tiene el formato $2a$rounds$salt.hash o similar
      const bcryptRegex = /^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9/.]{53}$/;
      return bcryptRegex.test(hash);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Obtener información del hash bcrypt
   * @param {string} hash - Hash de bcrypt
   * @returns {Object|null} Información del hash
   */
  static getHashInfo(hash) {
    try {
      if (!this.isValidBcryptHash(hash)) {
        return null;
      }
      
      const parts = hash.split('$');
      
      return {
        algorithm: parts[1], // 2a, 2b, 2y
        cost: parseInt(parts[2]), // número de rounds
        salt: parts[3]?.substring(0, 22), // primeros 22 chars del salt
        isValid: true
      };
    } catch (error) {
      logger.error('Error obteniendo información de hash:', { error: error.message });
      return null;
    }
  }
  
  /**
   * Verificar si un hash necesita ser actualizado (rehashed)
   * @param {string} hash - Hash actual
   * @returns {boolean} True si necesita actualización
   */
  static needsRehash(hash) {
    try {
      const currentRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashInfo = this.getHashInfo(hash);
      
      if (!hashInfo) {
        return true; // Hash inválido, necesita rehash
      }
      
      // Si los rounds actuales son diferentes, necesita rehash
      return hashInfo.cost !== currentRounds;
    } catch (error) {
      logger.error('Error verificando necesidad de rehash:', { error: error.message });
      return false;
    }
  }
}

module.exports = BcryptUtils;