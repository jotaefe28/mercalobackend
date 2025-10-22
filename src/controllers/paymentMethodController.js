/**
 * Controlador de Métodos de Pago
 * Sistema POS Multitenant
 */

const paymentMethodService = require('../services/paymentMethodService');
const { validationResult } = require('express-validator');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../utils/constants');

class PaymentMethodController {
  /**
   * Crear método de pago
   */
  async createPaymentMethod(req, res, next) {
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
      const paymentMethodData = { ...req.body, companyId };

      const result = await paymentMethodService.createPaymentMethod(paymentMethodData);
      
      logger.info('Método de pago creado exitosamente', {
        userId: req.user.id,
        companyId,
        paymentMethodId: result.id,
        name: paymentMethodData.name
      });

      res.status(201).json({
        success: true,
        message: 'Método de pago creado exitosamente',
        data: result
      });

    } catch (error) {
      logger.error('Error creando método de pago', {
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
   * Obtener método de pago por ID
   */
  async getPaymentMethodById(req, res, next) {
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

      const { paymentMethodId } = req.params;
      const { companyId } = req.user;

      const paymentMethod = await paymentMethodService.getPaymentMethodById(paymentMethodId, companyId);
      
      if (!paymentMethod) {
        return res.status(404).json({
          success: false,
          message: 'Método de pago no encontrado',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      res.json({
        success: true,
        data: paymentMethod
      });

    } catch (error) {
      logger.error('Error obteniendo método de pago', {
        error: error.message,
        paymentMethodId: req.params.paymentMethodId,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Obtener todos los métodos de pago de la empresa
   */
  async getPaymentMethods(req, res, next) {
    try {
      const { companyId } = req.user;
      const { includeInactive = false } = req.query;

      const paymentMethods = await paymentMethodService.getPaymentMethods(companyId, includeInactive);

      res.json({
        success: true,
        data: paymentMethods,
        count: paymentMethods.length
      });

    } catch (error) {
      logger.error('Error obteniendo métodos de pago', {
        error: error.message,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Actualizar método de pago
   */
  async updatePaymentMethod(req, res, next) {
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

      const { paymentMethodId } = req.params;
      const { companyId } = req.user;
      const updateData = req.body;

      const result = await paymentMethodService.updatePaymentMethod(paymentMethodId, updateData, companyId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Método de pago no encontrado',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      logger.info('Método de pago actualizado exitosamente', {
        userId: req.user.id,
        companyId,
        paymentMethodId,
        updateData
      });

      res.json({
        success: true,
        message: 'Método de pago actualizado exitosamente',
        data: result
      });

    } catch (error) {
      logger.error('Error actualizando método de pago', {
        error: error.message,
        paymentMethodId: req.params.paymentMethodId,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        body: req.body
      });
      next(error);
    }
  }

  /**
   * Alternar estado del método de pago
   */
  async togglePaymentMethodStatus(req, res, next) {
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

      const { paymentMethodId } = req.params;
      const { companyId } = req.user;

      const result = await paymentMethodService.togglePaymentMethodStatus(paymentMethodId, companyId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Método de pago no encontrado',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      logger.info('Estado del método de pago cambiado exitosamente', {
        userId: req.user.id,
        companyId,
        paymentMethodId,
        newStatus: result.isActive
      });

      res.json({
        success: true,
        message: `Método de pago ${result.isActive ? 'activado' : 'desactivado'} exitosamente`,
        data: result
      });

    } catch (error) {
      logger.error('Error cambiando estado del método de pago', {
        error: error.message,
        paymentMethodId: req.params.paymentMethodId,
        userId: req.user?.id,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Obtener estadísticas de métodos de pago
   */
  async getPaymentMethodStats(req, res, next) {
    try {
      const { companyId } = req.user;
      const { startDate, endDate } = req.query;

      const stats = await paymentMethodService.getPaymentMethodStats(companyId, startDate, endDate);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error obteniendo estadísticas de métodos de pago', {
        error: error.message,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        query: req.query
      });
      next(error);
    }
  }
}

module.exports = new PaymentMethodController();