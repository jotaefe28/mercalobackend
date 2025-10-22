/**
 * Servicio de Puntos
 * Sistema POS Multitenant
 */

const Points = require('../models/Points');
const Client = require('../models/Client');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES, POINTS_REASONS, DEFAULT_CONFIG } = require('../utils/constants');

class PointsService {
  /**
   * Agregar puntos a un cliente
   */
  async addPoints(clientId, points, companyId, reason = POINTS_REASONS.PURCHASE) {
    try {
      logger.info('Agregando puntos a cliente', {
        clientId,
        points,
        companyId,
        reason
      });

      // Verificar que el cliente existe
      const client = await Client.findByIdAndCompany(clientId, companyId);
      if (!client) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Cliente no encontrado'
        };
      }

      // Crear registro de puntos
      const pointsRecord = await Points.create({
        client_id: clientId,
        company_id: companyId,
        points: points,
        type: 'earned',
        reason: reason,
        reference: null,
        expires_at: this.calculateExpirationDate()
      });

      logger.info('Puntos agregados exitosamente', {
        pointsId: pointsRecord.id,
        clientId,
        points,
        companyId
      });

      return pointsRecord;

    } catch (error) {
      logger.error('Error agregando puntos', {
        clientId,
        points,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Redimir puntos de un cliente
   */
  async redeemPoints(clientId, points, companyId, reference) {
    try {
      logger.info('Redimiendo puntos de cliente', {
        clientId,
        points,
        companyId,
        reference
      });

      // Verificar que el cliente existe
      const client = await Client.findByIdAndCompany(clientId, companyId);
      if (!client) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Cliente no encontrado'
        };
      }

      // Validar que tenga suficientes puntos
      const validation = await this.validateRedemption(clientId, points, companyId);
      if (!validation.valid) {
        throw {
          code: ERROR_CODES.INSUFFICIENT_POINTS,
          message: validation.message
        };
      }

      // Crear registro de redención
      const redemptionRecord = await Points.create({
        client_id: clientId,
        company_id: companyId,
        points: -points, // Negativo para redención
        type: 'redeemed',
        reason: POINTS_REASONS.REDEMPTION,
        reference: reference
      });

      logger.info('Puntos redimidos exitosamente', {
        pointsId: redemptionRecord.id,
        clientId,
        points,
        companyId
      });

      return redemptionRecord;

    } catch (error) {
      logger.error('Error redimiendo puntos', {
        clientId,
        points,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Remover puntos de un cliente (para anulaciones)
   */
  async removePoints(clientId, points, companyId, reason) {
    try {
      logger.info('Removiendo puntos de cliente', {
        clientId,
        points,
        companyId,
        reason
      });

      // Verificar que el cliente existe
      const client = await Client.findByIdAndCompany(clientId, companyId);
      if (!client) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Cliente no encontrado'
        };
      }

      // Crear registro de ajuste negativo
      const adjustmentRecord = await Points.create({
        client_id: clientId,
        company_id: companyId,
        points: -points, // Negativo para remoción
        type: 'adjustment',
        reason: reason,
        reference: null
      });

      logger.info('Puntos removidos exitosamente', {
        pointsId: adjustmentRecord.id,
        clientId,
        points,
        companyId
      });

      return adjustmentRecord;

    } catch (error) {
      logger.error('Error removiendo puntos', {
        clientId,
        points,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener balance de puntos de un cliente
   */
  async getClientPointsBalance(clientId, companyId) {
    try {
      // Verificar que el cliente existe
      const client = await Client.findByIdAndCompany(clientId, companyId);
      if (!client) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Cliente no encontrado'
        };
      }

      const balance = await Points.getClientBalance(clientId, companyId);

      logger.info('Balance de puntos obtenido', {
        clientId,
        companyId,
        balance
      });

      return {
        client_id: clientId,
        total_points: balance.total_points || 0,
        available_points: balance.available_points || 0,
        points_expiring_soon: balance.points_expiring_soon || 0,
        last_updated: new Date()
      };

    } catch (error) {
      logger.error('Error obteniendo balance de puntos', {
        clientId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener historial de puntos de un cliente
   */
  async getClientPointsHistory(clientId, companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type = null,
        dateFrom = null,
        dateTo = null
      } = options;

      logger.info('Obteniendo historial de puntos', {
        clientId,
        companyId,
        page,
        limit,
        type,
        dateFrom,
        dateTo
      });

      // Verificar que el cliente existe
      const client = await Client.findByIdAndCompany(clientId, companyId);
      if (!client) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Cliente no encontrado'
        };
      }

      const filters = {
        client_id: clientId,
        company_id: companyId
      };

      if (type) filters.type = type;

      const history = await Points.findAll(filters, {
        page,
        limit,
        dateFrom,
        dateTo,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      logger.info('Historial de puntos obtenido', {
        clientId,
        companyId,
        total: history.total,
        returned: history.data.length
      });

      return history;

    } catch (error) {
      logger.error('Error obteniendo historial de puntos', {
        clientId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validar redención de puntos
   */
  async validateRedemption(clientId, pointsToRedeem, companyId) {
    try {
      if (pointsToRedeem <= 0) {
        return {
          valid: false,
          message: 'La cantidad de puntos debe ser mayor a 0'
        };
      }

      const balance = await Points.getClientBalance(clientId, companyId);
      const availablePoints = balance.available_points || 0;

      if (pointsToRedeem > availablePoints) {
        return {
          valid: false,
          message: `Puntos insuficientes. Disponibles: ${availablePoints}, Solicitados: ${pointsToRedeem}`,
          available: availablePoints,
          requested: pointsToRedeem
        };
      }

      // Calcular descuento equivalente
      const discountAmount = pointsToRedeem * DEFAULT_CONFIG.POINTS_TO_DOLLAR_RATIO;

      return {
        valid: true,
        message: 'Redención válida',
        available: availablePoints,
        requested: pointsToRedeem,
        discount_amount: discountAmount
      };

    } catch (error) {
      logger.error('Error validando redención de puntos', {
        clientId,
        pointsToRedeem,
        companyId,
        error: error.message
      });
      return {
        valid: false,
        message: 'Error validando puntos'
      };
    }
  }

  /**
   * Ajustar puntos manualmente (solo admin)
   */
  async adjustPoints(clientId, points, reason, companyId, adjustedBy) {
    try {
      logger.info('Ajustando puntos manualmente', {
        clientId,
        points,
        reason,
        companyId,
        adjustedBy
      });

      // Verificar que el cliente existe
      const client = await Client.findByIdAndCompany(clientId, companyId);
      if (!client) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Cliente no encontrado'
        };
      }

      // Crear registro de ajuste
      const adjustmentRecord = await Points.create({
        client_id: clientId,
        company_id: companyId,
        points: points,
        type: 'adjustment',
        reason: reason,
        reference: `Ajuste manual por usuario ${adjustedBy}`,
        created_by: adjustedBy
      });

      logger.info('Puntos ajustados exitosamente', {
        pointsId: adjustmentRecord.id,
        clientId,
        points,
        companyId,
        adjustedBy
      });

      return adjustmentRecord;

    } catch (error) {
      logger.error('Error ajustando puntos', {
        clientId,
        points,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Expirar puntos vencidos
   */
  async expirePoints(companyId) {
    try {
      logger.info('Expirando puntos vencidos', { companyId });

      const expiredPoints = await Points.expirePoints(companyId);

      logger.info('Puntos expirados exitosamente', {
        companyId,
        expiredRecords: expiredPoints.length
      });

      return {
        expired_records: expiredPoints.length,
        total_points_expired: expiredPoints.reduce((sum, record) => sum + record.points, 0)
      };

    } catch (error) {
      logger.error('Error expirando puntos', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener estadísticas de puntos de la empresa
   */
  async getCompanyPointsStats(companyId) {
    try {
      logger.info('Obteniendo estadísticas de puntos de empresa', { companyId });

      const stats = await Points.getCompanyStats(companyId);

      logger.info('Estadísticas de puntos obtenidas', {
        companyId,
        stats
      });

      return stats;

    } catch (error) {
      logger.error('Error obteniendo estadísticas de puntos', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener clientes con más puntos
   */
  async getTopPointsClients(companyId, limit = 10) {
    try {
      logger.info('Obteniendo clientes con más puntos', {
        companyId,
        limit
      });

      const topClients = await Points.getTopPointsClients(companyId, limit);

      logger.info('Clientes con más puntos obtenidos', {
        companyId,
        count: topClients.length
      });

      return topClients;

    } catch (error) {
      logger.error('Error obteniendo clientes con más puntos', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calcular fecha de expiración de puntos
   */
  calculateExpirationDate() {
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1); // 1 año de expiración
    return expirationDate;
  }

  /**
   * Calcular puntos a otorgar por compra
   */
  calculatePointsForPurchase(purchaseAmount) {
    return Math.floor(purchaseAmount * DEFAULT_CONFIG.POINTS_PER_DOLLAR);
  }

  /**
   * Calcular descuento por puntos
   */
  calculateDiscountForPoints(points) {
    return points * DEFAULT_CONFIG.POINTS_TO_DOLLAR_RATIO;
  }
}

module.exports = new PointsService();