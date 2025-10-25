/**
 * Controlador de Productos
 * Sistema POS Multitenant
 */

const ProductService = require('../services/productService');
const { logger } = require('../middlewares/logger');

class ProductController {
  /**
   * Crear nuevo producto
   */
  async createProduct(req, res, next) {
    try {
      const productData = req.body;
      const companyId = req.user.companyId;

      logger.info('Creando producto:', {
        name: productData.name,
        sku: productData.sku,
        companyId
      });

      const product = await ProductService.createProduct(productData, companyId);

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: product
      });

    } catch (error) {
      logger.error('Error creando producto:', {
        error: error.message,
        companyId: req.user?.companyId
      });
      
      if (error.message.includes('Ya existe')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      next(error);
    }
  }

  /**
   * Obtener producto por ID
   */
  async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const product = await ProductService.getProductById(id, companyId);

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Error obteniendo producto:', {
        productId: req.params.id,
        companyId: req.user?.companyId,
        error: error.message
      });
      
      if (error.message === 'Producto no encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      next(error);
    }
  }

  /**
   * Obtener producto por SKU
   */
  async getProductBySku(req, res, next) {
    try {
      const { sku } = req.params;
      const companyId = req.user.companyId;

      const product = await ProductService.getProductBySku(sku, companyId);

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Error obteniendo producto por SKU:', {
        sku: req.params.sku,
        companyId: req.user?.companyId,
        error: error.message
      });
      
      if (error.message === 'Producto no encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      next(error);
    }
  }

  /**
   * Obtener producto por código de barras
   */
  async getProductByBarcode(req, res, next) {
    try {
      const { barcode } = req.params;
      const companyId = req.user.companyId;

      const product = await ProductService.getProductByBarcode(barcode, companyId);

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Error obteniendo producto por código de barras:', {
        barcode: req.params.barcode,
        companyId: req.user?.companyId,
        error: error.message
      });
      
      if (error.message === 'Producto no encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      next(error);
    }
  }

  /**
   * Listar productos con filtros y paginación
   */
  async getProducts(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const options = req.query;

      logger.info('Listando productos:', { companyId, options });

      const result = await ProductService.getProducts(options, companyId);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Error listando productos:', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Buscar productos
   */
  async searchProducts(req, res, next) {
    try {
      const { search } = req.query;
      const companyId = req.user.companyId;
      const limit = parseInt(req.query.limit) || 20;

      if (!search || search.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Término de búsqueda requerido'
        });
      }

      const products = await ProductService.searchProducts(search.trim(), companyId, limit);

      res.json({
        success: true,
        data: products
      });

    } catch (error) {
      logger.error('Error buscando productos:', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Actualizar producto
   */
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const companyId = req.user.companyId;

      logger.info('Actualizando producto:', { productId: id, companyId });

      const product = await ProductService.updateProduct(id, updateData, companyId);

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: product
      });

    } catch (error) {
      logger.error('Error actualizando producto:', {
        productId: req.params.id,
        companyId: req.user?.companyId,
        error: error.message
      });
      
      if (error.message === 'Producto no encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('Ya existe')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      next(error);
    }
  }

  /**
   * Eliminar producto (soft delete)
   */
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      logger.info('Eliminando producto:', { productId: id, companyId });

      await ProductService.deleteProduct(id, companyId);

      res.json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });

    } catch (error) {
      logger.error('Error eliminando producto:', {
        productId: req.params.id,
        companyId: req.user?.companyId,
        error: error.message
      });
      
      if (error.message === 'Producto no encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      next(error);
    }
  }

  /**
   * Activar/Desactivar producto
   */
  async toggleProductStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      const companyId = req.user.companyId;

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'El campo is_active debe ser true o false'
        });
      }

      const product = await ProductService.toggleProductStatus(id, is_active, companyId);

      res.json({
        success: true,
        message: `Producto ${is_active ? 'activado' : 'desactivado'} exitosamente`,
        data: product
      });

    } catch (error) {
      logger.error('Error cambiando estado de producto:', {
        productId: req.params.id,
        companyId: req.user?.companyId,
        error: error.message
      });
      
      if (error.message === 'Producto no encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      next(error);
    }
  }

  /**
   * Ajustar stock del producto
   */
  async adjustStock(req, res, next) {
    try {
      const { id } = req.params;
      const { adjustment, reason } = req.body;
      const companyId = req.user.companyId;

      const product = await ProductService.adjustProductStock(id, adjustment, reason, companyId);

      res.json({
        success: true,
        message: 'Stock ajustado exitosamente',
        data: product
      });

    } catch (error) {
      logger.error('Error ajustando stock:', {
        productId: req.params.id,
        companyId: req.user?.companyId,
        error: error.message
      });
      
      if (error.message === 'Producto no encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('stock negativo')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      next(error);
    }
  }

  /**
   * Actualización masiva de precios
   */
  async bulkUpdatePrices(req, res, next) {
    try {
      const { products } = req.body;
      const companyId = req.user.companyId;

      const result = await ProductService.bulkUpdatePricesOptimized(products, companyId);

      res.json({
        success: true,
        message: 'Precios actualizados exitosamente',
        data: result
      });

    } catch (error) {
      logger.error('Error en actualización masiva de precios:', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener productos con stock bajo
   */
  async getLowStockProducts(req, res, next) {
    try {
      const companyId = req.user.companyId;

      const products = await ProductService.getLowStockProducts(companyId);

      res.json({
        success: true,
        data: products
      });

    } catch (error) {
      logger.error('Error obteniendo productos con stock bajo:', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener estadísticas de productos
   */
  async getProductStats(req, res, next) {
    try {
      const companyId = req.user.companyId;

      const stats = await ProductService.getProductStats(companyId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error obteniendo estadísticas de productos:', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener lista de reabastecimiento
   */
  async getReorderList(req, res, next) {
    try {
      const companyId = req.user.companyId;

      const reorderList = await ProductService.getReorderList(companyId);

      res.json({
        success: true,
        data: reorderList
      });

    } catch (error) {
      logger.error('Error obteniendo lista de reabastecimiento:', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener productos por proveedor
   */
  async getProductsBySupplier(req, res, next) {
    try {
      const { supplierId } = req.params;
      const companyId = req.user.companyId;

      const products = await ProductService.getProductsBySupplier(supplierId, companyId);

      res.json({
        success: true,
        data: products
      });

    } catch (error) {
      logger.error('Error obteniendo productos por proveedor:', {
        supplierId: req.params.supplierId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener productos próximos a vencer
   */
  async getExpiringProducts(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const days = parseInt(req.query.days) || 30;

      const products = await ProductService.getExpiringProducts(companyId, days);

      res.json({
        success: true,
        data: products
      });

    } catch (error) {
      logger.error('Error obteniendo productos próximos a vencer:', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener productos con descuento
   */
  async getDiscountedProducts(req, res, next) {
    try {
      const companyId = req.user.companyId;

      const products = await ProductService.getDiscountedProducts(companyId);

      res.json({
        success: true,
        data: products
      });

    } catch (error) {
      logger.error('Error obteniendo productos con descuento:', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Duplicar producto
   */
  async duplicateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const overrides = req.body;
      const companyId = req.user.companyId;

      const duplicatedProduct = await ProductService.duplicateProduct(id, companyId, overrides);

      res.status(201).json({
        success: true,
        message: 'Producto duplicado exitosamente',
        data: duplicatedProduct
      });

    } catch (error) {
      logger.error('Error duplicando producto:', {
        productId: req.params.id,
        companyId: req.user?.companyId,
        error: error.message
      });
      
      if (error.message === 'Producto original no encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('ya existe')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      next(error);
    }
  }

  /**
   * Validar disponibilidad de productos
   */
  async validateProductsAvailability(req, res, next) {
    try {
      const { products } = req.body;
      const companyId = req.user.companyId;

      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar una lista de productos'
        });
      }

      const validation = await ProductService.validateProductsAvailability(products, companyId);

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      logger.error('Error validando disponibilidad de productos:', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }
}

module.exports = new ProductController();