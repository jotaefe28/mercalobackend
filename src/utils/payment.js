/**
 * Utilidades para Pagos
 * Sistema POS Multitenant
 */

const { logger } = require('../config/database');

class PaymentUtils {
  /**
   * Validar métodos de pago de una venta
   * @param {Array} paymentMethods - Array de métodos de pago
   * @param {number} totalAmount - Total de la venta
   * @returns {Object} Resultado de validación
   */
  static validatePaymentMethods(paymentMethods, totalAmount) {
    try {
      if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) {
        return {
          isValid: false,
          error: 'Debe especificar al menos un método de pago'
        };
      }
      
      // Validar cada método de pago
      let totalPaid = 0;
      const errors = [];
      
      paymentMethods.forEach((payment, index) => {
        if (!payment.method_id) {
          errors.push(`Método de pago ${index + 1}: ID del método requerido`);
        }
        
        if (!payment.amount || payment.amount <= 0) {
          errors.push(`Método de pago ${index + 1}: Monto debe ser mayor a 0`);
        }
        
        totalPaid += payment.amount || 0;
      });
      
      if (errors.length > 0) {
        return {
          isValid: false,
          error: 'Errores en métodos de pago',
          details: errors
        };
      }
      
      // Verificar que el total pagado coincida con el total de la venta
      const difference = Math.abs(totalPaid - totalAmount);
      if (difference > 0.01) { // Tolerancia de 1 centavo
        return {
          isValid: false,
          error: `El total pagado ($${totalPaid}) no coincide con el total de la venta ($${totalAmount})`
        };
      }
      
      return {
        isValid: true,
        totalPaid,
        paymentCount: paymentMethods.length
      };
    } catch (error) {
      logger.error('Error validando métodos de pago:', {
        error: error.message,
        paymentMethods,
        totalAmount
      });
      
      return {
        isValid: false,
        error: 'Error interno validando métodos de pago'
      };
    }
  }
  
  /**
   * Calcular cambio para pago en efectivo
   * @param {number} amountPaid - Monto pagado
   * @param {number} totalDue - Total a pagar
   * @returns {Object} Información del cambio
   */
  static calculateChange(amountPaid, totalDue) {
    try {
      const change = amountPaid - totalDue;
      
      return {
        change: Math.max(0, change),
        isExact: Math.abs(change) < 0.01,
        isOverpaid: change > 0.01,
        isUnderpaid: change < -0.01
      };
    } catch (error) {
      logger.error('Error calculando cambio:', {
        error: error.message,
        amountPaid,
        totalDue
      });
      
      return {
        change: 0,
        isExact: false,
        isOverpaid: false,
        isUnderpaid: true
      };
    }
  }
  
  /**
   * Formatear monto de dinero
   * @param {number} amount - Monto a formatear
   * @param {string} currency - Código de moneda
   * @returns {string} Monto formateado
   */
  static formatMoney(amount, currency = 'COP') {
    try {
      const formatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      return formatter.format(amount);
    } catch (error) {
      // Fallback si hay error con Intl
      return `$${amount.toFixed(2)}`;
    }
  }
  
  /**
   * Calcular impuestos
   * @param {number} subtotal - Subtotal antes de impuestos
   * @param {number} taxRate - Tasa de impuesto (ej: 0.19 para 19%)
   * @returns {Object} Cálculo de impuestos
   */
  static calculateTax(subtotal, taxRate = 0.19) {
    try {
      const tax = subtotal * taxRate;
      const total = subtotal + tax;
      
      return {
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100,
        taxRate
      };
    } catch (error) {
      logger.error('Error calculando impuestos:', {
        error: error.message,
        subtotal,
        taxRate
      });
      
      return {
        subtotal,
        tax: 0,
        total: subtotal,
        taxRate: 0
      };
    }
  }
  
  /**
   * Validar referencia de pago
   * @param {string} reference - Referencia del pago
   * @param {string} channel - Canal de pago
   * @returns {boolean} True si es válida
   */
  static isValidPaymentReference(reference, channel) {
    if (!reference) return true; // Referencia es opcional
    
    switch (channel.toLowerCase()) {
      case 'card':
        // Para tarjetas, validar que sea alfanumérico y tenga longitud apropiada
        return /^[A-Za-z0-9]{4,20}$/.test(reference);
      
      case 'transfer':
        // Para transferencias, permitir más caracteres
        return /^[A-Za-z0-9\-_]{4,50}$/.test(reference);
      
      case 'qr':
        // Para QR, formato específico
        return /^[A-Za-z0-9]{6,30}$/.test(reference);
      
      case 'cash':
        // Efectivo normalmente no tiene referencia
        return !reference || reference.length === 0;
      
      default:
        // Por defecto, cualquier string alfanumérico
        return /^[A-Za-z0-9\-_]{1,50}$/.test(reference);
    }
  }
  
  /**
   * Generar resumen de métodos de pago
   * @param {Array} paymentMethods - Métodos de pago
   * @returns {Object} Resumen
   */
  static generatePaymentSummary(paymentMethods) {
    try {
      const summary = {
        totalMethods: paymentMethods.length,
        totalAmount: 0,
        byChannel: {},
        hasMultiplePayments: paymentMethods.length > 1
      };
      
      paymentMethods.forEach(payment => {
        summary.totalAmount += payment.amount;
        
        if (!summary.byChannel[payment.channel]) {
          summary.byChannel[payment.channel] = {
            count: 0,
            amount: 0,
            methods: []
          };
        }
        
        summary.byChannel[payment.channel].count++;
        summary.byChannel[payment.channel].amount += payment.amount;
        summary.byChannel[payment.channel].methods.push({
          name: payment.name,
          amount: payment.amount,
          reference: payment.reference
        });
      });
      
      return summary;
    } catch (error) {
      logger.error('Error generando resumen de pagos:', {
        error: error.message,
        paymentMethods
      });
      
      return {
        totalMethods: 0,
        totalAmount: 0,
        byChannel: {},
        hasMultiplePayments: false
      };
    }
  }
  
  /**
   * Redondear monto a centavos
   * @param {number} amount - Monto a redondear
   * @returns {number} Monto redondeado
   */
  static roundToCents(amount) {
    return Math.round(amount * 100) / 100;
  }
  
  /**
   * Validar que un monto sea positivo y tenga máximo 2 decimales
   * @param {number} amount - Monto a validar
   * @returns {boolean} True si es válido
   */
  static isValidAmount(amount) {
    if (typeof amount !== 'number' || amount < 0) {
      return false;
    }
    
    // Verificar que tenga máximo 2 decimales
    const decimals = (amount.toString().split('.')[1] || '').length;
    return decimals <= 2;
  }
}

module.exports = PaymentUtils;