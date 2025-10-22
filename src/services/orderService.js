/**
 * Servicio de Órdenes
 * Sistema POS Multitenant
 */

const db = require('../config/database');
const { logger } = require('../middlewares/logger');

class OrderService {
  /**
   * Crear orden
   */
  async createOrder(orderData) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Crear la orden principal
      const [result] = await connection.execute(
        `INSERT INTO orders (company_id, client_id, status, order_type, table_number, 
         subtotal, tax, discount, total, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderData.companyId,
          orderData.clientId || null,
          orderData.status || 'PENDING',
          orderData.orderType || 'DINE_IN',
          orderData.tableNumber || null,
          orderData.subtotal || 0,
          orderData.tax || 0,
          orderData.discount || 0,
          orderData.total || 0,
          orderData.notes || null,
          orderData.createdBy
        ]
      );

      const orderId = result.insertId;

      // Insertar items de la orden si existen
      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          await connection.execute(
            `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              item.productId,
              item.quantity,
              item.unitPrice,
              item.totalPrice,
              item.notes || null
            ]
          );
        }
      }

      await connection.commit();

      logger.info('Orden creada exitosamente', {
        orderId,
        companyId: orderData.companyId,
        total: orderData.total
      });

      // Obtener la orden completa
      return await this.getOrderById(orderId, orderData.companyId);

    } catch (error) {
      await connection.rollback();
      logger.error('Error creando orden', {
        error: error.message,
        orderData
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtener orden por ID
   */
  async getOrderById(orderId, companyId) {
    try {
      const [rows] = await db.execute(
        `SELECT o.*, c.name as client_name, u.name as created_by_name
         FROM orders o
         LEFT JOIN clients c ON o.client_id = c.id
         LEFT JOIN users u ON o.created_by = u.id
         WHERE o.id = ? AND o.company_id = ?`,
        [orderId, companyId]
      );

      if (rows.length === 0) {
        return null;
      }

      const order = rows[0];

      // Obtener items de la orden
      const [items] = await db.execute(
        `SELECT oi.*, p.name as product_name, p.sku
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderId]
      );

      return {
        ...order,
        items
      };

    } catch (error) {
      logger.error('Error obteniendo orden por ID', {
        error: error.message,
        orderId,
        companyId
      });
      throw error;
    }
  }

  /**
   * Obtener órdenes con filtros
   */
  async getOrders(companyId, filters = {}) {
    try {
      let query = `
        SELECT o.*, c.name as client_name, u.name as created_by_name
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN users u ON o.created_by = u.id
        WHERE o.company_id = ?
      `;
      const params = [companyId];

      if (filters.status) {
        query += ' AND o.status = ?';
        params.push(filters.status);
      }

      if (filters.orderType) {
        query += ' AND o.order_type = ?';
        params.push(filters.orderType);
      }

      if (filters.startDate && filters.endDate) {
        query += ' AND o.created_at BETWEEN ? AND ?';
        params.push(filters.startDate, filters.endDate);
      }

      query += ' ORDER BY o.created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
      }

      const [rows] = await db.execute(query, params);
      return rows;

    } catch (error) {
      logger.error('Error obteniendo órdenes', {
        error: error.message,
        companyId,
        filters
      });
      throw error;
    }
  }

  /**
   * Obtener órdenes por estado
   */
  async getOrdersByStatus(companyId, status) {
    try {
      const [rows] = await db.execute(
        `SELECT o.*, c.name as client_name, u.name as created_by_name
         FROM orders o
         LEFT JOIN clients c ON o.client_id = c.id
         LEFT JOIN users u ON o.created_by = u.id
         WHERE o.company_id = ? AND o.status = ?
         ORDER BY o.created_at DESC`,
        [companyId, status]
      );

      return rows;

    } catch (error) {
      logger.error('Error obteniendo órdenes por estado', {
        error: error.message,
        companyId,
        status
      });
      throw error;
    }
  }

  /**
   * Actualizar orden
   */
  async updateOrder(orderId, updateData, companyId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Verificar que la orden existe y pertenece a la empresa
      const [existing] = await connection.execute(
        `SELECT * FROM orders WHERE id = ? AND company_id = ?`,
        [orderId, companyId]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return null;
      }

      // Construir query de actualización dinámicamente
      const updateFields = [];
      const updateValues = [];

      if (updateData.clientId !== undefined) {
        updateFields.push('client_id = ?');
        updateValues.push(updateData.clientId);
      }

      if (updateData.tableNumber !== undefined) {
        updateFields.push('table_number = ?');
        updateValues.push(updateData.tableNumber);
      }

      if (updateData.notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(updateData.notes);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(orderId, companyId);

        const updateQuery = `
          UPDATE orders 
          SET ${updateFields.join(', ')}
          WHERE id = ? AND company_id = ?
        `;

        await connection.execute(updateQuery, updateValues);
      }

      await connection.commit();

      logger.info('Orden actualizada exitosamente', {
        orderId,
        companyId,
        updateData
      });

      return await this.getOrderById(orderId, companyId);

    } catch (error) {
      await connection.rollback();
      logger.error('Error actualizando orden', {
        error: error.message,
        orderId,
        companyId,
        updateData
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Actualizar estado de orden
   */
  async updateOrderStatus(orderId, status, companyId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Actualizar estado
      const [result] = await connection.execute(
        `UPDATE orders 
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND company_id = ?`,
        [status, orderId, companyId]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return null;
      }

      await connection.commit();

      logger.info('Estado de orden actualizado exitosamente', {
        orderId,
        companyId,
        newStatus: status
      });

      return await this.getOrderById(orderId, companyId);

    } catch (error) {
      await connection.rollback();
      logger.error('Error actualizando estado de orden', {
        error: error.message,
        orderId,
        companyId,
        status
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Cancelar orden
   */
  async cancelOrder(orderId, companyId) {
    return await this.updateOrderStatus(orderId, 'CANCELLED', companyId);
  }

  /**
   * Completar orden
   */
  async completeOrder(orderId, companyId) {
    return await this.updateOrderStatus(orderId, 'COMPLETED', companyId);
  }

  /**
   * Entregar orden
   */
  async deliverOrder(orderId, companyId) {
    return await this.updateOrderStatus(orderId, 'DELIVERED', companyId);
  }

  /**
   * Obtener resumen de órdenes
   */
  async getOrdersSummary(companyId, startDate, endDate) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders,
          COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered_orders,
          COALESCE(SUM(total), 0) as total_revenue,
          COALESCE(AVG(total), 0) as average_order_value
        FROM orders 
        WHERE company_id = ?
      `;
      
      const params = [companyId];

      if (startDate && endDate) {
        query += ' AND created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      const [summary] = await db.execute(query, params);

      return summary[0];

    } catch (error) {
      logger.error('Error obteniendo resumen de órdenes', {
        error: error.message,
        companyId,
        startDate,
        endDate
      });
      throw error;
    }
  }
}

module.exports = new OrderService();