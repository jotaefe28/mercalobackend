/**
 * Controlador de Órdenes
 * Sistema POS Multitenant
 */

const orderService = require('../services/orderService');
const { validationResult } = require('express-validator');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../utils/constants');

class OrderController {
  /**
   * Crear orden
   */
  async createOrder(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: RESPONSE_MESSAGES.VALIDATION_ERROR,
          errors: errors.array(),
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }

      const { companyId } = req.user;
      const orderData = { ...req.body, companyId, createdBy: req.user.id };

      const result = await orderService.createOrder(orderData);
      
      logger.info('Orden creada exitosamente', {
        userId: req.user.id,
        companyId,
        orderId: result.id
      });

      res.status(201).json({
        success: true,
        message: 'Orden creada exitosamente',
        data: result
      });

    } catch (error) {
      logger.error('Error creando orden', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        body: req.body
      });
      next(error);
    }
  }

  /**
   * Obtener órdenes
   */
  async getOrders(req, res, next) {
    try {
      const { companyId } = req.user;
      const filters = req.query;

      const orders = await orderService.getOrders(companyId, filters);

      res.json({
        success: true,
        data: orders
      });

    } catch (error) {
      logger.error('Error obteniendo órdenes', {
        error: error.message,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Obtener órdenes pendientes
   */
  async getPendingOrders(req, res, next) {
    try {
      const { companyId } = req.user;

      const orders = await orderService.getOrdersByStatus(companyId, 'PENDING');

      res.json({
        success: true,
        data: orders
      });

    } catch (error) {
      logger.error('Error obteniendo órdenes pendientes', {
        error: error.message,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Obtener órdenes listas
   */
  async getReadyOrders(req, res, next) {
    try {
      const { companyId } = req.user;

      const orders = await orderService.getOrdersByStatus(companyId, 'READY');

      res.json({
        success: true,
        data: orders
      });

    } catch (error) {
      logger.error('Error obteniendo órdenes listas', {
        error: error.message,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Obtener órdenes entregadas
   */
  async getDeliveredOrders(req, res, next) {
    try {
      const { companyId } = req.user;

      const orders = await orderService.getOrdersByStatus(companyId, 'DELIVERED');

      res.json({
        success: true,
        data: orders
      });

    } catch (error) {
      logger.error('Error obteniendo órdenes entregadas', {
        error: error.message,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Obtener orden por ID
   */
  async getOrderById(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: RESPONSE_MESSAGES.VALIDATION_ERROR,
          errors: errors.array(),
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }

      const { orderId } = req.params;
      const { companyId } = req.user;

      const order = await orderService.getOrderById(orderId, companyId);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      res.json({
        success: true,
        data: order
      });

    } catch (error) {
      logger.error('Error obteniendo orden', {
        error: error.message,
        orderId: req.params.orderId,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Actualizar orden
   */
  async updateOrder(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: RESPONSE_MESSAGES.VALIDATION_ERROR,
          errors: errors.array(),
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }

      const { orderId } = req.params;
      const { companyId } = req.user;
      const updateData = req.body;

      const result = await orderService.updateOrder(orderId, updateData, companyId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      logger.info('Orden actualizada exitosamente', {
        userId: req.user.id,
        companyId,
        orderId
      });

      res.json({
        success: true,
        message: 'Orden actualizada exitosamente',
        data: result
      });

    } catch (error) {
      logger.error('Error actualizando orden', {
        error: error.message,
        orderId: req.params.orderId,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Actualizar estado de orden
   */
  async updateOrderStatus(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: RESPONSE_MESSAGES.VALIDATION_ERROR,
          errors: errors.array(),
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }

      const { orderId } = req.params;
      const { status } = req.body;
      const { companyId } = req.user;

      const result = await orderService.updateOrderStatus(orderId, status, companyId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      logger.info('Estado de orden actualizado exitosamente', {
        userId: req.user.id,
        companyId,
        orderId,
        newStatus: status
      });

      res.json({
        success: true,
        message: 'Estado de orden actualizado exitosamente',
        data: result
      });

    } catch (error) {
      logger.error('Error actualizando estado de orden', {
        error: error.message,
        orderId: req.params.orderId,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Cancelar orden
   */
  async cancelOrder(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: RESPONSE_MESSAGES.VALIDATION_ERROR,
          errors: errors.array(),
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }

      const { orderId } = req.params;
      const { companyId } = req.user;

      const result = await orderService.cancelOrder(orderId, companyId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      logger.info('Orden cancelada exitosamente', {
        userId: req.user.id,
        companyId,
        orderId
      });

      res.json({
        success: true,
        message: 'Orden cancelada exitosamente',
        data: result
      });

    } catch (error) {
      logger.error('Error cancelando orden', {
        error: error.message,
        orderId: req.params.orderId,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Completar orden
   */
  async completeOrder(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: RESPONSE_MESSAGES.VALIDATION_ERROR,
          errors: errors.array(),
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }

      const { orderId } = req.params;
      const { companyId } = req.user;

      const result = await orderService.completeOrder(orderId, companyId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      logger.info('Orden completada exitosamente', {
        userId: req.user.id,
        companyId,
        orderId
      });

      res.json({
        success: true,
        message: 'Orden completada exitosamente',
        data: result
      });

    } catch (error) {
      logger.error('Error completando orden', {
        error: error.message,
        orderId: req.params.orderId,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Entregar orden
   */
  async deliverOrder(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: RESPONSE_MESSAGES.VALIDATION_ERROR,
          errors: errors.array(),
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }

      const { orderId } = req.params;
      const { companyId } = req.user;

      const result = await orderService.deliverOrder(orderId, companyId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      logger.info('Orden entregada exitosamente', {
        userId: req.user.id,
        companyId,
        orderId
      });

      res.json({
        success: true,
        message: 'Orden entregada exitosamente',
        data: result
      });

    } catch (error) {
      logger.error('Error entregando orden', {
        error: error.message,
        orderId: req.params.orderId,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Obtener resumen de órdenes
   */
  async getOrdersSummary(req, res, next) {
    try {
      const { companyId } = req.user;
      const { startDate, endDate } = req.query;

      const summary = await orderService.getOrdersSummary(companyId, startDate, endDate);

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      logger.error('Error obteniendo resumen de órdenes', {
        error: error.message,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }
}

module.exports = new OrderController();