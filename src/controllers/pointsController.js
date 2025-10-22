/**
 * Controlador de Puntos
 * Sistema POS Multitenant
 */

const pointsService = require('../services/pointsService');
const { validationResult } = require('express-validator');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../utils/constants');

class PointsController {
  /**
   * Obtener balance de puntos de un cliente
   */
  async getClientPointsBalance(req, res, next) {
    try {
      const { clientId } = req.params;
      const companyId = req.user.companyId;

      const balance = await pointsService.getClientPointsBalance(clientId, companyId);

      res.json({
        success: true,
        data: balance
      });

    } catch (error) {
      logger.error('Error obteniendo balance de puntos', {
        clientId: req.params.clientId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener historial de puntos de un cliente
   */
  async getClientPointsHistory(req, res, next) {
    try {
      const { clientId } = req.params;
      const companyId = req.user.companyId;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        type: req.query.type || null,
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null
      };

      logger.info('Obteniendo historial de puntos', {
        clientId,
        companyId,
        options
      });

      const result = await pointsService.getClientPointsHistory(clientId, companyId, options);

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
      logger.error('Error obteniendo historial de puntos', {
        clientId: req.params.clientId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Validar redención de puntos
   */
  async validateRedemption(req, res, next) {
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

      const { clientId, points } = req.body;
      const companyId = req.user.companyId;

      logger.info('Validando redención de puntos', {
        clientId,
        points,
        companyId
      });

      const validation = await pointsService.validateRedemption(clientId, points, companyId);

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      logger.error('Error validando redención de puntos', {
        clientId: req.body.clientId,
        points: req.body.points,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Ajustar puntos manualmente (solo admin)
   */
  async adjustPoints(req, res, next) {
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

      const { clientId } = req.params;
      const { points, reason } = req.body;
      const companyId = req.user.companyId;
      const adjustedBy = req.user.userId;

      logger.info('Ajustando puntos manualmente', {
        clientId,
        points,
        reason,
        companyId,
        adjustedBy
      });

      const adjustment = await pointsService.adjustPoints(
        clientId, 
        points, 
        reason, 
        companyId, 
        adjustedBy
      );

      logger.info('Puntos ajustados exitosamente', {
        clientId,
        points,
        adjustedBy
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED,
        data: adjustment
      });

    } catch (error) {
      logger.error('Error ajustando puntos', {
        clientId: req.params.clientId,
        points: req.body.points,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Expirar puntos vencidos
   */
  async expirePoints(req, res, next) {
    try {
      const companyId = req.user.companyId;

      logger.info('Expirando puntos vencidos', { companyId });

      const result = await pointsService.expirePoints(companyId);

      logger.info('Puntos expirados exitosamente', {
        companyId,
        expiredRecords: result.expired_records
      });

      res.json({
        success: true,
        message: 'Puntos expirados exitosamente',
        data: result
      });

    } catch (error) {
      logger.error('Error expirando puntos', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener estadísticas de puntos de la empresa
   */
  async getCompanyPointsStats(req, res, next) {
    try {
      const companyId = req.user.companyId;

      logger.info('Obteniendo estadísticas de puntos de empresa', { companyId });

      const stats = await pointsService.getCompanyPointsStats(companyId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error obteniendo estadísticas de puntos', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener clientes con más puntos
   */
  async getTopPointsClients(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const limit = parseInt(req.query.limit) || 10;

      logger.info('Obteniendo clientes con más puntos', {
        companyId,
        limit
      });

      const topClients = await pointsService.getTopPointsClients(companyId, limit);

      res.json({
        success: true,
        data: topClients
      });

    } catch (error) {
      logger.error('Error obteniendo clientes con más puntos', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Calcular puntos por monto de compra
   */
  async calculatePointsForPurchase(req, res, next) {
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

      const { amount } = req.body;

      const points = pointsService.calculatePointsForPurchase(amount);

      res.json({
        success: true,
        data: {
          purchase_amount: amount,
          points_to_earn: points
        }
      });

    } catch (error) {
      logger.error('Error calculando puntos por compra', {
        amount: req.body.amount,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Calcular descuento por puntos
   */
  async calculateDiscountForPoints(req, res, next) {
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

      const { points } = req.body;

      const discount = pointsService.calculateDiscountForPoints(points);

      res.json({
        success: true,
        data: {
          points_to_redeem: points,
          discount_amount: discount
        }
      });

    } catch (error) {
      logger.error('Error calculando descuento por puntos', {
        points: req.body.points,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener resumen de puntos para dashboard
   */
  async getPointsDashboard(req, res, next) {
    try {
      const companyId = req.user.companyId;

      logger.info('Obteniendo dashboard de puntos', { companyId });

      const [stats, topClients] = await Promise.all([
        pointsService.getCompanyPointsStats(companyId),
        pointsService.getTopPointsClients(companyId, 5)
      ]);

      res.json({
        success: true,
        data: {
          stats,
          top_clients: topClients
        }
      });

    } catch (error) {
      logger.error('Error obteniendo dashboard de puntos', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }
}

module.exports = new PointsController();