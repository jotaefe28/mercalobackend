/**
 * Modelo de Orders (Pedidos/Entregas)
 * Sistema POS Multitenant
 */

const { executeQuery, executeTransaction, logger } = require('../config/database');
const { addTenantFilter } = require('../config/tenantResolver');
const { v4: uuidv4 } = require('uuid');

class OrderModel {
  static async create(orderData, companyId) {
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO orders_to_collect (
          id, company_id, sale_id, customer_name, customer_phone, 
          delivery_address, status, notes, assigned_to, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await executeQuery(query, [
        id, companyId, orderData.sale_id, orderData.customer_name,
        orderData.customer_phone, orderData.delivery_address,
        'PENDING', orderData.notes || null, orderData.assigned_to || null,
        now, now
      ], 'Crear pedido');
      
      return await this.findById(id, companyId);
    } catch (error) {
      logger.error('Error creando pedido:', { error: error.message, orderData, companyId });
      throw error;
    }
  }
  
  static async findById(id, companyId) {
    try {
      let query = `
        SELECT 
          o.id, o.company_id, o.sale_id, o.customer_name, o.customer_phone,
          o.delivery_address, o.status, o.notes, o.assigned_to, o.delivered_at,
          o.created_at, o.updated_at, s.total as sale_total, u.name as assigned_user_name
        FROM orders_to_collect o
        LEFT JOIN sales s ON o.sale_id = s.id
        LEFT JOIN users u ON o.assigned_to = u.id
        WHERE o.id = ?
      `;
      let params = [id];
      
      if (companyId) {
        const filtered = addTenantFilter(query, companyId, 'o');
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      const orders = await executeQuery(query, params, 'Buscar pedido por ID');
      return orders.length > 0 ? orders[0] : null;
    } catch (error) {
      logger.error('Error buscando pedido:', { error: error.message, id, companyId });
      throw error;
    }
  }
  
  static async findAll(companyId, options = {}) {
    try {
      const {
        page = 1, limit = 20, status = null, assignedTo = null,
        sortBy = 'created_at', sortOrder = 'desc'
      } = options;
      
      const offset = (page - 1) * limit;
      let whereConditions = ['o.company_id = ?'];
      let params = [companyId];
      
      if (status) {
        whereConditions.push('o.status = ?');
        params.push(status);
      }
      
      if (assignedTo) {
        whereConditions.push('o.assigned_to = ?');
        params.push(assignedTo);
      }
      
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      
      const countQuery = `SELECT COUNT(*) as total FROM orders_to_collect o ${whereClause}`;
      const totalResult = await executeQuery(countQuery, params, 'Contar pedidos');
      const total = totalResult[0].total;
      
      const query = `
        SELECT 
          o.id, o.sale_id, o.customer_name, o.customer_phone, o.delivery_address,
          o.status, o.notes, o.assigned_to, o.delivered_at, o.created_at, o.updated_at,
          s.total as sale_total, u.name as assigned_user_name
        FROM orders_to_collect o
        LEFT JOIN sales s ON o.sale_id = s.id
        LEFT JOIN users u ON o.assigned_to = u.id
        ${whereClause}
        ORDER BY o.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      params.push(limit, offset);
      const orders = await executeQuery(query, params, 'Listar pedidos');
      
      return {
        data: orders,
        pagination: {
          page, limit, total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error listando pedidos:', { error: error.message, companyId, options });
      throw error;
    }
  }
  
  static async updateStatus(id, companyId, status, notes = null) {
    try {
      return await executeTransaction(async (connection) => {
        const updateData = {
          status,
          notes,
          updated_at: new Date()
        };
        
        if (status === 'DELIVERED') {
          updateData.delivered_at = new Date();
        }
        
        const fields = Object.keys(updateData).map(key => `${key} = ?`);
        const values = Object.values(updateData);
        values.push(id, companyId);
        
        const query = `
          UPDATE orders_to_collect 
          SET ${fields.join(', ')}
          WHERE id = ? AND company_id = ?
        `;
        
        const result = await connection.execute(query, values);
        if (result[0].affectedRows === 0) throw new Error('Pedido no encontrado');
        
        return await this.findById(id, companyId);
      });
    } catch (error) {
      logger.error('Error actualizando estado de pedido:', { error: error.message, id, companyId, status });
      throw error;
    }
  }
}

module.exports = OrderModel;