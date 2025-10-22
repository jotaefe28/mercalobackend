/**
 * Modelo de Product (Producto)
 * Sistema POS Multitenant
 * 
 * Maneja las operaciones CRUD para productos con control de inventario
 */

const { executeQuery, executeTransaction, logger } = require('../config/database');
const { addTenantFilter } = require('../config/tenantResolver');
const { v4: uuidv4 } = require('uuid');

class ProductModel {
  /**
   * Crear un nuevo producto
   * @param {Object} productData - Datos del producto
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Producto creado
   */
  static async create(productData, companyId) {
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO products (
          id, company_id, sku, name, description, price, cost, 
          stock, min_stock, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        id,
        companyId,
        productData.sku,
        productData.name,
        productData.description || null,
        productData.price,
        productData.cost,
        productData.stock,
        productData.min_stock || 0,
        true,
        now,
        now
      ];
      
      await executeQuery(query, params, 'Crear producto');
      
      // Retornar producto creado
      return await this.findById(id, companyId);
    } catch (error) {
      logger.error('Error creando producto:', {
        error: error.message,
        productData,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Buscar producto por ID
   * @param {string} id - ID del producto
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Producto encontrado o null
   */
  static async findById(id, companyId) {
    try {
      let query = `
        SELECT 
          id,
          company_id,
          sku,
          name,
          description,
          price,
          cost,
          stock,
          min_stock,
          is_active,
          created_at,
          updated_at
        FROM products 
        WHERE id = ?
      `;
      
      let params = [id];
      
      // Agregar filtro de tenant
      if (companyId) {
        const filtered = addTenantFilter(query, companyId);
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      const products = await executeQuery(query, params, 'Buscar producto por ID');
      return products.length > 0 ? products[0] : null;
    } catch (error) {
      logger.error('Error buscando producto por ID:', {
        error: error.message,
        id,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Buscar producto por SKU
   * @param {string} sku - SKU del producto
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Producto encontrado o null
   */
  static async findBySku(sku, companyId) {
    try {
      let query = `
        SELECT 
          id,
          company_id,
          sku,
          name,
          description,
          price,
          cost,
          stock,
          min_stock,
          is_active,
          created_at,
          updated_at
        FROM products 
        WHERE sku = ?
      `;
      
      let params = [sku];
      
      // Agregar filtro de tenant
      if (companyId) {
        const filtered = addTenantFilter(query, companyId);
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      const products = await executeQuery(query, params, 'Buscar producto por SKU');
      return products.length > 0 ? products[0] : null;
    } catch (error) {
      logger.error('Error buscando producto por SKU:', {
        error: error.message,
        sku,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Listar productos con paginación y filtros
   * @param {string} companyId - ID de la empresa
   * @param {Object} options - Opciones de paginación y filtrado
   * @returns {Promise<Object>} Lista de productos con metadatos
   */
  static async findAll(companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc',
        isActive = null,
        lowStock = false,
        search = null,
        minPrice = null,
        maxPrice = null
      } = options;
      
      const offset = (page - 1) * limit;
      let whereConditions = ['company_id = ?'];
      let params = [companyId];
      
      // Filtros adicionales
      if (isActive !== null) {
        whereConditions.push('is_active = ?');
        params.push(isActive);
      }
      
      if (lowStock) {
        whereConditions.push('stock <= min_stock');
      }
      
      if (search) {
        whereConditions.push('(name LIKE ? OR sku LIKE ? OR description LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      
      if (minPrice !== null) {
        whereConditions.push('price >= ?');
        params.push(minPrice);
      }
      
      if (maxPrice !== null) {
        whereConditions.push('price <= ?');
        params.push(maxPrice);
      }
      
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      
      // Query para contar total
      const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
      const totalResult = await executeQuery(countQuery, params, 'Contar productos');
      const total = totalResult[0].total;
      
      // Query principal
      const query = `
        SELECT 
          id,
          company_id,
          sku,
          name,
          description,
          price,
          cost,
          stock,
          min_stock,
          is_active,
          CASE 
            WHEN stock <= 0 THEN 'OUT_OF_STOCK'
            WHEN stock <= min_stock THEN 'LOW_STOCK'
            ELSE 'IN_STOCK'
          END as stock_status,
          created_at,
          updated_at
        FROM products 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      params.push(limit, offset);
      const products = await executeQuery(query, params, 'Listar productos');
      
      return {
        data: products,
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
      logger.error('Error listando productos:', {
        error: error.message,
        companyId,
        options
      });
      throw error;
    }
  }
  
  /**
   * Buscar productos por término de búsqueda (full-text)
   * @param {string} companyId - ID de la empresa
   * @param {string} term - Término de búsqueda
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>} Lista de productos encontrados
   */
  static async search(companyId, term, limit = 20) {
    try {
      const query = `
        SELECT 
          id,
          company_id,
          sku,
          name,
          description,
          price,
          cost,
          stock,
          min_stock,
          is_active,
          CASE 
            WHEN stock <= 0 THEN 'OUT_OF_STOCK'
            WHEN stock <= min_stock THEN 'LOW_STOCK'
            ELSE 'IN_STOCK'
          END as stock_status,
          created_at,
          updated_at
        FROM products 
        WHERE company_id = ? 
          AND is_active = 1
          AND (
            name LIKE ? OR 
            sku LIKE ? OR 
            description LIKE ?
          )
        ORDER BY 
          CASE 
            WHEN name LIKE ? THEN 1
            WHEN sku LIKE ? THEN 2
            WHEN description LIKE ? THEN 3
            ELSE 4
          END,
          name ASC
        LIMIT ?
      `;
      
      const searchTerm = `%${term}%`;
      const exactSearchTerm = `${term}%`;
      
      const params = [
        companyId,
        searchTerm,
        searchTerm,
        searchTerm,
        exactSearchTerm,
        exactSearchTerm,
        exactSearchTerm,
        limit
      ];
      
      return await executeQuery(query, params, 'Buscar productos');
    } catch (error) {
      logger.error('Error buscando productos:', {
        error: error.message,
        companyId,
        term,
        limit
      });
      throw error;
    }
  }
  
  /**
   * Actualizar producto
   * @param {string} id - ID del producto
   * @param {string} companyId - ID de la empresa
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Producto actualizado
   */
  static async update(id, companyId, updateData) {
    try {
      const allowedFields = [
        'sku', 'name', 'description', 'price', 'cost', 
        'stock', 'min_stock', 'is_active'
      ];
      const updateFields = [];
      const params = [];
      
      // Construir query de actualización dinámicamente
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          params.push(updateData[key]);
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }
      
      // Agregar updated_at
      updateFields.push('updated_at = ?');
      params.push(new Date());
      
      // Agregar condiciones WHERE
      params.push(id, companyId);
      
      const query = `
        UPDATE products 
        SET ${updateFields.join(', ')}
        WHERE id = ? AND company_id = ?
      `;
      
      const result = await executeQuery(query, params, 'Actualizar producto');
      
      if (result.affectedRows === 0) {
        throw new Error('Producto no encontrado');
      }
      
      // Retornar producto actualizado
      return await this.findById(id, companyId);
    } catch (error) {
      logger.error('Error actualizando producto:', {
        error: error.message,
        id,
        companyId,
        updateData
      });
      throw error;
    }
  }
  
  /**
   * Eliminar producto (soft delete)
   * @param {string} id - ID del producto
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  static async delete(id, companyId) {
    try {
      const query = `
        UPDATE products 
        SET is_active = false, updated_at = ?
        WHERE id = ? AND company_id = ?
      `;
      
      const result = await executeQuery(
        query, 
        [new Date(), id, companyId], 
        'Eliminar producto (soft delete)'
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error eliminando producto:', {
        error: error.message,
        id,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Ajustar stock de un producto
   * @param {string} id - ID del producto
   * @param {string} companyId - ID de la empresa
   * @param {number} adjustment - Ajuste de stock (positivo o negativo)
   * @param {string} reason - Razón del ajuste
   * @returns {Promise<Object>} Producto actualizado
   */
  static async adjustStock(id, companyId, adjustment, reason = 'Manual adjustment') {
    try {
      return await executeTransaction(async (connection) => {
        // Obtener stock actual
        const [currentProduct] = await connection.execute(
          'SELECT stock FROM products WHERE id = ? AND company_id = ? FOR UPDATE',
          [id, companyId]
        );
        
        if (currentProduct.length === 0) {
          throw new Error('Producto no encontrado');
        }
        
        const currentStock = currentProduct[0].stock;
        const newStock = currentStock + adjustment;
        
        if (newStock < 0) {
          throw new Error('El ajuste resultaría en stock negativo');
        }
        
        // Actualizar stock
        await connection.execute(
          'UPDATE products SET stock = ?, updated_at = ? WHERE id = ? AND company_id = ?',
          [newStock, new Date(), id, companyId]
        );
        
        // Registrar movimiento de inventario
        await connection.execute(`
          INSERT INTO inventory_movements (
            id, company_id, product_id, movement_type, quantity, 
            reason, previous_stock, new_stock, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(),
          companyId,
          id,
          adjustment > 0 ? 'IN' : 'OUT',
          Math.abs(adjustment),
          reason,
          currentStock,
          newStock,
          new Date()
        ]);
        
        return newStock;
      });
      
      // Retornar producto actualizado
      return await this.findById(id, companyId);
    } catch (error) {
      logger.error('Error ajustando stock:', {
        error: error.message,
        id,
        companyId,
        adjustment,
        reason
      });
      throw error;
    }
  }
  
  /**
   * Verificar si SKU ya existe en la empresa
   * @param {string} sku - SKU a verificar
   * @param {string} companyId - ID de la empresa
   * @param {string} excludeProductId - ID de producto a excluir (para updates)
   * @returns {Promise<boolean>} True si el SKU ya existe
   */
  static async skuExists(sku, companyId, excludeProductId = null) {
    try {
      let query = `
        SELECT COUNT(*) as count 
        FROM products 
        WHERE sku = ? AND company_id = ?
      `;
      
      let params = [sku, companyId];
      
      if (excludeProductId) {
        query += ' AND id != ?';
        params.push(excludeProductId);
      }
      
      const result = await executeQuery(query, params, 'Verificar existencia de SKU');
      return result[0].count > 0;
    } catch (error) {
      logger.error('Error verificando existencia de SKU:', {
        error: error.message,
        sku,
        companyId,
        excludeProductId
      });
      throw error;
    }
  }
  
  /**
   * Obtener productos con stock bajo
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Array>} Lista de productos con stock bajo
   */
  static async getLowStockProducts(companyId) {
    try {
      const query = `
        SELECT 
          id,
          company_id,
          sku,
          name,
          description,
          price,
          cost,
          stock,
          min_stock,
          is_active,
          created_at,
          updated_at
        FROM products 
        WHERE company_id = ? 
          AND is_active = 1
          AND stock <= min_stock
        ORDER BY (stock - min_stock) ASC, name ASC
      `;
      
      return await executeQuery(query, [companyId], 'Obtener productos con stock bajo');
    } catch (error) {
      logger.error('Error obteniendo productos con stock bajo:', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Obtener estadísticas de productos
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Estadísticas de productos
   */
  static async getStats(companyId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_products,
          COUNT(CASE WHEN stock <= 0 THEN 1 END) as out_of_stock,
          COUNT(CASE WHEN stock <= min_stock AND stock > 0 THEN 1 END) as low_stock,
          COALESCE(SUM(stock * cost), 0) as total_inventory_value,
          COALESCE(AVG(price), 0) as average_price,
          COALESCE(SUM(stock), 0) as total_stock_units
        FROM products 
        WHERE company_id = ?
      `;
      
      const stats = await executeQuery(query, [companyId], 'Obtener estadísticas de productos');
      return stats[0];
    } catch (error) {
      logger.error('Error obteniendo estadísticas de productos:', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }
}

module.exports = ProductModel;