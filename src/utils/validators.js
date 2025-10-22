/**
 * Utilidades de Validación
 * Sistema POS Multitenant
 */

const { logger } = require('../config/database');

class ValidationUtils {
  /**
   * Validar formato de email
   * @param {string} email - Email a validar
   * @returns {boolean} True si es válido
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Validar UUID v4
   * @param {string} uuid - UUID a validar
   * @returns {boolean} True si es válido
   */
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
  
  /**
   * Validar teléfono
   * @param {string} phone - Teléfono a validar
   * @returns {boolean} True si es válido
   */
  static isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{7,20}$/;
    return phoneRegex.test(phone);
  }
  
  /**
   * Validar documento de identidad
   * @param {string} document - Documento a validar
   * @returns {boolean} True si es válido
   */
  static isValidDocument(document) {
    return /^[A-Za-z0-9]{5,20}$/.test(document);
  }
  
  /**
   * Validar SKU de producto
   * @param {string} sku - SKU a validar
   * @returns {boolean} True si es válido
   */
  static isValidSKU(sku) {
    return /^[A-Z0-9\-_]{1,50}$/i.test(sku);
  }
  
  /**
   * Validar precio/dinero
   * @param {number} amount - Cantidad a validar
   * @returns {boolean} True si es válido
   */
  static isValidMoney(amount) {
    return typeof amount === 'number' && amount >= 0 && amount <= 999999999.99;
  }
  
  /**
   * Validar cantidad/stock
   * @param {number} quantity - Cantidad a validar
   * @returns {boolean} True si es válido
   */
  static isValidQuantity(quantity) {
    return Number.isInteger(quantity) && quantity >= 0 && quantity <= 999999;
  }
  
  /**
   * Limpiar y formatear string
   * @param {string} str - String a limpiar
   * @returns {string} String limpio
   */
  static sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/\s+/g, ' ');
  }
  
  /**
   * Validar fecha ISO
   * @param {string} dateStr - Fecha en formato ISO
   * @returns {boolean} True si es válida
   */
  static isValidISODate(dateStr) {
    try {
      const date = new Date(dateStr);
      return date instanceof Date && !isNaN(date) && date.toISOString() === dateStr;
    } catch {
      return false;
    }
  }
  
  /**
   * Validar rango de fechas
   * @param {string} fromDate - Fecha desde
   * @param {string} toDate - Fecha hasta
   * @returns {Object} Resultado de validación
   */
  static validateDateRange(fromDate, toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return { isValid: false, error: 'Fechas inválidas' };
    }
    
    if (from > to) {
      return { isValid: false, error: 'La fecha desde debe ser anterior a la fecha hasta' };
    }
    
    const maxRange = 365; // días
    const daysDiff = (to - from) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > maxRange) {
      return { isValid: false, error: `El rango máximo es ${maxRange} días` };
    }
    
    return { isValid: true };
  }
}

module.exports = ValidationUtils;