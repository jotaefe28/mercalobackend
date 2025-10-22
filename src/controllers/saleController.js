/**
 * Controlador de Ventas
 * Sistema POS Multitenant
 */

const saleService = require('../services/saleService');
const { validationResult } = require('express-validator');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../utils/constants');

class SaleController {
  /**
   * Procesar nueva venta
   */
  async processSale(req, res, next) {
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

      const saleData = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      logger.info('Procesando nueva venta', {
        companyId,
        userId,
        total: saleData.total,
        itemsCount: saleData.items?.length || 0
      });

      const sale = await saleService.processSale(saleData, companyId, userId);

      logger.info('Venta procesada exitosamente', {
        saleId: sale.id,
        invoiceNumber: sale.invoice_number,
        total: sale.total
      });

      res.status(201).json({
        success: true,
        message: RESPONSE_MESSAGES.CREATED,
        data: sale
      });

    } catch (error) {
      logger.error('Error procesando venta', {
        error: error.message,
        companyId: req.user?.companyId,
        userId: req.user?.userId
      });
      next(error);
    }
  }

  /**
   * Obtener venta por ID
   */
  async getSaleById(req, res, next) {
    try {
      const { saleId } = req.params;
      const companyId = req.user.companyId;

      const sale = await saleService.getSaleById(saleId, companyId);

      res.json({
        success: true,
        data: sale
      });

    } catch (error) {
      logger.error('Error obteniendo venta', {
        saleId: req.params.saleId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Listar ventas
   */
  async getSales(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null,
        status: req.query.status || null,
        clientId: req.query.clientId || null,
        userId: req.query.userId || null,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'desc'
      };

      logger.info('Listando ventas', {
        companyId,
        options
      });

      const result = await saleService.getSales(companyId, options);

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
      logger.error('Error listando ventas', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Anular venta
   */
  async voidSale(req, res, next) {
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

      const { saleId } = req.params;
      const { reason } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      logger.info('Anulando venta', {
        saleId,
        reason,
        companyId,
        userId
      });

      const sale = await saleService.voidSale(saleId, reason, companyId, userId);

      logger.info('Venta anulada exitosamente', {
        saleId,
        invoiceNumber: sale.invoice_number
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED,
        data: sale
      });

    } catch (error) {
      logger.error('Error anulando venta', {
        saleId: req.params.saleId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener resumen de ventas
   */
  async getSalesSummary(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const options = {
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null,
        groupBy: req.query.groupBy || 'day'
      };

      logger.info('Obteniendo resumen de ventas', {
        companyId,
        options
      });

      const summary = await saleService.getSalesSummary(companyId, options);

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      logger.error('Error obteniendo resumen de ventas', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener productos más vendidos
   */
  async getTopSellingProducts(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const options = {
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null,
        limit: parseInt(req.query.limit) || 10
      };

      logger.info('Obteniendo productos más vendidos', {
        companyId,
        options
      });

      const topProducts = await saleService.getTopSellingProducts(companyId, options);

      res.json({
        success: true,
        data: topProducts
      });

    } catch (error) {
      logger.error('Error obteniendo productos más vendidos', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Validar límites de ventas por plan
   */
  async validateSaleLimits(req, res, next) {
    try {
      const companyId = req.user.companyId;

      const limits = await saleService.validateSaleLimits(companyId);

      res.json({
        success: true,
        data: limits
      });

    } catch (error) {
      logger.error('Error validando límites de ventas', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener ventas del día actual
   */
  async getTodaySales(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const today = new Date().toISOString().split('T')[0];
      
      const options = {
        page: 1,
        limit: 100,
        dateFrom: today,
        dateTo: today,
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      logger.info('Obteniendo ventas del día', {
        companyId,
        date: today
      });

      const result = await saleService.getSales(companyId, options);

      // Calcular totales del día
      const totalSales = result.total;
      const totalAmount = result.data.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
      const avgSale = totalSales > 0 ? totalAmount / totalSales : 0;

      res.json({
        success: true,
        data: {
          sales: result.data,
          summary: {
            total_sales: totalSales,
            total_amount: totalAmount,
            avg_sale: avgSale,
            date: today
          }
        }
      });

    } catch (error) {
      logger.error('Error obteniendo ventas del día', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener estadísticas rápidas de ventas
   */
  async getQuickStats(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date().toISOString().substring(0, 7);

      // Ventas de hoy
      const todayOptions = {
        dateFrom: today,
        dateTo: today
      };

      // Ventas del mes
      const monthOptions = {
        dateFrom: `${thisMonth}-01`,
        dateTo: today
      };

      const [todaySummary, monthSummary] = await Promise.all([
        saleService.getSalesSummary(companyId, todayOptions),
        saleService.getSalesSummary(companyId, monthOptions)
      ]);

      const todayStats = todaySummary[0] || { sales_count: 0, total_amount: 0 };
      const monthStats = monthSummary.reduce((acc, day) => ({
        sales_count: acc.sales_count + day.sales_count,
        total_amount: acc.total_amount + parseFloat(day.total_amount)
      }), { sales_count: 0, total_amount: 0 });

      res.json({
        success: true,
        data: {
          today: {
            sales: todayStats.sales_count,
            amount: todayStats.total_amount
          },
          month: {
            sales: monthStats.sales_count,
            amount: monthStats.total_amount
          }
        }
      });

    } catch (error) {
      logger.error('Error obteniendo estadísticas rápidas', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }
}

module.exports = new SaleController();