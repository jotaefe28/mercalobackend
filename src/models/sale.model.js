/**
 * Modelo de Sale (Venta)
 * Sistema POS Multitenant
 * 
 * Maneja las operaciones CRUD para ventas, integrado con sistema de puntos
 * y gestión de inventario
 */

const { executeQuery, executeTransaction, logger } = require('../config/database');
const { addTenantFilter } = require('../config/tenantResolver');
const { v4: uuidv4 } = require('uuid');

class SaleModel {
  /**
   * Crear una nueva venta usando stored procedure
   * @param {Object} saleData - Datos de la venta
   * @param {string} companyId - ID de la empresa
   * @param {string} userId - ID del usuario que registra la venta
   * @returns {Promise<Object>} Venta creada
   */
  static async create(saleData, companyId, userId) {
    try {
      const saleId = uuidv4();
      
      return await executeTransaction(async (connection) => {
        // Llamar al stored procedure para registrar la venta
        await connection.execute(`
          CALL register_sale(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          saleId,
          companyId,
          saleData.client_id || null,
          userId,
          JSON.stringify(saleData.items),
          saleData.points_to_redeem || 0,
          saleData.delivery_type || 'store',
          saleData.delivery_address || null,
          JSON.stringify(saleData.payment_methods),
          saleData.notes || null
        ]);
        
        // Retornar la venta creada
        return await this.findById(saleId, companyId);
      });
    } catch (error) {
      logger.error('Error creando venta:', {
        error: error.message,
        saleData: {
          ...saleData,
          items: `${saleData.items?.length || 0} items`
        },
        companyId,
        userId
      });
      throw error;
    }
  }
  
  /**
   * Buscar venta por ID
   * @param {string} id - ID de la venta
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Venta encontrada o null
   */
  static async findById(id, companyId) {
    try {
      let query = `
        SELECT 
          s.id,
          s.company_id,
          s.client_id,
          s.user_id,
          s.subtotal,
          s.taxes,
          s.points_redeemed,
          s.total,
          s.status,
          s.delivery_type,
          s.delivery_address,
          s.notes,
          s.created_at,
          s.updated_at,
          c.name as client_name,
          c.document as client_document,
          c.phone as client_phone,
          u.name as user_name
        FROM sales s
        LEFT JOIN clients c ON s.client_id = c.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
      `;
      
      let params = [id];
      
      // Agregar filtro de tenant
      if (companyId) {
        const filtered = addTenantFilter(query, companyId, 's');
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      const sales = await executeQuery(query, params, 'Buscar venta por ID');
      
      if (sales.length === 0) {
        return null;
      }
      
      const sale = sales[0];
      
      // Obtener items de la venta
      const itemsQuery = `
        SELECT 
          si.id,
          si.product_id,
          si.quantity,
          si.unit_price,
          si.subtotal,
          p.name as product_name,
          p.sku as product_sku
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
        ORDER BY si.created_at
      `;
      
      const items = await executeQuery(itemsQuery, [id], 'Obtener items de venta');
      sale.items = items;
      
      // Obtener métodos de pago
      const paymentsQuery = `
        SELECT 
          sp.id,
          sp.method_id,
          sp.amount,
          sp.reference,
          pm.name as method_name,
          pm.channel as method_channel
        FROM sale_payments sp
        JOIN payment_methods pm ON sp.method_id = pm.id
        WHERE sp.sale_id = ?
        ORDER BY sp.created_at
      `;
      
      const payments = await executeQuery(paymentsQuery, [id], 'Obtener pagos de venta');
      sale.payments = payments;
      
      return sale;
    } catch (error) {
      logger.error('Error buscando venta por ID:', {
        error: error.message,
        id,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Listar ventas con paginación y filtros
   * @param {string} companyId - ID de la empresa
   * @param {Object} options - Opciones de paginación y filtrado
   * @returns {Promise<Object>} Lista de ventas con metadatos
   */
  static async findAll(companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 's.created_at',
        sortOrder = 'desc',
        status = null,
        userId = null,
        clientId = null,
        dateFrom = null,
        dateTo = null,
        deliveryType = null
      } = options;
      
      const offset = (page - 1) * limit;
      let whereConditions = ['s.company_id = ?'];
      let params = [companyId];
      
      // Filtros adicionales
      if (status) {
        whereConditions.push('s.status = ?');
        params.push(status);
      }
      
      if (userId) {
        whereConditions.push('s.user_id = ?');
        params.push(userId);
      }
      
      if (clientId) {
        whereConditions.push('s.client_id = ?');
        params.push(clientId);
      }
      
      if (dateFrom) {
        whereConditions.push('DATE(s.created_at) >= ?');
        params.push(dateFrom);
      }
      
      if (dateTo) {
        whereConditions.push('DATE(s.created_at) <= ?');
        params.push(dateTo);
      }
      
      if (deliveryType) {
        whereConditions.push('s.delivery_type = ?');
        params.push(deliveryType);
      }
      
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      
      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM sales s
        ${whereClause}
      `;
      const totalResult = await executeQuery(countQuery, params, 'Contar ventas');
      const total = totalResult[0].total;
      
      // Query principal
      const query = `
        SELECT 
          s.id,
          s.company_id,
          s.client_id,
          s.user_id,
          s.subtotal,
          s.taxes,
          s.points_redeemed,
          s.total,
          s.status,
          s.delivery_type,
          s.delivery_address,
          s.notes,
          s.created_at,
          s.updated_at,
          c.name as client_name,
          c.document as client_document,
          u.name as user_name,
          COUNT(si.id) as items_count
        FROM sales s
        LEFT JOIN clients c ON s.client_id = c.id
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        ${whereClause}
        GROUP BY s.id
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      params.push(limit, offset);
      const sales = await executeQuery(query, params, 'Listar ventas');
      
      return {
        data: sales,
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
      logger.error('Error listando ventas:', {
        error: error.message,
        companyId,
        options
      });
      throw error;
    }
  }
  
  /**
   * Cancelar una venta
   * @param {string} id - ID de la venta
   * @param {string} companyId - ID de la empresa
   * @param {string} reason - Razón de la cancelación
   * @returns {Promise<Object>} Venta actualizada
   */
  static async cancel(id, companyId, reason = 'Cancelación manual') {
    try {
      return await executeTransaction(async (connection) => {
        // Verificar que la venta existe y está completada
        const [existingSale] = await connection.execute(
          'SELECT id, status, client_id, points_redeemed FROM sales WHERE id = ? AND company_id = ? FOR UPDATE',
          [id, companyId]
        );
        
        if (existingSale.length === 0) {
          throw new Error('Venta no encontrada');
        }
        
        if (existingSale[0].status !== 'completed') {
          throw new Error('Solo se pueden cancelar ventas completadas');
        }
        
        // Llamar al stored procedure para cancelar la venta
        await connection.execute(`CALL cancel_sale(?, ?, ?)`, [
          id,
          companyId,
          reason
        ]);
        
        return await this.findById(id, companyId);
      });
    } catch (error) {
      logger.error('Error cancelando venta:', {
        error: error.message,
        id,
        companyId,
        reason
      });
      throw error;
    }
  }
  
  /**
   * Obtener ventas por cliente
   * @param {string} clientId - ID del cliente
   * @param {string} companyId - ID de la empresa
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<Object>} Lista de ventas del cliente
   */
  static async findByClient(clientId, companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status = 'completed'
      } = options;
      
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT 
          s.id,
          s.subtotal,
          s.taxes,
          s.points_redeemed,
          s.total,
          s.status,
          s.delivery_type,
          s.created_at,
          COUNT(si.id) as items_count
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        WHERE s.client_id = ? AND s.company_id = ? AND s.status = ?
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const sales = await executeQuery(
        query, 
        [clientId, companyId, status, limit, offset], 
        'Obtener ventas por cliente'
      );
      
      // Contar total
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM sales 
        WHERE client_id = ? AND company_id = ? AND status = ?
      `;
      const totalResult = await executeQuery(countQuery, [clientId, companyId, status]);
      const total = totalResult[0].total;
      
      return {
        data: sales,
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
      logger.error('Error obteniendo ventas por cliente:', {
        error: error.message,
        clientId,
        companyId,
        options
      });
      throw error;
    }
  }
  
  /**
   * Obtener resumen de ventas por período
   * @param {string} companyId - ID de la empresa
   * @param {string} dateFrom - Fecha desde (YYYY-MM-DD)
   * @param {string} dateTo - Fecha hasta (YYYY-MM-DD)
   * @returns {Promise<Object>} Resumen de ventas
   */
  static async getSalesSummary(companyId, dateFrom, dateTo) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_sales,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sales,
          COUNT(CASE WHEN status = 'void' THEN 1 END) as void_sales,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN subtotal ELSE 0 END), 0) as subtotal_revenue,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN taxes ELSE 0 END), 0) as total_taxes,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN points_redeemed ELSE 0 END), 0) as total_points_redeemed,
          COALESCE(AVG(CASE WHEN status = 'completed' THEN total ELSE NULL END), 0) as average_sale_value,
          COUNT(DISTINCT CASE WHEN status = 'completed' THEN client_id END) as unique_customers,
          COUNT(CASE WHEN delivery_type = 'delivery' AND status = 'completed' THEN 1 END) as delivery_sales,
          COUNT(CASE WHEN delivery_type = 'store' AND status = 'completed' THEN 1 END) as store_sales
        FROM sales 
        WHERE company_id = ? 
          AND DATE(created_at) >= ? 
          AND DATE(created_at) <= ?
      `;
      
      const summary = await executeQuery(
        query, 
        [companyId, dateFrom, dateTo], 
        'Obtener resumen de ventas'
      );
      
      return summary[0];
    } catch (error) {
      logger.error('Error obteniendo resumen de ventas:', {
        error: error.message,
        companyId,
        dateFrom,
        dateTo
      });
      throw error;
    }
  }
  
  /**
   * Obtener ventas por día en un rango de fechas
   * @param {string} companyId - ID de la empresa
   * @param {string} dateFrom - Fecha desde (YYYY-MM-DD)
   * @param {string} dateTo - Fecha hasta (YYYY-MM-DD)
   * @returns {Promise<Array>} Ventas agrupadas por día
   */
  static async getSalesByDay(companyId, dateFrom, dateTo) {
    try {
      const query = `
        SELECT 
          DATE(created_at) as sale_date,
          COUNT(*) as total_sales,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sales,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) as daily_revenue,
          COALESCE(AVG(CASE WHEN status = 'completed' THEN total ELSE NULL END), 0) as average_sale_value
        FROM sales 
        WHERE company_id = ? 
          AND DATE(created_at) >= ? 
          AND DATE(created_at) <= ?
        GROUP BY DATE(created_at)
        ORDER BY sale_date ASC
      `;
      
      return await executeQuery(
        query, 
        [companyId, dateFrom, dateTo], 
        'Obtener ventas por día'
      );
    } catch (error) {
      logger.error('Error obteniendo ventas por día:', {
        error: error.message,
        companyId,
        dateFrom,
        dateTo
      });
      throw error;
    }
  }
  
  /**
   * Obtener productos más vendidos
   * @param {string} companyId - ID de la empresa
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Array>} Lista de productos más vendidos
   */
  static async getTopSellingProducts(companyId, options = {}) {
    try {
      const {
        limit = 10,
        dateFrom = null,
        dateTo = null
      } = options;
      
      let whereConditions = ['s.company_id = ?', 's.status = ?'];
      let params = [companyId, 'completed'];
      
      if (dateFrom) {
        whereConditions.push('DATE(s.created_at) >= ?');
        params.push(dateFrom);
      }
      
      if (dateTo) {
        whereConditions.push('DATE(s.created_at) <= ?');
        params.push(dateTo);
      }
      
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      
      const query = `
        SELECT 
          p.id,
          p.sku,
          p.name,
          p.price,
          SUM(si.quantity) as total_quantity_sold,
          COUNT(DISTINCT s.id) as times_sold,
          SUM(si.subtotal) as total_revenue
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN products p ON si.product_id = p.id
        ${whereClause}
        GROUP BY p.id
        ORDER BY total_quantity_sold DESC
        LIMIT ?
      `;
      
      params.push(limit);
      
      return await executeQuery(query, params, 'Obtener productos más vendidos');
    } catch (error) {
      logger.error('Error obteniendo productos más vendidos:', {
        error: error.message,
        companyId,
        options
      });
      throw error;
    }
  }
  
  /**
   * Verificar si una venta puede ser modificada
   * @param {string} id - ID de la venta
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<boolean>} True si puede ser modificada
   */
  static async canBeModified(id, companyId) {
    try {
      const query = `
        SELECT status, created_at
        FROM sales 
        WHERE id = ? AND company_id = ?
      `;
      
      const sales = await executeQuery(query, [id, companyId], 'Verificar si venta puede ser modificada');
      
      if (sales.length === 0) {
        return false;
      }
      
      const sale = sales[0];
      
      // Solo se pueden modificar ventas completadas dentro de las últimas 24 horas
      if (sale.status !== 'completed') {
        return false;
      }
      
      const now = new Date();
      const saleDate = new Date(sale.created_at);
      const hoursDiff = (now - saleDate) / (1000 * 60 * 60);
      
      return hoursDiff <= 24;
    } catch (error) {
      logger.error('Error verificando si venta puede ser modificada:', {
        error: error.message,
        id,
        companyId
      });
      return false;
    }
  }
}

module.exports = SaleModel;