/**
 * Servicio de Sale (Venta)
 * Sistema POS Multitenant
 * 
 * Lógica de negocio para ventas, integrado con productos, clientes, 
 * métodos de pago, puntos y gestión de inventario
 */

const SaleModel = require('../models/sale.model');
const ProductModel = require('../models/product.model');
const ClientModel = require('../models/client.model');
const PaymentMethodModel = require('../models/payment_method.model');
const PointsModel = require('../models/points.model');
const { executeQuery } = require('../config/database');
const { logger } = require('../middlewares/logger');

class SaleService {
  /**
   * Crear una nueva venta con validaciones completas
   * @param {Object} saleData - Datos de la venta
   * @param {string} companyId - ID de la empresa
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Venta creada
   */
  static async createSale(saleData, companyId, userId) {
    try {
      logger.info('Iniciando proceso de creación de venta:', {
        companyId,
        userId,
        itemsCount: saleData.items?.length || 0,
        total: saleData.total
      });

      // 1. Validar que el usuario pertenece a la empresa
      const [userResult] = await executeQuery(
        'SELECT id FROM users WHERE id = ? AND company_id = ?',
        [userId, companyId]
      );
      
      if (!userResult || userResult.length === 0) {
        throw new Error('Usuario no autorizado para esta empresa');
      }

      // 2. Validar cliente si se especifica
      if (saleData.client_id) {
        const client = await ClientModel.findById(saleData.client_id, companyId);
        if (!client) {
          throw new Error('Cliente no encontrado');
        }

        // Validar puntos disponibles si se van a redimir
        if (saleData.points_redeemed && saleData.points_redeemed > 0) {
          if (client.points_balance < saleData.points_redeemed) {
            throw new Error(`Cliente no tiene suficientes puntos. Disponibles: ${client.points_balance}, Solicitados: ${saleData.points_redeemed}`);
          }
        }
      }

      // 3. Validar productos y stock
      const productValidations = await this.validateProductsAndStock(saleData.items, companyId);
      if (!productValidations.valid) {
        throw new Error(productValidations.message);
      }

      // 4. Validar métodos de pago
      const paymentValidations = await this.validatePaymentMethods(saleData.payment_methods, companyId);
      if (!paymentValidations.valid) {
        throw new Error(paymentValidations.message);
      }

      // 5. Validar cálculos totales
      const calculationValidation = this.validateCalculations(saleData);
      if (!calculationValidation.valid) {
        throw new Error(calculationValidation.message);
      }

      // 6. Generar número de factura único
      const invoiceNumber = await this.generateInvoiceNumber(companyId);
      saleData.invoice_number = invoiceNumber;
      saleData.user_id = userId;

      // 7. Crear la venta
      const saleId = await SaleModel.create(saleData, companyId);

      // 8. Obtener la venta completa creada
      const createdSale = await SaleModel.findById(saleId, companyId);

      logger.info('Venta creada exitosamente:', {
        saleId,
        invoiceNumber,
        companyId,
        userId,
        total: saleData.total
      });

      return {
        success: true,
        sale: createdSale,
        message: 'Venta creada exitosamente'
      };

    } catch (error) {
      logger.error('Error en creación de venta:', {
        error: error.message,
        saleData: {
          ...saleData,
          items: `${saleData.items?.length || 0} items`
        },
        companyId,
        userId
      });
      
      throw error;
    }
  }

  /**
   * Validar productos y stock disponible
   * @param {Array} items - Items de la venta
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Resultado de validación
   */
  static async validateProductsAndStock(items, companyId) {
    try {
      const invalidItems = [];

      for (const item of items) {
        // Obtener producto
        const product = await ProductModel.findById(item.product_id, companyId);
        
        if (!product) {
          invalidItems.push({
            product_id: item.product_id,
            reason: 'Producto no encontrado'
          });
          continue;
        }

        // Verificar si está activo
        if (product.status !== 'active') {
          invalidItems.push({
            product_id: item.product_id,
            product_name: product.name,
            reason: 'Producto no está activo'
          });
          continue;
        }

        // Verificar stock disponible
        if (product.track_stock && product.stock < item.quantity) {
          invalidItems.push({
            product_id: item.product_id,
            product_name: product.name,
            reason: `Stock insuficiente. Disponible: ${product.stock}, Requerido: ${item.quantity}`
          });
          continue;
        }

        // Verificar precio mínimo
        if (product.min_price && item.unit_price < product.min_price) {
          invalidItems.push({
            product_id: item.product_id,
            product_name: product.name,
            reason: `Precio por debajo del mínimo. Mínimo: $${product.min_price}, Actual: $${item.unit_price}`
          });
        }
      }

      if (invalidItems.length > 0) {
        return {
          valid: false,
          message: 'Algunos productos no pasaron la validación',
          invalidItems
        };
      }

      return { valid: true };

    } catch (error) {
      logger.error('Error validando productos y stock:', error);
      return {
        valid: false,
        message: 'Error validando productos'
      };
    }
  }

  /**
   * Validar métodos de pago
   * @param {Array} paymentMethods - Métodos de pago
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Resultado de validación
   */
  static async validatePaymentMethods(paymentMethods, companyId) {
    try {
      if (!paymentMethods || paymentMethods.length === 0) {
        return {
          valid: false,
          message: 'Debe especificar al menos un método de pago'
        };
      }

      const invalidMethods = [];

      for (const payment of paymentMethods) {
        // Verificar que el método de pago existe y está activo
        const paymentMethod = await PaymentMethodModel.findById(payment.method_id, companyId);
        
        if (!paymentMethod) {
          invalidMethods.push({
            method_id: payment.method_id,
            reason: 'Método de pago no encontrado'
          });
          continue;
        }

        if (!paymentMethod.is_active) {
          invalidMethods.push({
            method_id: payment.method_id,
            method_name: paymentMethod.name,
            reason: 'Método de pago no está activo'
          });
        }
      }

      if (invalidMethods.length > 0) {
        return {
          valid: false,
          message: 'Algunos métodos de pago no son válidos',
          invalidMethods
        };
      }

      return { valid: true };

    } catch (error) {
      logger.error('Error validando métodos de pago:', error);
      return {
        valid: false,
        message: 'Error validando métodos de pago'
      };
    }
  }

  /**
   * Validar cálculos de la venta
   * @param {Object} saleData - Datos de la venta
   * @returns {Object} Resultado de validación
   */
  static validateCalculations(saleData) {
    try {
      // Calcular subtotal de items
      const calculatedSubtotal = saleData.items.reduce((sum, item) => {
        return sum + item.subtotal;
      }, 0);

      // Verificar que el subtotal coincide
      if (Math.abs(calculatedSubtotal - saleData.subtotal) > 0.01) {
        return {
          valid: false,
          message: `Subtotal incorrecto. Calculado: $${calculatedSubtotal.toFixed(2)}, Enviado: $${saleData.subtotal.toFixed(2)}`
        };
      }

      // Calcular total final
      const calculatedTotal = saleData.subtotal + 
                             (saleData.tax_amount || 0) + 
                             (saleData.delivery_fee || 0) - 
                             (saleData.discount_amount || 0) - 
                             (saleData.points_redeemed || 0);

      // Verificar que el total coincide
      if (Math.abs(calculatedTotal - saleData.total) > 0.01) {
        return {
          valid: false,
          message: `Total incorrecto. Calculado: $${calculatedTotal.toFixed(2)}, Enviado: $${saleData.total.toFixed(2)}`
        };
      }

      // Validar que los montos de pago sumen el total
      const totalPayments = saleData.payment_methods.reduce((sum, payment) => {
        return sum + payment.amount;
      }, 0);

      if (Math.abs(totalPayments - saleData.total) > 0.01) {
        return {
          valid: false,
          message: `Los pagos no suman el total. Total pagos: $${totalPayments.toFixed(2)}, Total venta: $${saleData.total.toFixed(2)}`
        };
      }

      // Validar subtotales de items
      for (const item of saleData.items) {
        const expectedSubtotal = (item.unit_price * item.quantity) - (item.discount_amount || 0);
        if (Math.abs(expectedSubtotal - item.subtotal) > 0.01) {
          return {
            valid: false,
            message: `Subtotal de item incorrecto. Producto: ${item.product_id}`
          };
        }
      }

      return { valid: true };

    } catch (error) {
      logger.error('Error validando cálculos:', error);
      return {
        valid: false,
        message: 'Error validando cálculos'
      };
    }
  }

  /**
   * Generar número de factura único
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<string>} Número de factura
   */
  static async generateInvoiceNumber(companyId) {
    try {
      // Obtener el último número de factura
      const [lastSale] = await executeQuery(`
        SELECT invoice_number 
        FROM sales 
        WHERE company_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [companyId]);

      let nextNumber = 1;

      if (lastSale && lastSale.length > 0) {
        const lastNumber = lastSale[0].invoice_number;
        // Extraer el número si sigue el formato FAC-XXXXXX
        const match = lastNumber.match(/FAC-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      // Generar nuevo número con padding
      const invoiceNumber = `FAC-${nextNumber.toString().padStart(6, '0')}`;

      // Verificar que no existe (por si hay concurrencia)
      const [existing] = await executeQuery(`
        SELECT id FROM sales WHERE invoice_number = ? AND company_id = ?
      `, [invoiceNumber, companyId]);

      if (existing && existing.length > 0) {
        // Si existe, generar uno con timestamp
        const timestamp = Date.now().toString().slice(-6);
        return `FAC-${timestamp}`;
      }

      return invoiceNumber;

    } catch (error) {
      logger.error('Error generando número de factura:', error);
      // Fallback: usar timestamp
      const timestamp = Date.now().toString().slice(-8);
      return `FAC-${timestamp}`;
    }
  }

  /**
   * Obtener venta por ID
   * @param {string} saleId - ID de la venta
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Venta encontrada
   */
  static async getSaleById(saleId, companyId) {
    try {
      const sale = await SaleModel.findById(saleId, companyId);
      
      if (!sale) {
        throw new Error('Venta no encontrada');
      }

      return {
        success: true,
        sale
      };

    } catch (error) {
      logger.error('Error obteniendo venta:', {
        error: error.message,
        saleId,
        companyId
      });
      throw error;
    }
  }

  /**
   * Obtener ventas con filtros
   * @param {Object} filters - Filtros de búsqueda
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Ventas con paginación
   */
  static async getSales(filters, companyId) {
    try {
      const result = await SaleModel.findAll(filters, companyId);

      return {
        success: true,
        ...result
      };

    } catch (error) {
      logger.error('Error obteniendo ventas:', {
        error: error.message,
        filters,
        companyId
      });
      throw error;
    }
  }

  /**
   * Cancelar una venta
   * @param {string} saleId - ID de la venta
   * @param {string} companyId - ID de la empresa
   * @param {string} reason - Razón de cancelación
   * @returns {Promise<Object>} Resultado de cancelación
   */
  static async cancelSale(saleId, companyId, reason) {
    try {
      // Verificar que la venta existe
      const sale = await SaleModel.findById(saleId, companyId);
      
      if (!sale) {
        throw new Error('Venta no encontrada');
      }

      if (sale.status === 'cancelled') {
        throw new Error('La venta ya está cancelada');
      }

      // Cancelar la venta
      const success = await SaleModel.cancel(saleId, companyId, reason);

      if (!success) {
        throw new Error('No se pudo cancelar la venta');
      }

      logger.info('Venta cancelada exitosamente:', {
        saleId,
        companyId,
        reason
      });

      return {
        success: true,
        message: 'Venta cancelada exitosamente'
      };

    } catch (error) {
      logger.error('Error cancelando venta:', {
        error: error.message,
        saleId,
        companyId
      });
      throw error;
    }
  }

  /**
   * Actualizar una venta
   * @param {string} saleId - ID de la venta
   * @param {Object} updateData - Datos a actualizar
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Resultado de actualización
   */
  static async updateSale(saleId, updateData, companyId) {
    try {
      // Verificar que la venta existe
      const sale = await SaleModel.findById(saleId, companyId);
      
      if (!sale) {
        throw new Error('Venta no encontrada');
      }

      if (sale.status === 'cancelled') {
        throw new Error('No se puede actualizar una venta cancelada');
      }

      // Actualizar la venta
      const success = await SaleModel.update(saleId, updateData, companyId);

      if (!success) {
        throw new Error('No se pudo actualizar la venta');
      }

      // Obtener la venta actualizada
      const updatedSale = await SaleModel.findById(saleId, companyId);

      logger.info('Venta actualizada exitosamente:', {
        saleId,
        companyId,
        updateData
      });

      return {
        success: true,
        sale: updatedSale,
        message: 'Venta actualizada exitosamente'
      };

    } catch (error) {
      logger.error('Error actualizando venta:', {
        error: error.message,
        saleId,
        updateData,
        companyId
      });
      throw error;
    }
  }

  /**
   * Obtener resumen de ventas
   * @param {string} companyId - ID de la empresa
   * @param {string} dateFrom - Fecha desde
   * @param {string} dateTo - Fecha hasta
   * @returns {Promise<Object>} Resumen de ventas
   */
  static async getSalesSummary(companyId, dateFrom, dateTo) {
    try {
      const summary = await SaleModel.getSalesSummary(companyId, dateFrom, dateTo);

      return {
        success: true,
        ...summary
      };

    } catch (error) {
      logger.error('Error obteniendo resumen de ventas:', {
        error: error.message,
        companyId,
        dateFrom,
        dateTo
      });
      throw error;
    }
  }

  /**
   * Obtener ventas por día
   * @param {string} companyId - ID de la empresa
   * @param {string} dateFrom - Fecha desde
   * @param {string} dateTo - Fecha hasta
   * @returns {Promise<Object>} Ventas por día
   */
  static async getSalesByDay(companyId, dateFrom, dateTo) {
    try {
      const salesByDay = await SaleModel.getSalesByDay(companyId, dateFrom, dateTo);

      return {
        success: true,
        sales_by_day: salesByDay
      };

    } catch (error) {
      logger.error('Error obteniendo ventas por día:', {
        error: error.message,
        companyId,
        dateFrom,
        dateTo
      });
      throw error;
    }
  }

  /**
   * Obtener productos más vendidos
   * @param {string} companyId - ID de la empresa
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Object>} Productos más vendidos
   */
  static async getTopSellingProducts(companyId, options = {}) {
    try {
      const products = await SaleModel.getTopSellingProducts(companyId, options);

      return {
        success: true,
        products
      };

    } catch (error) {
      logger.error('Error obteniendo productos más vendidos:', {
        error: error.message,
        companyId,
        options
      });
      throw error;
    }
  }

  /**
   * Obtener ventas por cliente
   * @param {string} clientId - ID del cliente
   * @param {string} companyId - ID de la empresa
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Object>} Ventas del cliente
   */
  static async getSalesByClient(clientId, companyId, options = {}) {
    try {
      const sales = await SaleModel.findByClient(clientId, companyId, options);

      return {
        success: true,
        sales
      };

    } catch (error) {
      logger.error('Error obteniendo ventas por cliente:', {
        error: error.message,
        clientId,
        companyId
      });
      throw error;
    }
  }
}

module.exports = SaleService;