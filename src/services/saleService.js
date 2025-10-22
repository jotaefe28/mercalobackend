/**
 * Servicio de Ventas
 * Sistema POS Multitenant
 */

const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Client = require('../models/Client');
const Points = require('../models/Points');
const productService = require('./productService');
const pointsService = require('./pointsService');
const paymentUtils = require('../utils/payment');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES, SALE_STATUS, POINTS_REASONS } = require('../utils/constants');

class SaleService {
  /**
   * Procesar nueva venta
   */
  async processSale(saleData, companyId, userId) {
    try {
      logger.info('Procesando nueva venta', {
        companyId,
        userId,
        total: saleData.total,
        itemsCount: saleData.items?.length || 0
      });

      // Validar estructura básica
      if (!saleData.items || saleData.items.length === 0) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'La venta debe incluir al menos un producto'
        };
      }

      // Validar disponibilidad de productos
      const productValidation = await productService.validateProductsAvailability(
        saleData.items,
        companyId
      );

      const invalidProducts = productValidation.filter(p => !p.valid);
      if (invalidProducts.length > 0) {
        throw {
          code: ERROR_CODES.INSUFFICIENT_STOCK,
          message: 'Algunos productos no están disponibles',
          details: invalidProducts
        };
      }

      // Calcular totales
      const calculatedTotals = this.calculateTotals(saleData.items, productValidation);

      // Validar cliente si hay uno
      let client = null;
      if (saleData.client_id) {
        client = await Client.findByIdAndCompany(saleData.client_id, companyId);
        if (!client) {
          throw {
            code: ERROR_CODES.RESOURCE_NOT_FOUND,
            message: 'Cliente no encontrado'
          };
        }
      }

      // Procesar redención de puntos si aplica
      let pointsRedeemed = 0;
      if (saleData.points_to_redeem && saleData.points_to_redeem > 0) {
        if (!client) {
          throw {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Se requiere un cliente para redimir puntos'
          };
        }

        const redemptionResult = await pointsService.validateRedemption(
          client.id,
          saleData.points_to_redeem,
          companyId
        );

        if (!redemptionResult.valid) {
          throw {
            code: ERROR_CODES.INSUFFICIENT_POINTS,
            message: redemptionResult.message
          };
        }

        pointsRedeemed = saleData.points_to_redeem;
      }

      // Validar pagos
      const paymentValidation = paymentUtils.validatePayments(
        saleData.payments,
        calculatedTotals.final_total - pointsRedeemed
      );

      if (!paymentValidation.valid) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: paymentValidation.message,
          details: paymentValidation.details
        };
      }

      // Preparar datos de la venta
      const saleToCreate = {
        company_id: companyId,
        user_id: userId,
        client_id: saleData.client_id || null,
        invoice_number: await this.generateInvoiceNumber(companyId),
        subtotal: calculatedTotals.subtotal,
        tax_amount: calculatedTotals.tax_amount,
        discount_amount: saleData.discount_amount || 0,
        points_redeemed: pointsRedeemed,
        total: calculatedTotals.final_total - pointsRedeemed,
        status: SALE_STATUS.COMPLETED,
        delivery_type: saleData.delivery_type,
        delivery_address: saleData.delivery_address || null,
        notes: saleData.notes || null,
        items: saleData.items,
        payments: saleData.payments
      };

      // Crear la venta usando stored procedure
      const sale = await Sale.createWithTransaction(saleToCreate);

      // Actualizar stock de productos
      for (const item of saleData.items) {
        await productService.updateStock(
          item.product_id,
          item.quantity,
          'OUT',
          `Venta #${sale.invoice_number}`,
          companyId,
          userId
        );
      }

      // Procesar redención de puntos
      if (pointsRedeemed > 0) {
        await pointsService.redeemPoints(
          client.id,
          pointsRedeemed,
          companyId,
          `Venta #${sale.invoice_number}`
        );
      }

      // Agregar puntos por compra (si hay cliente)
      if (client) {
        const pointsToAdd = Math.floor(calculatedTotals.final_total);
        if (pointsToAdd > 0) {
          await pointsService.addPoints(
            client.id,
            pointsToAdd,
            companyId,
            `Venta #${sale.invoice_number}`
          );
        }
      }

      logger.info('Venta procesada exitosamente', {
        saleId: sale.id,
        invoiceNumber: sale.invoice_number,
        total: sale.total,
        companyId
      });

      return sale;

    } catch (error) {
      logger.error('Error procesando venta', {
        companyId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener venta por ID
   */
  async getSaleById(saleId, companyId) {
    try {
      const sale = await Sale.findByIdAndCompany(saleId, companyId);
      if (!sale) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Venta no encontrada'
        };
      }

      return sale;

    } catch (error) {
      logger.error('Error obteniendo venta', {
        saleId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Listar ventas
   */
  async getSales(companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        dateFrom = null,
        dateTo = null,
        status = null,
        clientId = null,
        userId = null,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      logger.info('Listando ventas', {
        companyId,
        page,
        limit,
        dateFrom,
        dateTo,
        status,
        clientId,
        userId
      });

      const filters = { company_id: companyId };
      
      if (status) filters.status = status;
      if (clientId) filters.client_id = clientId;
      if (userId) filters.user_id = userId;

      const result = await Sale.findAll(filters, {
        page,
        limit,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      });

      logger.info('Ventas listadas exitosamente', {
        companyId,
        total: result.total,
        returned: result.data.length
      });

      return result;

    } catch (error) {
      logger.error('Error listando ventas', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Anular venta
   */
  async voidSale(saleId, reason, companyId, userId) {
    try {
      logger.info('Anulando venta', {
        saleId,
        reason,
        companyId,
        userId
      });

      // Obtener la venta
      const sale = await Sale.findByIdAndCompany(saleId, companyId);
      if (!sale) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Venta no encontrada'
        };
      }

      if (sale.status === SALE_STATUS.VOID) {
        throw {
          code: ERROR_CODES.BUSINESS_RULE_VIOLATION,
          message: 'La venta ya está anulada'
        };
      }

      // Anular la venta
      const voidedSale = await Sale.voidSale(saleId, reason, userId);

      // Restaurar stock de productos
      for (const item of sale.items) {
        await productService.updateStock(
          item.product_id,
          item.quantity,
          'IN',
          `Anulación venta #${sale.invoice_number}`,
          companyId,
          userId
        );
      }

      // Restaurar puntos redimidos
      if (sale.points_redeemed > 0 && sale.client_id) {
        await pointsService.addPoints(
          sale.client_id,
          sale.points_redeemed,
          companyId,
          `Anulación venta #${sale.invoice_number}`
        );
      }

      // Remover puntos ganados por la compra
      if (sale.client_id) {
        const pointsToRemove = Math.floor(sale.total);
        if (pointsToRemove > 0) {
          await pointsService.removePoints(
            sale.client_id,
            pointsToRemove,
            companyId,
            `Anulación venta #${sale.invoice_number}`
          );
        }
      }

      logger.info('Venta anulada exitosamente', {
        saleId,
        invoiceNumber: sale.invoice_number,
        companyId
      });

      return voidedSale;

    } catch (error) {
      logger.error('Error anulando venta', {
        saleId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener resumen de ventas
   */
  async getSalesSummary(companyId, options = {}) {
    try {
      const {
        dateFrom = null,
        dateTo = null,
        groupBy = 'day' // day, week, month
      } = options;

      logger.info('Obteniendo resumen de ventas', {
        companyId,
        dateFrom,
        dateTo,
        groupBy
      });

      const summary = await Sale.getSalesSummary(companyId, {
        dateFrom,
        dateTo,
        groupBy
      });

      logger.info('Resumen de ventas obtenido', {
        companyId,
        periodsCount: summary.length
      });

      return summary;

    } catch (error) {
      logger.error('Error obteniendo resumen de ventas', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener productos más vendidos
   */
  async getTopSellingProducts(companyId, options = {}) {
    try {
      const {
        dateFrom = null,
        dateTo = null,
        limit = 10
      } = options;

      logger.info('Obteniendo productos más vendidos', {
        companyId,
        dateFrom,
        dateTo,
        limit
      });

      const topProducts = await Sale.getTopSellingProducts(companyId, {
        dateFrom,
        dateTo,
        limit
      });

      logger.info('Productos más vendidos obtenidos', {
        companyId,
        count: topProducts.length
      });

      return topProducts;

    } catch (error) {
      logger.error('Error obteniendo productos más vendidos', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calcular totales de la venta
   */
  calculateTotals(items, productValidation) {
    let subtotal = 0;

    for (const item of items) {
      const productInfo = productValidation.find(p => p.product_id === item.product_id);
      if (productInfo && productInfo.valid) {
        const itemTotal = productInfo.product.price * item.quantity;
        subtotal += itemTotal;
      }
    }

    const tax_amount = subtotal * 0.19; // 19% IVA Colombia
    const final_total = subtotal + tax_amount;

    return {
      subtotal,
      tax_amount,
      final_total
    };
  }

  /**
   * Generar número de factura
   */
  async generateInvoiceNumber(companyId) {
    try {
      const lastSale = await Sale.getLastSale(companyId);
      let nextNumber = 1;

      if (lastSale && lastSale.invoice_number) {
        const currentNumber = parseInt(lastSale.invoice_number.replace(/\D/g, '')) || 0;
        nextNumber = currentNumber + 1;
      }

      return `INV-${String(nextNumber).padStart(6, '0')}`;

    } catch (error) {
      logger.error('Error generando número de factura', {
        companyId,
        error: error.message
      });
      // Fallback con timestamp
      return `INV-${Date.now()}`;
    }
  }

  /**
   * Validar límites de plan para ventas
   */
  async validateSaleLimits(companyId) {
    try {
      const { canCreate, currentCount, limit } = await Sale.checkPlanLimits(companyId);
      
      return {
        canCreate,
        currentCount,
        limit,
        remaining: limit === -1 ? -1 : limit - currentCount
      };

    } catch (error) {
      logger.error('Error validando límites de ventas', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new SaleService();