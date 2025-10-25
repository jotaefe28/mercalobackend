/**
 * Controlador de Sale (Venta)
 * Sistema POS Multitenant
 * 
 * Controlador mejorado para ventas con validaciones completas,
 * manejo de errores y endpoints adicionales
 */

const SaleService = require('../services/saleService');
const { logger } = require('../middlewares/logger');

class SaleController {
  /**
   * Crear una nueva venta
   * @route POST /api/sales
   */
  static async createSale(req, res) {
    try {
      const saleData = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      logger.info('Iniciando creación de venta:', {
        companyId,
        userId,
        itemsCount: saleData.items?.length || 0,
        total: saleData.total
      });

      const result = await SaleService.createSale(saleData, companyId, userId);

      res.status(201).json({
        success: true,
        message: 'Venta creada exitosamente',
        data: result.sale,
        meta: {
          invoice_number: result.sale.invoice_number,
          total: result.sale.total,
          items_count: result.sale.items?.length || 0
        }
      });

    } catch (error) {
      logger.error('Error en createSale:', {
        error: error.message,
        stack: error.stack,
        companyId: req.user?.companyId,
        userId: req.user?.userId
      });

      // Errores específicos de negocio
      if (error.message.includes('no encontrado') || 
          error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          error_code: 'RESOURCE_NOT_FOUND'
        });
      }

      if (error.message.includes('insuficiente') || 
          error.message.includes('insufficient') ||
          error.message.includes('no tiene suficientes')) {
        return res.status(409).json({
          success: false,
          message: error.message,
          error_code: 'INSUFFICIENT_RESOURCES'
        });
      }

      if (error.message.includes('incorrecto') || 
          error.message.includes('invalid') ||
          error.message.includes('no pasaron la validación')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          error_code: 'VALIDATION_ERROR'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error_code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener venta por ID
   * @route GET /api/sales/:id
   */
  static async getSaleById(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const result = await SaleService.getSaleById(id, companyId);

      res.json({
        success: true,
        message: 'Venta encontrada',
        data: result.sale
      });

    } catch (error) {
      logger.error('Error en getSaleById:', {
        error: error.message,
        saleId: req.params.id,
        companyId: req.user?.companyId
      });

      if (error.message.includes('no encontrada')) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada',
          error_code: 'SALE_NOT_FOUND'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error_code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener ventas con filtros
   * @route GET /api/sales
   */
  static async getSales(req, res) {
    try {
      const filters = req.query;
      const companyId = req.user.companyId;

      const result = await SaleService.getSales(filters, companyId);

      res.json({
        success: true,
        message: `${result.sales.length} ventas encontradas`,
        data: result.sales,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Error en getSales:', {
        error: error.message,
        filters: req.query,
        companyId: req.user?.companyId
      });

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error_code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Actualizar una venta
   * @route PUT /api/sales/:id
   */
  static async updateSale(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const companyId = req.user.companyId;

      const result = await SaleService.updateSale(id, updateData, companyId);

      res.json({
        success: true,
        message: 'Venta actualizada exitosamente',
        data: result.sale
      });

    } catch (error) {
      logger.error('Error en updateSale:', {
        error: error.message,
        saleId: req.params.id,
        updateData: req.body,
        companyId: req.user?.companyId
      });

      if (error.message.includes('no encontrada')) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada',
          error_code: 'SALE_NOT_FOUND'
        });
      }

      if (error.message.includes('cancelada')) {
        return res.status(409).json({
          success: false,
          message: error.message,
          error_code: 'SALE_CANCELLED'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error_code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Cancelar una venta
   * @route POST /api/sales/:id/cancel
   */
  static async cancelSale(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const companyId = req.user.companyId;

      const result = await SaleService.cancelSale(id, companyId, reason);

      res.json({
        success: true,
        message: 'Venta cancelada exitosamente',
        data: {
          sale_id: id,
          reason,
          cancelled_at: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error en cancelSale:', {
        error: error.message,
        saleId: req.params.id,
        reason: req.body.reason,
        companyId: req.user?.companyId
      });

      if (error.message.includes('no encontrada')) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada',
          error_code: 'SALE_NOT_FOUND'
        });
      }

      if (error.message.includes('ya está cancelada')) {
        return res.status(409).json({
          success: false,
          message: error.message,
          error_code: 'SALE_ALREADY_CANCELLED'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error_code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener resumen de ventas
   * @route GET /api/sales/summary
   */
  static async getSalesSummary(req, res) {
    try {
      const { date_from, date_to } = req.query;
      const companyId = req.user.companyId;

      const result = await SaleService.getSalesSummary(companyId, date_from, date_to);

      res.json({
        success: true,
        message: 'Resumen de ventas obtenido exitosamente',
        data: result.summary,
        top_products: result.top_products,
        period: {
          from: date_from,
          to: date_to
        }
      });

    } catch (error) {
      logger.error('Error en getSalesSummary:', {
        error: error.message,
        dateFrom: req.query.date_from,
        dateTo: req.query.date_to,
        companyId: req.user?.companyId
      });

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error_code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener ventas por día
   * @route GET /api/sales/by-day
   */
  static async getSalesByDay(req, res) {
    try {
      const { date_from, date_to } = req.query;
      const companyId = req.user.companyId;

      const result = await SaleService.getSalesByDay(companyId, date_from, date_to);

      res.json({
        success: true,
        message: 'Ventas por día obtenidas exitosamente',
        data: result.sales_by_day,
        period: {
          from: date_from,
          to: date_to
        }
      });

    } catch (error) {
      logger.error('Error en getSalesByDay:', {
        error: error.message,
        dateFrom: req.query.date_from,
        dateTo: req.query.date_to,
        companyId: req.user?.companyId
      });

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error_code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener productos más vendidos
   * @route GET /api/sales/top-products
   */
  static async getTopSellingProducts(req, res) {
    try {
      const options = req.query;
      const companyId = req.user.companyId;

      const result = await SaleService.getTopSellingProducts(companyId, options);

      res.json({
        success: true,
        message: `${result.products.length} productos más vendidos`,
        data: result.products,
        filters: options
      });

    } catch (error) {
      logger.error('Error en getTopSellingProducts:', {
        error: error.message,
        options: req.query,
        companyId: req.user?.companyId
      });

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error_code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener ventas por cliente
   * @route GET /api/sales/by-client/:clientId
   */
  static async getSalesByClient(req, res) {
    try {
      const { clientId } = req.params;
      const options = req.query;
      const companyId = req.user.companyId;

      const result = await SaleService.getSalesByClient(clientId, companyId, options);

      res.json({
        success: true,
        message: `${result.sales.length} ventas encontradas para el cliente`,
        data: result.sales,
        client_id: clientId
      });

    } catch (error) {
      logger.error('Error en getSalesByClient:', {
        error: error.message,
        clientId: req.params.clientId,
        options: req.query,
        companyId: req.user?.companyId
      });

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error_code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener estadísticas generales de ventas
   * @route GET /api/sales/stats
   */
  static async getSalesStats(req, res) {
    try {
      const companyId = req.user.companyId;
      const today = new Date().toISOString().split('T')[0];
      const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Obtener múltiples estadísticas en paralelo
      const [
        todayStats,
        monthStats,
        topProducts
      ] = await Promise.all([
        SaleService.getSalesSummary(companyId, today, today),
        SaleService.getSalesSummary(companyId, lastMonth, today),
        SaleService.getTopSellingProducts(companyId, { limit: 5 })
      ]);

      res.json({
        success: true,
        message: 'Estadísticas de ventas obtenidas exitosamente',
        data: {
          today: todayStats.summary,
          last_30_days: monthStats.summary,
          top_products: topProducts.products
        }
      });

    } catch (error) {
      logger.error('Error en getSalesStats:', {
        error: error.message,
        companyId: req.user?.companyId
      });

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error_code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtener detalles completos de una venta (para impresión)
   * @route GET /api/sales/:id/receipt
   */
  static async getSaleReceipt(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const result = await SaleService.getSaleById(id, companyId);
      
      // Formatear datos para recibo
      const receipt = {
        sale: result.sale,
        company_info: {
          name: req.user.companyName || 'MercaloPOS',
          // Aquí se pueden agregar más datos de la empresa
        },
        formatted_date: new Date(result.sale.created_at).toLocaleString('es-CO'),
        formatted_total: new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP'
        }).format(result.sale.total)
      };

      res.json({
        success: true,
        message: 'Recibo obtenido exitosamente',
        data: receipt
      });

    } catch (error) {
      logger.error('Error en getSaleReceipt:', {
        error: error.message,
        saleId: req.params.id,
        companyId: req.user?.companyId
      });

      if (error.message.includes('no encontrada')) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada',
          error_code: 'SALE_NOT_FOUND'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error_code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Duplicar una venta (crear nueva basada en una existente)
   * @route POST /api/sales/:id/duplicate
   */
  static async duplicateSale(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      // Obtener venta original
      const originalSale = await SaleService.getSaleById(id, companyId);
      
      // Crear nueva venta basada en la original
      const newSaleData = {
        client_id: originalSale.sale.client_id,
        items: originalSale.sale.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount,
          subtotal: item.subtotal
        })),
        payment_methods: originalSale.sale.payments.map(payment => ({
          method_id: payment.method_id,
          amount: payment.amount,
          reference: null // Nueva referencia
        })),
        subtotal: originalSale.sale.subtotal,
        tax_amount: originalSale.sale.tax_amount,
        discount_amount: originalSale.sale.discount_amount,
        total: originalSale.sale.total,
        delivery_type: originalSale.sale.delivery_type,
        delivery_address: originalSale.sale.delivery_address,
        delivery_fee: originalSale.sale.delivery_fee,
        notes: `Duplicada de factura ${originalSale.sale.invoice_number}`
      };

      const result = await SaleService.createSale(newSaleData, companyId, userId);

      res.status(201).json({
        success: true,
        message: 'Venta duplicada exitosamente',
        data: result.sale,
        original_sale_id: id
      });

    } catch (error) {
      logger.error('Error en duplicateSale:', {
        error: error.message,
        originalSaleId: req.params.id,
        companyId: req.user?.companyId,
        userId: req.user?.userId
      });

      if (error.message.includes('no encontrada')) {
        return res.status(404).json({
          success: false,
          message: 'Venta original no encontrada',
          error_code: 'SALE_NOT_FOUND'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error_code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = SaleController;