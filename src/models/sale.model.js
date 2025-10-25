/**
 * Modelo de Sale (Venta)
 * Sistema POS Multitenant
 */

const { executeQuery, executeTransaction, logger } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class SaleModel {
  static async create(saleData, companyId) {
    try {
      const saleId = uuidv4();
      const now = new Date();
      
      return await executeTransaction(async (connection) => {
        // Crear la venta principal
        await connection.execute(`
          INSERT INTO sales (
            id, company_id, client_id, user_id, invoice_number,
            subtotal, tax_amount, discount_amount, points_redeemed, total,
            status, delivery_type, delivery_address, delivery_fee,
            notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          saleId, companyId, saleData.client_id, saleData.user_id,
          saleData.invoice_number, saleData.subtotal,
          saleData.tax_amount || 0, saleData.discount_amount || 0,
          saleData.points_redeemed || 0, saleData.total,
          'completed', saleData.delivery_type || 'store',
          saleData.delivery_address || null, saleData.delivery_fee || 0,
          saleData.notes || null, now, now
        ]);

        // Insertar items de la venta
        for (const item of saleData.items) {
          const itemId = uuidv4();
          await connection.execute(`
            INSERT INTO sale_items (
              id, sale_id, product_id, quantity, unit_price,
              discount_amount, subtotal, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            itemId, saleId, item.product_id, item.quantity,
            item.unit_price, item.discount_amount || 0,
            item.subtotal, now
          ]);

          // Actualizar stock del producto
          await connection.execute(`
            UPDATE products 
            SET stock = stock - ?, updated_at = ? 
            WHERE id = ? AND company_id = ? AND track_stock = true
          `, [item.quantity, now, item.product_id, companyId]);
        }

        // Insertar métodos de pago
        for (const payment of saleData.payment_methods) {
          const paymentId = uuidv4();
          await connection.execute(`
            INSERT INTO sale_payments (
              id, sale_id, method_id, amount, reference, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            paymentId, saleId, payment.method_id,
            payment.amount, payment.reference || null, now
          ]);
        }

        return saleId;
      });
    } catch (error) {
      logger.error('Error creando venta:', error);
      throw error;
    }
  }

  static async findById(saleId, companyId) {
    try {
      const saleQuery = `
        SELECT s.*, c.name as client_name, u.name as user_name
        FROM sales s
        LEFT JOIN clients c ON s.client_id = c.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND s.company_id = ?
      `;
      
      const sales = await executeQuery(saleQuery, [saleId, companyId]);
      if (!sales || sales.length === 0) return null;
      
      const sale = sales[0];
      
      // Obtener items
      const itemsQuery = `
        SELECT si.*, p.name as product_name, p.code as product_code
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `;
      const items = await executeQuery(itemsQuery, [saleId]);
      sale.items = items || [];
      
      // Obtener pagos
      const paymentsQuery = `
        SELECT sp.*, pm.name as method_name
        FROM sale_payments sp
        JOIN payment_methods pm ON sp.method_id = pm.id
        WHERE sp.sale_id = ?
      `;
      const payments = await executeQuery(paymentsQuery, [saleId]);
      sale.payments = payments || [];
      
      return sale;
    } catch (error) {
      logger.error('Error buscando venta:', error);
      throw error;
    }
  }

  static async findAll(companyId, options = {}) {
    try {
      const { page = 1, limit = 20, status, dateFrom, dateTo } = options;
      const offset = (page - 1) * limit;
      
      let whereConditions = ['s.company_id = ?'];
      let params = [companyId];
      
      if (status) {
        whereConditions.push('s.status = ?');
        params.push(status);
      }
      
      if (dateFrom) {
        whereConditions.push('DATE(s.created_at) >= ?');
        params.push(dateFrom);
      }
      
      if (dateTo) {
        whereConditions.push('DATE(s.created_at) <= ?');
        params.push(dateTo);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      const countQuery = `SELECT COUNT(*) as total FROM sales s WHERE ${whereClause}`;
      const countResult = await executeQuery(countQuery, params);
      const total = countResult[0].total;
      
      const salesQuery = `
        SELECT s.*, c.name as client_name, u.name as user_name
        FROM sales s
        LEFT JOIN clients c ON s.client_id = c.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const sales = await executeQuery(salesQuery, [...params, limit, offset]);
      
      return {
        sales: sales || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error obteniendo ventas:', error);
      throw error;
    }
  }

  static async cancel(saleId, companyId, reason) {
    try {
      return await executeTransaction(async (connection) => {
        const [sales] = await connection.execute(`
          SELECT * FROM sales 
          WHERE id = ? AND company_id = ? AND status = 'completed'
        `, [saleId, companyId]);

        if (!sales || sales.length === 0) {
          throw new Error('Venta no encontrada o ya cancelada');
        }

        await connection.execute(`
          UPDATE sales 
          SET status = 'cancelled', 
              notes = CONCAT(COALESCE(notes, ''), '\nCANCELADA: ', ?),
              updated_at = ? 
          WHERE id = ? AND company_id = ?
        `, [reason, new Date(), saleId, companyId]);

        return saleId;
      });
    } catch (error) {
      logger.error('Error cancelando venta:', error);
      throw error;
    }
  }

  static async getStats(companyId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const todayQuery = `
        SELECT 
          COUNT(*) as total_sales,
          COALESCE(SUM(total), 0) as total_revenue
        FROM sales 
        WHERE company_id = ? AND DATE(created_at) = ? AND status = 'completed'
      `;
      const todayStats = await executeQuery(todayQuery, [companyId, today]);

      return { today: todayStats[0] };
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}

module.exports = SaleModel;