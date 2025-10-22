/**
 * Servicio de Métodos de Pago
 * Sistema POS Multitenant
 */

const db = require('../config/database');
const { logger } = require('../middlewares/logger');

class PaymentMethodService {
  /**
   * Crear método de pago
   */
  async createPaymentMethod(paymentMethodData) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO payment_methods (company_id, name, type, provider, is_active, config, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentMethodData.companyId,
          paymentMethodData.name,
          paymentMethodData.type || 'CASH',
          paymentMethodData.provider || null,
          paymentMethodData.isActive !== false,
          JSON.stringify(paymentMethodData.config || {}),
          paymentMethodData.userId || null
        ]
      );

      // Obtener el método de pago creado
      const [rows] = await connection.execute(
        `SELECT * FROM payment_methods WHERE id = ? AND company_id = ?`,
        [result.insertId, paymentMethodData.companyId]
      );

      await connection.commit();

      logger.info('Método de pago creado exitosamente', {
        paymentMethodId: result.insertId,
        companyId: paymentMethodData.companyId,
        name: paymentMethodData.name
      });

      return {
        id: result.insertId,
        ...rows[0],
        config: JSON.parse(rows[0].config || '{}')
      };

    } catch (error) {
      await connection.rollback();
      logger.error('Error creando método de pago', {
        error: error.message,
        paymentMethodData
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtener método de pago por ID
   */
  async getPaymentMethodById(paymentMethodId, companyId) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM payment_methods 
         WHERE id = ? AND company_id = ? AND is_active = true`,
        [paymentMethodId, companyId]
      );

      if (rows.length === 0) {
        return null;
      }

      return {
        ...rows[0],
        config: JSON.parse(rows[0].config || '{}')
      };

    } catch (error) {
      logger.error('Error obteniendo método de pago por ID', {
        error: error.message,
        paymentMethodId,
        companyId
      });
      throw error;
    }
  }

  /**
   * Obtener todos los métodos de pago de la empresa
   */
  async getPaymentMethods(companyId, includeInactive = false) {
    try {
      let query = `
        SELECT * FROM payment_methods 
        WHERE company_id = ?
      `;
      const params = [companyId];

      if (!includeInactive) {
        query += ' AND is_active = true';
      }

      query += ' ORDER BY name ASC';

      const [rows] = await db.execute(query, params);

      return rows.map(row => ({
        ...row,
        config: JSON.parse(row.config || '{}')
      }));

    } catch (error) {
      logger.error('Error obteniendo métodos de pago', {
        error: error.message,
        companyId,
        includeInactive
      });
      throw error;
    }
  }

  /**
   * Actualizar método de pago
   */
  async updatePaymentMethod(paymentMethodId, updateData, companyId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Verificar que el método de pago existe y pertenece a la empresa
      const [existing] = await connection.execute(
        `SELECT * FROM payment_methods WHERE id = ? AND company_id = ?`,
        [paymentMethodId, companyId]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return null;
      }

      // Construir query de actualización dinámicamente
      const updateFields = [];
      const updateValues = [];

      if (updateData.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(updateData.name);
      }

      if (updateData.type !== undefined) {
        updateFields.push('type = ?');
        updateValues.push(updateData.type);
      }

      if (updateData.provider !== undefined) {
        updateFields.push('provider = ?');
        updateValues.push(updateData.provider);
      }

      if (updateData.isActive !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(updateData.isActive);
      }

      if (updateData.config !== undefined) {
        updateFields.push('config = ?');
        updateValues.push(JSON.stringify(updateData.config));
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(paymentMethodId, companyId);

      const updateQuery = `
        UPDATE payment_methods 
        SET ${updateFields.join(', ')}
        WHERE id = ? AND company_id = ?
      `;

      await connection.execute(updateQuery, updateValues);

      // Obtener el método de pago actualizado
      const [updated] = await connection.execute(
        `SELECT * FROM payment_methods WHERE id = ? AND company_id = ?`,
        [paymentMethodId, companyId]
      );

      await connection.commit();

      logger.info('Método de pago actualizado exitosamente', {
        paymentMethodId,
        companyId,
        updateData
      });

      return {
        ...updated[0],
        config: JSON.parse(updated[0].config || '{}')
      };

    } catch (error) {
      await connection.rollback();
      logger.error('Error actualizando método de pago', {
        error: error.message,
        paymentMethodId,
        companyId,
        updateData
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Alternar estado del método de pago
   */
  async togglePaymentMethodStatus(paymentMethodId, companyId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Obtener estado actual
      const [current] = await connection.execute(
        `SELECT is_active FROM payment_methods WHERE id = ? AND company_id = ?`,
        [paymentMethodId, companyId]
      );

      if (current.length === 0) {
        await connection.rollback();
        return null;
      }

      const newStatus = !current[0].is_active;

      // Actualizar estado
      await connection.execute(
        `UPDATE payment_methods 
         SET is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND company_id = ?`,
        [newStatus, paymentMethodId, companyId]
      );

      // Obtener registro actualizado
      const [updated] = await connection.execute(
        `SELECT * FROM payment_methods WHERE id = ? AND company_id = ?`,
        [paymentMethodId, companyId]
      );

      await connection.commit();

      logger.info('Estado del método de pago alternado exitosamente', {
        paymentMethodId,
        companyId,
        oldStatus: current[0].is_active,
        newStatus
      });

      return {
        ...updated[0],
        config: JSON.parse(updated[0].config || '{}')
      };

    } catch (error) {
      await connection.rollback();
      logger.error('Error alternando estado del método de pago', {
        error: error.message,
        paymentMethodId,
        companyId
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtener estadísticas de métodos de pago
   */
  async getPaymentMethodStats(companyId, startDate, endDate) {
    try {
      let query = `
        SELECT 
          pm.id,
          pm.name,
          pm.type,
          COUNT(sp.id) as transaction_count,
          COALESCE(SUM(sp.amount), 0) as total_amount,
          COALESCE(AVG(sp.amount), 0) as average_amount
        FROM payment_methods pm
        LEFT JOIN sale_payments sp ON pm.id = sp.payment_method_id
        LEFT JOIN sales s ON sp.sale_id = s.id
        WHERE pm.company_id = ?
      `;
      
      const params = [companyId];

      if (startDate && endDate) {
        query += ' AND s.created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      query += `
        GROUP BY pm.id, pm.name, pm.type
        ORDER BY total_amount DESC
      `;

      const [stats] = await db.execute(query, params);

      // Obtener totales generales
      const [totalQuery] = await db.execute(
        `SELECT 
          COUNT(DISTINCT pm.id) as total_methods,
          COUNT(sp.id) as total_transactions,
          COALESCE(SUM(sp.amount), 0) as total_revenue
         FROM payment_methods pm
         LEFT JOIN sale_payments sp ON pm.id = sp.payment_method_id
         LEFT JOIN sales s ON sp.sale_id = s.id
         WHERE pm.company_id = ? ${startDate && endDate ? 'AND s.created_at BETWEEN ? AND ?' : ''}`,
        startDate && endDate ? [companyId, startDate, endDate] : [companyId]
      );

      return {
        methods: stats,
        summary: totalQuery[0]
      };

    } catch (error) {
      logger.error('Error obteniendo estadísticas de métodos de pago', {
        error: error.message,
        companyId,
        startDate,
        endDate
      });
      throw error;
    }
  }
}

module.exports = new PaymentMethodService();