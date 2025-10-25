/**
 * Servicio de Productos
 * Sistema POS Multitenant
 */

const Product = require('../models/product.model');
const { logger } = require('../middlewares/logger');
const { v4: uuidv4 } = require('uuid');

class ProductService {
  /**
   * Crear un nuevo producto
   * @param {Object} productData - Datos del producto
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Producto creado
   */
  static async createProduct(productData, companyId) {
    try {
      // Verificar si el SKU ya existe
      const existingSKU = await Product.skuExists(productData.sku, companyId);
      if (existingSKU) {
        throw new Error('Ya existe un producto con este SKU');
      }
      
      // Verificar si el código de barras ya existe (si se proporciona)
      if (productData.barcode) {
        const existingBarcode = await Product.barcodeExists(productData.barcode, companyId);
        if (existingBarcode) {
          throw new Error('Ya existe un producto con este código de barras');
        }
      }
      
      // Crear el producto
      const product = await Product.create(productData, companyId);
      
      logger.info('Producto creado exitosamente:', {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        companyId
      });
      
      return product;
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
   * Obtener producto por ID
   * @param {string} productId - ID del producto
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Producto encontrado
   */
  static async getProductById(productId, companyId) {
    try {
      const product = await Product.findById(productId, companyId);
      if (!product) {
        throw new Error('Producto no encontrado');
      }

      // Agregar estado del stock
      product.stock_status = this.getStockStatus(product.stock, product.min_stock);

      return product;
    } catch (error) {
      logger.error('Error obteniendo producto por ID:', {
        error: error.message,
        productId,
        companyId
      });
      throw error;
    }
  }

  /**
   * Obtener producto por SKU
   * @param {string} sku - SKU del producto
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Producto encontrado
   */
  static async getProductBySku(sku, companyId) {
    try {
      const product = await Product.findBySku(sku, companyId);
      if (!product) {
        throw new Error('Producto no encontrado');
      }

      // Agregar estado del stock
      product.stock_status = this.getStockStatus(product.stock, product.min_stock);

      return product;
    } catch (error) {
      logger.error('Error obteniendo producto por SKU:', {
        error: error.message,
        sku,
        companyId
      });
      throw error;
    }
  }

  /**
   * Obtener lista de productos con filtros y paginación
   * @param {Object} options - Opciones de filtrado
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Lista de productos paginada
   */
  static async getProducts(options, companyId) {
    try {
      const result = await Product.findAll(companyId, options);
      
      // Agregar estado del stock a cada producto
      result.data = result.data.map(product => ({
        ...product,
        stock_status: this.getStockStatus(product.stock, product.min_stock)
      }));

      logger.info('Productos obtenidos exitosamente:', {
        companyId,
        total: result.pagination.total,
        returned: result.data.length
      });

      return result;
    } catch (error) {
      logger.error('Error obteniendo lista de productos:', {
        error: error.message,
        options,
        companyId
      });
      throw error;
    }
  }

  /**
   * Buscar productos
   * @param {string} term - Término de búsqueda
   * @param {string} companyId - ID de la empresa
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>} Lista de productos encontrados
   */
  static async searchProducts(term, companyId, limit = 20) {
    try {
      const products = await Product.search(companyId, term, limit);
      
      // Agregar estado del stock a cada producto
      const productsWithStatus = products.map(product => ({
        ...product,
        stock_status: this.getStockStatus(product.stock, product.min_stock)
      }));

      logger.info('Búsqueda de productos realizada:', {
        companyId,
        term,
        found: productsWithStatus.length
      });

      return productsWithStatus;
    } catch (error) {
      logger.error('Error buscando productos:', {
        error: error.message,
        term,
        companyId
      });
      throw error;
    }
  }

  /**
   * Actualizar producto
   * @param {string} productId - ID del producto
   * @param {Object} updateData - Datos a actualizar
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Producto actualizado
   */
  static async updateProduct(productId, updateData, companyId) {
    try {
      // Verificar que el producto existe
      const existingProduct = await Product.findById(productId, companyId);
      if (!existingProduct) {
        throw new Error('Producto no encontrado');
      }

      // Si se actualiza el SKU, verificar que no esté en uso por otro producto
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const skuExists = await Product.skuExists(updateData.sku, companyId, productId);
        if (skuExists) {
          throw new Error('Ya existe otro producto con este SKU');
        }
      }
      
      // Si se actualiza el código de barras, verificar que no esté en uso por otro producto
      if (updateData.barcode && updateData.barcode !== existingProduct.barcode) {
        const barcodeExists = await Product.barcodeExists(updateData.barcode, companyId, productId);
        if (barcodeExists) {
          throw new Error('Ya existe otro producto con este código de barras');
        }
      }

      // Actualizar producto
      const updatedProduct = await Product.update(productId, companyId, updateData);

      // Agregar estado del stock
      updatedProduct.stock_status = this.getStockStatus(
        updatedProduct.stock, 
        updatedProduct.min_stock
      );

      logger.info('Producto actualizado exitosamente:', {
        productId,
        companyId,
        updateData
      });

      return updatedProduct;
    } catch (error) {
      logger.error('Error actualizando producto:', {
        error: error.message,
        productId,
        updateData,
        companyId
      });
      throw error;
    }
  }

  /**
   * Eliminar producto (soft delete)
   * @param {string} productId - ID del producto
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async deleteProduct(productId, companyId) {
    try {
      // Verificar que el producto existe
      const existingProduct = await Product.findById(productId, companyId);
      if (!existingProduct) {
        throw new Error('Producto no encontrado');
      }

      // Eliminar producto (soft delete)
      const result = await Product.delete(productId, companyId);

      logger.info('Producto eliminado exitosamente:', {
        productId,
        companyId
      });

      return result;
    } catch (error) {
      logger.error('Error eliminando producto:', {
        error: error.message,
        productId,
        companyId
      });
      throw error;
    }
  }

  /**
   * Activar/Desactivar producto
   * @param {string} productId - ID del producto
   * @param {boolean} isActive - Estado activo
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Producto actualizado
   */
  static async toggleProductStatus(productId, isActive, companyId) {
    try {
      const updateData = { is_active: isActive };
      const updatedProduct = await this.updateProduct(productId, updateData, companyId);

      logger.info('Estado de producto actualizado:', {
        productId,
        companyId,
        isActive
      });

      return updatedProduct;
    } catch (error) {
      logger.error('Error actualizando estado de producto:', {
        error: error.message,
        productId,
        isActive,
        companyId
      });
      throw error;
    }
  }

  /**
   * Ajustar stock del producto
   * @param {string} productId - ID del producto
   * @param {number} adjustment - Ajuste de stock (positivo o negativo)
   * @param {string} reason - Razón del ajuste
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Producto actualizado
   */
  static async adjustProductStock(productId, adjustment, reason, companyId) {
    try {
      const updatedProduct = await Product.adjustStock(productId, companyId, adjustment, reason);

      // Agregar estado del stock
      updatedProduct.stock_status = this.getStockStatus(
        updatedProduct.stock, 
        updatedProduct.min_stock
      );

      logger.info('Stock de producto ajustado exitosamente:', {
        productId,
        companyId,
        adjustment,
        reason,
        newStock: updatedProduct.stock
      });

      return updatedProduct;
    } catch (error) {
      logger.error('Error ajustando stock de producto:', {
        error: error.message,
        productId,
        adjustment,
        reason,
        companyId
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
      const lowStockProducts = await Product.getLowStockProducts(companyId);

      // Agregar estado del stock
      const productsWithStatus = lowStockProducts.map(product => ({
        ...product,
        stock_status: this.getStockStatus(product.stock, product.min_stock)
      }));

      logger.info('Productos con stock bajo obtenidos:', {
        companyId,
        count: productsWithStatus.length
      });

      return productsWithStatus;
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
  static async getProductStats(companyId) {
    try {
      const stats = await Product.getStats(companyId);

      logger.info('Estadísticas de productos obtenidas:', {
        companyId,
        totalProducts: stats.total_products
      });

      return stats;
    } catch (error) {
      logger.error('Error obteniendo estadísticas de productos:', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }

  /**
   * Actualización masiva de precios
   * @param {Array} products - Lista de productos con nuevos precios
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Resultado de la actualización
   */
  static async bulkUpdatePrices(products, companyId) {
    try {
      const results = {
        updated: [],
        failed: [],
        total: products.length
      };

      for (const productUpdate of products) {
        try {
          const updatedProduct = await this.updateProduct(
            productUpdate.id, 
            { 
              price: productUpdate.price,
              cost: productUpdate.cost || undefined
            }, 
            companyId
          );
          results.updated.push(updatedProduct);
        } catch (error) {
          results.failed.push({
            id: productUpdate.id,
            error: error.message
          });
        }
      }

      logger.info('Actualización masiva de precios completada:', {
        companyId,
        total: results.total,
        updated: results.updated.length,
        failed: results.failed.length
      });

      return results;
    } catch (error) {
      logger.error('Error en actualización masiva de precios:', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }

  /**
   * Determinar estado del stock
   * @param {number} currentStock - Stock actual
   * @param {number} minStock - Stock mínimo
   * @returns {string} Estado del stock
   */
  static getStockStatus(currentStock, minStock) {
    if (currentStock <= 0) {
      return 'out_of_stock';
    } else if (currentStock <= minStock) {
      return 'low_stock';
    } else {
      return 'in_stock';
    }
  }

  /**
   * Validar disponibilidad de productos para venta
   * @param {Array} products - Lista de productos a validar
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Array>} Resultados de la validación
   */
  static async validateProductsAvailability(products, companyId) {
    try {
      const validationResults = [];

      for (const item of products) {
        const product = await Product.findById(item.product_id, companyId);
        
        if (!product) {
          validationResults.push({
            product_id: item.product_id,
            valid: false,
            error: 'Producto no encontrado'
          });
          continue;
        }

        if (!product.is_active) {
          validationResults.push({
            product_id: item.product_id,
            valid: false,
            error: 'Producto inactivo'
          });
          continue;
        }

        if (product.stock < item.quantity) {
          validationResults.push({
            product_id: item.product_id,
            valid: false,
            error: 'Stock insuficiente',
            available_stock: product.stock,
            requested_quantity: item.quantity
          });
          continue;
        }

        validationResults.push({
          product_id: item.product_id,
          valid: true,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock
          }
        });
      }

      return validationResults;
    } catch (error) {
      logger.error('Error validando disponibilidad de productos:', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Obtener producto por código de barras
   * @param {string} barcode - Código de barras del producto
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Producto encontrado
   */
  static async getProductByBarcode(barcode, companyId) {
    try {
      const product = await Product.findByBarcode(barcode, companyId);
      if (!product) {
        throw new Error('Producto no encontrado');
      }

      // Agregar estado del stock
      product.stock_status = this.getStockStatus(product.stock, product.min_stock);

      return product;
    } catch (error) {
      logger.error('Error obteniendo producto por código de barras:', {
        error: error.message,
        barcode,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Actualización masiva de precios optimizada
   * @param {Array} products - Lista de productos con nuevos precios
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Resultado de la actualización
   */
  static async bulkUpdatePricesOptimized(products, companyId) {
    try {
      const updatedProducts = await Product.updateBulkPrices(companyId, products);
      
      logger.info('Actualización masiva de precios completada:', {
        companyId,
        total: products.length,
        updated: updatedProducts.length
      });

      return {
        updated: updatedProducts,
        total: products.length,
        success: true
      };
    } catch (error) {
      logger.error('Error en actualización masiva de precios:', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Obtener lista de reabastecimiento
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Array>} Lista de productos para reabastecer
   */
  static async getReorderList(companyId) {
    try {
      const reorderList = await Product.getReorderList(companyId);
      
      logger.info('Lista de reabastecimiento obtenida:', {
        companyId,
        count: reorderList.length
      });

      return reorderList;
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
   * @param {string} supplierId - ID del proveedor
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Array>} Lista de productos del proveedor
   */
  static async getProductsBySupplier(supplierId, companyId) {
    try {
      const products = await Product.findBySupplier(companyId, supplierId);
      
      logger.info('Productos por proveedor obtenidos:', {
        companyId,
        supplierId,
        count: products.length
      });

      return products;
    } catch (error) {
      logger.error('Error obteniendo productos por proveedor:', {
        error: error.message,
        supplierId,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Obtener productos próximos a vencer
   * @param {string} companyId - ID de la empresa
   * @param {number} days - Días de anticipación (default: 30)
   * @returns {Promise<Array>} Lista de productos próximos a vencer
   */
  static async getExpiringProducts(companyId, days = 30) {
    try {
      const options = {
        expiring_soon: true,
        is_active: true,
        sort_by: 'expiry_date',
        sort_order: 'ASC',
        limit: 100
      };
      
      const result = await Product.findAll(companyId, options);
      
      logger.info('Productos próximos a vencer obtenidos:', {
        companyId,
        days,
        count: result.data.length
      });

      return result.data;
    } catch (error) {
      logger.error('Error obteniendo productos próximos a vencer:', {
        error: error.message,
        companyId,
        days
      });
      throw error;
    }
  }
  
  /**
   * Obtener productos con descuento
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Array>} Lista de productos con descuento
   */
  static async getDiscountedProducts(companyId) {
    try {
      const options = {
        has_discount: true,
        is_active: true,
        sort_by: 'discount_price',
        sort_order: 'ASC',
        limit: 100
      };
      
      const result = await Product.findAll(companyId, options);
      
      logger.info('Productos con descuento obtenidos:', {
        companyId,
        count: result.data.length
      });

      return result.data;
    } catch (error) {
      logger.error('Error obteniendo productos con descuento:', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Duplicar producto
   * @param {string} productId - ID del producto a duplicar
   * @param {string} companyId - ID de la empresa
   * @param {Object} overrides - Campos a sobrescribir en el duplicado
   * @returns {Promise<Object>} Producto duplicado
   */
  static async duplicateProduct(productId, companyId, overrides = {}) {
    try {
      const originalProduct = await Product.findById(productId, companyId);
      if (!originalProduct) {
        throw new Error('Producto original no encontrado');
      }

      // Crear nuevo SKU único
      const newSku = overrides.sku || `${originalProduct.sku}-COPY`;
      
      // Verificar que el nuevo SKU no exista
      const skuExists = await Product.skuExists(newSku, companyId);
      if (skuExists) {
        throw new Error('El SKU para el producto duplicado ya existe');
      }

      // Preparar datos del nuevo producto
      const productData = {
        ...originalProduct,
        id: undefined,
        sku: newSku,
        name: overrides.name || `${originalProduct.name} - Copia`,
        stock: overrides.stock || 0,
        barcode: overrides.barcode || null, // Limpiar código de barras para evitar duplicados
        created_at: undefined,
        updated_at: undefined,
        ...overrides
      };

      const duplicatedProduct = await Product.create(productData, companyId);
      
      logger.info('Producto duplicado exitosamente:', {
        originalId: productId,
        duplicatedId: duplicatedProduct.id,
        companyId
      });

      return duplicatedProduct;
    } catch (error) {
      logger.error('Error duplicando producto:', {
        error: error.message,
        productId,
        companyId
      });
      throw error;
    }
  }
}

module.exports = ProductService;