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
          stock, min_stock, max_stock, category, brand, barcode,
          unit_of_measure, weight, dimensions, tax_rate, discount_price,
          expiry_date, supplier_id, image_url, tags, is_service,
          is_featured, is_digital, requires_prescription, age_restriction,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        id,
        companyId,
        productData.sku,
        productData.name,
        productData.description || null,
        productData.price,
        productData.cost || null,
        productData.stock,
        productData.min_stock || 0,
        productData.max_stock || null,
        productData.category || null,
        productData.brand || null,
        productData.barcode || null,
        productData.unit_of_measure || 'unidad',
        productData.weight || null,
        productData.dimensions ? JSON.stringify(productData.dimensions) : null,
        productData.tax_rate || 0,
        productData.discount_price || null,
        productData.expiry_date || null,
        productData.supplier_id || null,
        productData.image_url || null,
        productData.tags ? JSON.stringify(productData.tags) : null,
        productData.is_service || false,
        productData.is_featured || false,
        productData.is_digital || false,
        productData.requires_prescription || false,
        productData.age_restriction || null,
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
          id, company_id, sku, name, description, price, cost, stock,
          min_stock, max_stock, category, brand, barcode, unit_of_measure,
          weight, dimensions, tax_rate, discount_price, expiry_date,
          supplier_id, image_url, tags, is_service, is_featured, is_digital,
          requires_prescription, age_restriction, is_active, created_at, updated_at
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
      
      if (products.length > 0) {
        const product = products[0];
        // Parsear campos JSON
        if (product.dimensions) {
          try {
            product.dimensions = JSON.parse(product.dimensions);
          } catch (e) {
            product.dimensions = null;
          }
        }
        if (product.tags) {
          try {
            product.tags = JSON.parse(product.tags);
          } catch (e) {
            product.tags = [];
          }
        }
        return product;
      }
      
      return null;
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
          id, company_id, sku, name, description, price, cost, stock,
          min_stock, max_stock, category, brand, barcode, unit_of_measure,
          weight, dimensions, tax_rate, discount_price, expiry_date,
          supplier_id, image_url, tags, is_service, is_featured, is_digital,
          requires_prescription, age_restriction, is_active, created_at, updated_at
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
      
      if (products.length > 0) {
        const product = products[0];
        // Parsear campos JSON
        if (product.dimensions) {
          try {
            product.dimensions = JSON.parse(product.dimensions);
          } catch (e) {
            product.dimensions = null;
          }
        }
        if (product.tags) {
          try {
            product.tags = JSON.parse(product.tags);
          } catch (e) {
            product.tags = [];
          }
        }
        return product;
      }
      
      return null;
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
        limit = 10,
        sort_by = 'created_at',
        sort_order = 'DESC',
        is_active = null,
        low_stock = false,
        search = null,
        category = null,
        brand = null,
        min_price = null,
        max_price = null,
        in_stock = null,
        is_featured = null,
        is_service = null,
        is_digital = null,
        requires_prescription = null,
        expiring_soon = null,
        has_discount = null
      } = options;
      
      const offset = (page - 1) * limit;
      let whereConditions = ['company_id = ?'];
      let params = [companyId];
      
      // Filtros adicionales
      if (is_active !== null) {
        whereConditions.push('is_active = ?');
        params.push(is_active);
      }
      
      if (low_stock) {
        whereConditions.push('stock <= min_stock');
      }
      
      if (in_stock !== null) {
        if (in_stock) {
          whereConditions.push('stock > 0');
        } else {
          whereConditions.push('stock <= 0');
        }
      }
      
      if (search) {
        whereConditions.push('(name LIKE ? OR sku LIKE ? OR description LIKE ? OR barcode LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      
      if (category) {
        whereConditions.push('category = ?');
        params.push(category);
      }
      
      if (brand) {
        whereConditions.push('brand LIKE ?');
        params.push(`%${brand}%`);
      }
      
      if (min_price !== null) {
        whereConditions.push('price >= ?');
        params.push(min_price);
      }
      
      if (max_price !== null) {
        whereConditions.push('price <= ?');
        params.push(max_price);
      }
      
      if (is_featured !== null) {
        whereConditions.push('is_featured = ?');
        params.push(is_featured);
      }
      
      if (is_service !== null) {
        whereConditions.push('is_service = ?');
        params.push(is_service);
      }
      
      if (is_digital !== null) {
        whereConditions.push('is_digital = ?');
        params.push(is_digital);
      }
      
      if (requires_prescription !== null) {
        whereConditions.push('requires_prescription = ?');
        params.push(requires_prescription);
      }
      
      if (expiring_soon) {
        whereConditions.push('expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)');
      }
      
      if (has_discount) {
        whereConditions.push('discount_price IS NOT NULL AND discount_price < price');
      }
      
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      
      // Query para contar total
      const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
      const totalResult = await executeQuery(countQuery, params, 'Contar productos');
      const total = totalResult[0].total;
      
      // Query principal
      const query = `
        SELECT 
          id, company_id, sku, name, description, price, cost, stock,
          min_stock, max_stock, category, brand, barcode, unit_of_measure,
          weight, dimensions, tax_rate, discount_price, expiry_date,
          supplier_id, image_url, tags, is_service, is_featured, is_digital,
          requires_prescription, age_restriction, is_active,
          CASE 
            WHEN stock <= 0 THEN 'OUT_OF_STOCK'
            WHEN stock <= min_stock THEN 'LOW_STOCK'
            ELSE 'IN_STOCK'
          END as stock_status,
          CASE 
            WHEN expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(NOW(), INTERVAL 30 DAY) THEN true
            ELSE false
          END as expiring_soon,
          CASE 
            WHEN discount_price IS NOT NULL AND discount_price < price THEN true
            ELSE false
          END as has_discount,
          created_at, updated_at
        FROM products 
        ${whereClause}
        ORDER BY ${sort_by} ${sort_order}
        LIMIT ? OFFSET ?
      `;
      
      params.push(limit, offset);
      const products = await executeQuery(query, params, 'Listar productos');
      
      // Parsear campos JSON en cada producto
      const parsedProducts = products.map(product => {
        if (product.dimensions) {
          try {
            product.dimensions = JSON.parse(product.dimensions);
          } catch (e) {
            product.dimensions = null;
          }
        }
        if (product.tags) {
          try {
            product.tags = JSON.parse(product.tags);
          } catch (e) {
            product.tags = [];
          }
        }
        return product;
      });
      
      return {
        data: parsedProducts,
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
        'sku', 'name', 'description', 'price', 'cost', 'stock', 'min_stock', 'max_stock',
        'category', 'brand', 'barcode', 'unit_of_measure', 'weight', 'dimensions',
        'tax_rate', 'discount_price', 'expiry_date', 'supplier_id', 'image_url', 'tags',
        'is_service', 'is_featured', 'is_digital', 'requires_prescription', 'age_restriction', 'is_active'
      ];
      const updateFields = [];
      const params = [];
      
      // Construir query de actualización dinámicamente
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          
          // Serializar objetos y arrays para JSON
          if (key === 'dimensions' && updateData[key] !== null) {
            params.push(JSON.stringify(updateData[key]));
          } else if (key === 'tags' && updateData[key] !== null) {
            params.push(JSON.stringify(updateData[key]));
          } else {
            params.push(updateData[key]);
          }
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
          COUNT(CASE WHEN is_featured = 1 THEN 1 END) as featured_products,
          COUNT(CASE WHEN is_service = 1 THEN 1 END) as service_products,
          COUNT(CASE WHEN is_digital = 1 THEN 1 END) as digital_products,
          COUNT(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(NOW(), INTERVAL 30 DAY) THEN 1 END) as expiring_soon,
          COUNT(CASE WHEN discount_price IS NOT NULL AND discount_price < price THEN 1 END) as with_discount,
          COALESCE(SUM(CASE WHEN is_service = 0 THEN stock * cost ELSE 0 END), 0) as total_inventory_value,
          COALESCE(AVG(price), 0) as average_price,
          COALESCE(SUM(CASE WHEN is_service = 0 THEN stock ELSE 0 END), 0) as total_stock_units,
          COUNT(DISTINCT category) as unique_categories,
          COUNT(DISTINCT brand) as unique_brands
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
  
  /**
   * Buscar productos por código de barras
   * @param {string} barcode - Código de barras
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Producto encontrado o null
   */
  static async findByBarcode(barcode, companyId) {
    try {
      const query = `
        SELECT 
          id, company_id, sku, name, description, price, cost, stock,
          min_stock, max_stock, category, brand, barcode, unit_of_measure,
          weight, dimensions, tax_rate, discount_price, expiry_date,
          supplier_id, image_url, tags, is_service, is_featured, is_digital,
          requires_prescription, age_restriction, is_active, created_at, updated_at
        FROM products 
        WHERE barcode = ? AND company_id = ? AND is_active = 1
      `;
      
      const products = await executeQuery(query, [barcode, companyId], 'Buscar producto por código de barras');
      
      if (products.length > 0) {
        const product = products[0];
        // Parsear campos JSON
        if (product.dimensions) {
          try {
            product.dimensions = JSON.parse(product.dimensions);
          } catch (e) {
            product.dimensions = null;
          }
        }
        if (product.tags) {
          try {
            product.tags = JSON.parse(product.tags);
          } catch (e) {
            product.tags = [];
          }
        }
        return product;
      }
      
      return null;
    } catch (error) {
      logger.error('Error buscando producto por código de barras:', {
        error: error.message,
        barcode,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Actualizar precios de forma masiva
   * @param {string} companyId - ID de la empresa
   * @param {Array} products - Array de objetos {id, price, cost}
   * @returns {Promise<Array>} Productos actualizados
   */
  static async updateBulkPrices(companyId, products) {
    try {
      return await executeTransaction(async (connection) => {
        const updatedProducts = [];
        
        for (const product of products) {
          const { id, price, cost } = product;
          
          // Actualizar precio y costo
          await connection.execute(
            'UPDATE products SET price = ?, cost = ?, updated_at = ? WHERE id = ? AND company_id = ?',
            [price, cost || null, new Date(), id, companyId]
          );
          
          // Obtener producto actualizado
          const [updatedProduct] = await connection.execute(
            'SELECT * FROM products WHERE id = ? AND company_id = ?',
            [id, companyId]
          );
          
          if (updatedProduct.length > 0) {
            updatedProducts.push(updatedProduct[0]);
          }
        }
        
        return updatedProducts;
      });
    } catch (error) {
      logger.error('Error actualizando precios masivamente:', {
        error: error.message,
        companyId,
        products
      });
      throw error;
    }
  }
  
  /**
   * Obtener productos que requieren reabastecimiento
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Array>} Lista de productos para reabastecer
   */
  static async getReorderList(companyId) {
    try {
      const query = `
        SELECT 
          id, sku, name, stock, min_stock, max_stock,
          (max_stock - stock) as suggested_quantity,
          cost, (max_stock - stock) * cost as estimated_cost
        FROM products 
        WHERE company_id = ? 
          AND is_active = 1
          AND is_service = 0
          AND stock <= min_stock
          AND max_stock IS NOT NULL
        ORDER BY (stock / NULLIF(min_stock, 0)) ASC, name ASC
      `;
      
      return await executeQuery(query, [companyId], 'Obtener lista de reabastecimiento');
    } catch (error) {
      logger.error('Error obteniendo lista de reabastecimiento:', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Obtener productos por proveedor
   * @param {string} companyId - ID de la empresa
   * @param {string} supplierId - ID del proveedor
   * @returns {Promise<Array>} Lista de productos del proveedor
   */
  static async findBySupplier(companyId, supplierId) {
    try {
      const query = `
        SELECT 
          id, sku, name, stock, min_stock, price, cost, is_active
        FROM products 
        WHERE company_id = ? AND supplier_id = ?
        ORDER BY name ASC
      `;
      
      return await executeQuery(query, [companyId, supplierId], 'Buscar productos por proveedor');
    } catch (error) {
      logger.error('Error buscando productos por proveedor:', {
        error: error.message,
        companyId,
        supplierId
      });
      throw error;
    }
  }
  
  /**
   * Verificar si código de barras ya existe
   * @param {string} barcode - Código de barras a verificar
   * @param {string} companyId - ID de la empresa
   * @param {string} excludeProductId - ID de producto a excluir (para updates)
   * @returns {Promise<boolean>} True si el código de barras ya existe
   */
  static async barcodeExists(barcode, companyId, excludeProductId = null) {
    try {
      let query = `
        SELECT COUNT(*) as count 
        FROM products 
        WHERE barcode = ? AND company_id = ?
      `;
      
      let params = [barcode, companyId];
      
      if (excludeProductId) {
        query += ' AND id != ?';
        params.push(excludeProductId);
      }
      
      const result = await executeQuery(query, params, 'Verificar existencia de código de barras');
      return result[0].count > 0;
    } catch (error) {
      logger.error('Error verificando existencia de código de barras:', {
        error: error.message,
        barcode,
        companyId,
        excludeProductId
      });
      throw error;
    }
  }
}

module.exports = ProductModel;