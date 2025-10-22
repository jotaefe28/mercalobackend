/**
 * Modelo de Points (Puntos de Fidelización)
 * Sistema POS Multitenant
 * 
 * Maneja el sistema de puntos de fidelización con acumulación y redención
 */

const { executeQuery, executeTransaction, logger } = require('../config/database');
const { addTenantFilter } = require('../config/tenantResolver');
const { v4: uuidv4 } = require('uuid');

class PointsModel {
  /**
   * Obtener historial de puntos de un cliente
   * @param {string} customerId - ID del cliente
   * @param {string} companyId - ID de la empresa
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<Object>} Historial de puntos con paginación
   */
  static async getCustomerPointsHistory(customerId, companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortOrder = 'desc'
      } = options;
      
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          cpl.id,
          cpl.change_amount,
          cpl.reason,
          cpl.previous_points,
          cpl.new_points,
          cpl.sale_id,
          cpl.created_at,
          s.total as sale_total
        FROM customer_points_log cpl
        LEFT JOIN sales s ON cpl.sale_id = s.id
        WHERE cpl.customer_id = ?
      `;
      
      let params = [customerId];
      
      // Agregar filtro de tenant
      if (companyId) {
        const filtered = addTenantFilter(query, companyId, 'cpl');
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      // Agregar ordenamiento y paginación
      query += ` ORDER BY cpl.created_at ${sortOrder} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      const history = await executeQuery(query, params, 'Obtener historial de puntos');
      
      // Contar total
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM customer_points_log cpl
        WHERE cpl.customer_id = ?
      `;
      let countParams = [customerId];
      
      if (companyId) {
        const filtered = addTenantFilter(countQuery, companyId, 'cpl');
        countQuery = filtered.query;
        countParams.push(filtered.tenantParam);
      }
      
      const totalResult = await executeQuery(countQuery, countParams, 'Contar historial de puntos');
      const total = totalResult[0].total;
      
      return {
        data: history,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error obteniendo historial de puntos:', {
        error: error.message,
        customerId,
        companyId,
        options
      });
      throw error;
    }
  }
  
  /**
   * Redimir puntos en una venta
   * @param {Object} redemptionData - Datos de redención
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Resultado de la redención
   */
  static async redeemPoints(redemptionData, companyId) {
    try {
      const { customer_id, points_to_redeem, sale_total } = redemptionData;
      
      return await executeTransaction(async (connection) => {
        // Verificar puntos disponibles del cliente
        const [customer] = await connection.execute(
          'SELECT current_points FROM clients WHERE id = ? AND company_id = ? FOR UPDATE',
          [customer_id, companyId]
        );
        
        if (customer.length === 0) {
          throw new Error('Cliente no encontrado');
        }
        
        const currentPoints = customer[0].current_points;
        
        // Validaciones
        if (currentPoints < points_to_redeem) {
          throw new Error(`Cliente solo tiene ${currentPoints} puntos disponibles`);
        }
        
        if (points_to_redeem > sale_total) {
          throw new Error('Los puntos a redimir no pueden exceder el total de la venta');
        }
        
        if (points_to_redeem <= 0) {
          throw new Error('La cantidad de puntos debe ser mayor a 0');
        }
        
        // Llamar al stored procedure para redimir puntos
        const [result] = await connection.execute(`
          CALL redeem_points(?, ?, ?, ?)
        `, [customer_id, points_to_redeem, sale_total, companyId]);
        
        return {
          success: true,
          points_redeemed: points_to_redeem,
          discount_amount: points_to_redeem, // 1 punto = $1
          remaining_points: currentPoints - points_to_redeem,
          sale_total_after_discount: sale_total - points_to_redeem
        };
      });
    } catch (error) {
      logger.error('Error redimiendo puntos:', {
        error: error.message,
        redemptionData,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Agregar puntos por compra
   * @param {string} customerId - ID del cliente
   * @param {string} companyId - ID de la empresa
   * @param {number} purchaseAmount - Monto de la compra
   * @param {string} saleId - ID de la venta
   * @returns {Promise<Object>} Resultado de la adición de puntos
   */
  static async addPointsForPurchase(customerId, companyId, purchaseAmount, saleId) {
    try {
      // 1 punto por cada $1 de compra (redondeado hacia abajo)
      const pointsToAdd = Math.floor(purchaseAmount);
      
      if (pointsToAdd <= 0) {
        return {
          points_added: 0,
          reason: 'Monto insuficiente para generar puntos'
        };
      }
      
      return await executeTransaction(async (connection) => {
        // Obtener puntos actuales
        const [customer] = await connection.execute(
          'SELECT current_points FROM clients WHERE id = ? AND company_id = ? FOR UPDATE',
          [customerId, companyId]
        );
        
        if (customer.length === 0) {
          throw new Error('Cliente no encontrado');
        }
        
        const currentPoints = customer[0].current_points;
        const newPoints = currentPoints + pointsToAdd;
        
        // Actualizar puntos del cliente
        await connection.execute(
          'UPDATE clients SET current_points = ?, updated_at = ? WHERE id = ? AND company_id = ?',
          [newPoints, new Date(), customerId, companyId]
        );
        
        // Registrar movimiento de puntos
        await connection.execute(`
          INSERT INTO customer_points_log (
            id, company_id, customer_id, change_amount, reason, 
            previous_points, new_points, sale_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(),
          companyId,
          customerId,
          pointsToAdd,
          `Compra por $${purchaseAmount}`,
          currentPoints,
          newPoints,
          saleId,
          new Date()
        ]);
        
        return {
          points_added: pointsToAdd,
          total_points: newPoints,
          purchase_amount: purchaseAmount,
          reason: `Acumulación por compra de $${purchaseAmount}`
        };
      });
    } catch (error) {
      logger.error('Error agregando puntos por compra:', {
        error: error.message,
        customerId,
        companyId,
        purchaseAmount,
        saleId
      });
      throw error;
    }
  }
  
  /**
   * Consultar puntos de cliente por identificador
   * @param {string} identifier - Documento o teléfono del cliente
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Información de puntos del cliente
   */
  static async getPointsByIdentifier(identifier, companyId) {
    try {
      let query = `
        SELECT 
          c.id,
          c.name,
          c.document,
          c.phone,
          c.email,
          c.current_points,
          c.created_at,
          COUNT(cpl.id) as total_transactions,
          COALESCE(SUM(CASE WHEN cpl.change_amount > 0 THEN cpl.change_amount ELSE 0 END), 0) as total_points_earned,
          COALESCE(SUM(CASE WHEN cpl.change_amount < 0 THEN ABS(cpl.change_amount) ELSE 0 END), 0) as total_points_redeemed
        FROM clients c
        LEFT JOIN customer_points_log cpl ON c.id = cpl.customer_id
        WHERE (c.document = ? OR c.phone = ?)
      `;
      
      let params = [identifier, identifier];
      
      // Agregar filtro de tenant
      if (companyId) {
        const filtered = addTenantFilter(query, companyId, 'c');
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      query += ' GROUP BY c.id';
      
      const clients = await executeQuery(query, params, 'Consultar puntos por identificador');
      return clients.length > 0 ? clients[0] : null;
    } catch (error) {
      logger.error('Error consultando puntos por identificador:', {
        error: error.message,
        identifier,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Obtener resumen de puntos de todos los clientes
   * @param {string} companyId - ID de la empresa
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Object>} Resumen de puntos
   */
  static async getPointsSummary(companyId, options = {}) {
    try {
      const {
        dateFrom = null,
        dateTo = null
      } = options;
      
      let whereConditions = ['company_id = ?'];
      let params = [companyId];
      
      if (dateFrom && dateTo) {
        whereConditions.push('DATE(created_at) >= ? AND DATE(created_at) <= ?');
        params.push(dateFrom, dateTo);
      }
      
      const whereClause = whereConditions.length > 1 ? 
        `WHERE ${whereConditions.join(' AND ')}` : 
        `WHERE ${whereConditions[0]}`;
      
      const query = `
        SELECT 
          COUNT(DISTINCT customer_id) as active_customers_with_transactions,
          COALESCE(SUM(CASE WHEN change_amount > 0 THEN change_amount ELSE 0 END), 0) as total_points_issued,
          COALESCE(SUM(CASE WHEN change_amount < 0 THEN ABS(change_amount) ELSE 0 END), 0) as total_points_redeemed,
          COUNT(CASE WHEN change_amount > 0 THEN 1 END) as earning_transactions,
          COUNT(CASE WHEN change_amount < 0 THEN 1 END) as redemption_transactions
        FROM customer_points_log 
        ${whereClause}
      `;
      
      const summary = await executeQuery(query, params, 'Obtener resumen de puntos');
      
      // Obtener información adicional de clientes
      const clientsQuery = `
        SELECT 
          COUNT(*) as total_clients,
          COUNT(CASE WHEN current_points > 0 THEN 1 END) as clients_with_points,
          COALESCE(SUM(current_points), 0) as total_outstanding_points,
          COALESCE(AVG(current_points), 0) as average_points_per_client
        FROM clients 
        WHERE company_id = ?
      `;
      
      const clientsStats = await executeQuery(clientsQuery, [companyId], 'Obtener estadísticas de clientes');
      
      return {
        ...summary[0],
        ...clientsStats[0]
      };
    } catch (error) {
      logger.error('Error obteniendo resumen de puntos:', {
        error: error.message,
        companyId,
        options
      });
      throw error;
    }
  }
  
  /**
   * Obtener clientes con más puntos
   * @param {string} companyId - ID de la empresa
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>} Lista de clientes con más puntos
   */
  static async getTopPointsCustomers(companyId, limit = 10) {
    try {
      const query = `
        SELECT 
          c.id,
          c.name,
          c.document,
          c.phone,
          c.current_points,
          COUNT(s.id) as total_purchases,
          COALESCE(SUM(s.total), 0) as total_spent
        FROM clients c
        LEFT JOIN sales s ON c.id = s.client_id AND s.status = 'completed'
        WHERE c.company_id = ? AND c.current_points > 0
        GROUP BY c.id
        ORDER BY c.current_points DESC
        LIMIT ?
      `;
      
      return await executeQuery(query, [companyId, limit], 'Obtener clientes con más puntos');
    } catch (error) {
      logger.error('Error obteniendo clientes con más puntos:', {
        error: error.message,
        companyId,
        limit
      });
      throw error;
    }
  }
  
  /**
   * Ajustar puntos manualmente (admin)
   * @param {string} customerId - ID del cliente
   * @param {string} companyId - ID de la empresa
   * @param {number} pointsAdjustment - Ajuste de puntos (positivo o negativo)
   * @param {string} reason - Razón del ajuste
   * @param {string} adminUserId - ID del usuario administrador
   * @returns {Promise<Object>} Resultado del ajuste
   */
  static async adjustPoints(customerId, companyId, pointsAdjustment, reason, adminUserId) {
    try {
      return await executeTransaction(async (connection) => {
        // Obtener puntos actuales
        const [customer] = await connection.execute(
          'SELECT current_points, name FROM clients WHERE id = ? AND company_id = ? FOR UPDATE',
          [customerId, companyId]
        );
        
        if (customer.length === 0) {
          throw new Error('Cliente no encontrado');
        }
        
        const currentPoints = customer[0].current_points;
        const newPoints = currentPoints + pointsAdjustment;
        
        if (newPoints < 0) {
          throw new Error('El ajuste resultaría en puntos negativos');
        }
        
        // Actualizar puntos del cliente
        await connection.execute(
          'UPDATE clients SET current_points = ?, updated_at = ? WHERE id = ? AND company_id = ?',
          [newPoints, new Date(), customerId, companyId]
        );
        
        // Registrar movimiento de puntos
        await connection.execute(`
          INSERT INTO customer_points_log (
            id, company_id, customer_id, change_amount, reason, 
            previous_points, new_points, sale_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(),
          companyId,
          customerId,
          pointsAdjustment,
          `Ajuste manual: ${reason} (Admin: ${adminUserId})`,
          currentPoints,
          newPoints,
          null,
          new Date()
        ]);
        
        return {
          success: true,
          customer_name: customer[0].name,
          adjustment: pointsAdjustment,
          previous_points: currentPoints,
          new_points: newPoints,
          reason
        };
      });
    } catch (error) {
      logger.error('Error ajustando puntos manualmente:', {
        error: error.message,
        customerId,
        companyId,
        pointsAdjustment,
        reason,
        adminUserId
      });
      throw error;
    }
  }
}

module.exports = PointsModel;