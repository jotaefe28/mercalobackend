/**
 * Servicio de Productos
 * Sistema POS Multitenant
 */

const Product = require('../models/Product');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES, STOCK_STATUS } = require('../utils/constants');

class ProductService {
  /**
   * Crear nuevo producto
   */
  async createProduct(productData, companyId, createdBy) {
    try {
      logger.info('Creando nuevo producto', {
        name: productData.name,
        sku: productData.sku,
        companyId,
        createdBy
      });

      // Verificar que no exista el SKU en la empresa
      if (productData.sku) {
        const existingProduct = await Product.findBySku(productData.sku, companyId);
        if (existingProduct) {
          throw {
            code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
            message: 'El SKU ya existe'
          };
        }
      }

      // Verificar límites del plan
      const { canCreate } = await Product.checkPlanLimits(companyId);
      if (!canCreate) {
        throw {
          code: ERROR_CODES.BUSINESS_RULE_VIOLATION,
          message: 'Se ha alcanzado el límite de productos para su plan'
        };
      }

      // Agregar datos adicionales
      const productWithCompany = {
        ...productData,
        company_id: companyId,
        created_by: createdBy
      };

      // Crear producto
      const product = await Product.create(productWithCompany);

      logger.info('Producto creado exitosamente', {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        companyId
      });

      return product;

    } catch (error) {
      logger.error('Error creando producto', {
        name: productData.name,
        sku: productData.sku,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener producto por ID
   */
  async getProductById(productId, companyId) {
    try {
      const product = await Product.findByIdAndCompany(productId, companyId);
      if (!product) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Producto no encontrado'
        };
      }

      // Agregar estado del stock
      product.stock_status = this.getStockStatus(product.current_stock, product.min_stock);

      return product;

    } catch (error) {
      logger.error('Error obteniendo producto', {
        productId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener producto por SKU
   */
  async getProductBySku(sku, companyId) {
    try {
      const product = await Product.findBySku(sku, companyId);
      if (!product) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Producto no encontrado'
        };
      }

      // Agregar estado del stock
      product.stock_status = this.getStockStatus(product.current_stock, product.min_stock);

      return product;

    } catch (error) {
      logger.error('Error obteniendo producto por SKU', {
        sku,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Listar productos
   */
  async getProducts(companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        category = null,
        isActive = null,
        lowStock = false,
        sortBy = 'name',
        sortOrder = 'asc'
      } = options;

      logger.info('Listando productos', {
        companyId,
        page,
        limit,
        search,
        category,
        isActive,
        lowStock,
        sortBy,
        sortOrder
      });

      const filters = { company_id: companyId };
      
      if (category) filters.category = category;
      if (isActive !== null) filters.is_active = isActive;

      const result = await Product.findAll(filters, {
        page,
        limit,
        search,
        searchFields: ['name', 'sku', 'description'],
        sortBy,
        sortOrder,
        lowStock
      });

      // Agregar estado del stock a cada producto
      result.data = result.data.map(product => ({
        ...product,
        stock_status: this.getStockStatus(product.current_stock, product.min_stock)
      }));

      logger.info('Productos listados exitosamente', {
        companyId,
        total: result.total,
        returned: result.data.length
      });

      return result;

    } catch (error) {
      logger.error('Error listando productos', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Actualizar producto
   */
  async updateProduct(productId, updateData, companyId, updatedBy) {
    try {
      logger.info('Actualizando producto', {
        productId,
        companyId,
        updatedBy
      });

      // Verificar que el producto existe
      const existingProduct = await Product.findByIdAndCompany(productId, companyId);
      if (!existingProduct) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Producto no encontrado'
        };
      }

      // Si se actualiza el SKU, verificar que no esté en uso
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const skuInUse = await Product.findBySku(updateData.sku, companyId);
        if (skuInUse) {
          throw {
            code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
            message: 'El SKU ya está en uso'
          };
        }
      }

      // Preparar datos de actualización
      const dataToUpdate = {
        ...updateData,
        updated_by: updatedBy,
        updated_at: new Date()
      };

      // Actualizar producto
      const updatedProduct = await Product.update(productId, dataToUpdate);

      // Agregar estado del stock
      updatedProduct.stock_status = this.getStockStatus(
        updatedProduct.current_stock, 
        updatedProduct.min_stock
      );

      logger.info('Producto actualizado exitosamente', {
        productId,
        companyId
      });

      return updatedProduct;

    } catch (error) {
      logger.error('Error actualizando producto', {
        productId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cambiar estado activo/inactivo del producto
   */
  async toggleProductStatus(productId, companyId, updatedBy) {
    try {
      logger.info('Cambiando estado de producto', {
        productId,
        companyId,
        updatedBy
      });

      // Verificar que el producto existe
      const product = await Product.findByIdAndCompany(productId, companyId);
      if (!product) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Producto no encontrado'
        };
      }

      const newStatus = !product.is_active;
      const updatedProduct = await Product.update(productId, {
        is_active: newStatus,
        updated_by: updatedBy,
        updated_at: new Date()
      });

      // Agregar estado del stock
      updatedProduct.stock_status = this.getStockStatus(
        updatedProduct.current_stock, 
        updatedProduct.min_stock
      );

      logger.info('Estado de producto cambiado exitosamente', {
        productId,
        newStatus,
        companyId
      });

      return updatedProduct;

    } catch (error) {
      logger.error('Error cambiando estado de producto', {
        productId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Actualizar stock del producto
   */
  async updateStock(productId, quantity, type, reason, companyId, updatedBy) {
    try {
      logger.info('Actualizando stock de producto', {
        productId,
        quantity,
        type,
        reason,
        companyId,
        updatedBy
      });

      // Verificar que el producto existe
      const product = await Product.findByIdAndCompany(productId, companyId);
      if (!product) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Producto no encontrado'
        };
      }

      // Calcular nuevo stock
      let newStock;
      if (type === 'IN') {
        newStock = product.current_stock + quantity;
      } else if (type === 'OUT') {
        if (product.current_stock < quantity) {
          throw {
            code: ERROR_CODES.INSUFFICIENT_STOCK,
            message: 'Stock insuficiente'
          };
        }
        newStock = product.current_stock - quantity;
      } else { // ADJUSTMENT
        newStock = quantity;
      }

      // Actualizar stock
      const updatedProduct = await Product.updateStock(productId, newStock, {
        quantity,
        type,
        reason,
        updatedBy
      });

      // Agregar estado del stock
      updatedProduct.stock_status = this.getStockStatus(
        updatedProduct.current_stock, 
        updatedProduct.min_stock
      );

      logger.info('Stock de producto actualizado exitosamente', {
        productId,
        oldStock: product.current_stock,
        newStock: updatedProduct.current_stock,
        companyId
      });

      return updatedProduct;

    } catch (error) {
      logger.error('Error actualizando stock de producto', {
        productId,
        quantity,
        type,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener productos con stock bajo
   */
  async getLowStockProducts(companyId) {
    try {
      logger.info('Obteniendo productos con stock bajo', { companyId });

      const lowStockProducts = await Product.getLowStockProducts(companyId);

      // Agregar estado del stock
      const productsWithStatus = lowStockProducts.map(product => ({
        ...product,
        stock_status: this.getStockStatus(product.current_stock, product.min_stock)
      }));

      logger.info('Productos con stock bajo obtenidos', {
        companyId,
        count: productsWithStatus.length
      });

      return productsWithStatus;

    } catch (error) {
      logger.error('Error obteniendo productos con stock bajo', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener historial de movimientos de stock
   */
  async getStockHistory(productId, companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        dateFrom = null,
        dateTo = null
      } = options;

      logger.info('Obteniendo historial de stock', {
        productId,
        companyId,
        page,
        limit,
        dateFrom,
        dateTo
      });

      // Verificar que el producto existe
      const product = await Product.findByIdAndCompany(productId, companyId);
      if (!product) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Producto no encontrado'
        };
      }

      const history = await Product.getStockHistory(productId, {
        page,
        limit,
        dateFrom,
        dateTo
      });

      logger.info('Historial de stock obtenido', {
        productId,
        companyId,
        total: history.total,
        returned: history.data.length
      });

      return history;

    } catch (error) {
      logger.error('Error obteniendo historial de stock', {
        productId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener categorías de productos
   */
  async getCategories(companyId) {
    try {
      logger.info('Obteniendo categorías de productos', { companyId });

      const categories = await Product.getCategories(companyId);

      logger.info('Categorías de productos obtenidas', {
        companyId,
        count: categories.length
      });

      return categories;

    } catch (error) {
      logger.error('Error obteniendo categorías de productos', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Determinar estado del stock
   */
  getStockStatus(currentStock, minStock) {
    if (currentStock <= 0) {
      return STOCK_STATUS.OUT_OF_STOCK;
    } else if (currentStock <= minStock) {
      return STOCK_STATUS.LOW_STOCK;
    } else {
      return STOCK_STATUS.IN_STOCK;
    }
  }

  /**
   * Validar disponibilidad de productos para venta
   */
  async validateProductsAvailability(products, companyId) {
    try {
      const validationResults = [];

      for (const item of products) {
        const product = await Product.findByIdAndCompany(item.product_id, companyId);
        
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

        if (product.current_stock < item.quantity) {
          validationResults.push({
            product_id: item.product_id,
            valid: false,
            error: 'Stock insuficiente',
            available_stock: product.current_stock,
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
            current_stock: product.current_stock
          }
        });
      }

      return validationResults;

    } catch (error) {
      logger.error('Error validando disponibilidad de productos', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new ProductService();