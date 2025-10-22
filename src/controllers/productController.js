/**
 * Controlador de Productos
 * Sistema POS Multitenant
 */

const productService = require('../services/productService');
const { validationResult } = require('express-validator');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../utils/constants');

class ProductController {
  /**
   * Crear nuevo producto
   */
  async createProduct(req, res, next) {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const productData = req.body;
      const companyId = req.user.companyId;
      const createdBy = req.user.userId;

      logger.info('Creando producto', {
        name: productData.name,
        sku: productData.sku,
        companyId,
        createdBy
      });

      const product = await productService.createProduct(productData, companyId, createdBy);

      logger.info('Producto creado exitosamente', {
        productId: product.id,
        name: product.name,
        sku: product.sku
      });

      res.status(201).json({
        success: true,
        message: RESPONSE_MESSAGES.CREATED,
        data: product
      });

    } catch (error) {
      logger.error('Error creando producto', {
        error: error.message,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Obtener producto por ID
   */
  async getProductById(req, res, next) {
    try {
      const { productId } = req.params;
      const companyId = req.user.companyId;

      const product = await productService.getProductById(productId, companyId);

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Error obteniendo producto', {
        productId: req.params.productId,
        companyId: req.user?.companyId,
        error: error.message
      });
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

      const product = await productService.getProductBySku(sku, companyId);

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Error obteniendo producto por SKU', {
        sku: req.params.sku,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Listar productos
   */
  async getProducts(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        search: req.query.search || '',
        category: req.query.category || null,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : null,
        lowStock: req.query.lowStock === 'true',
        sortBy: req.query.sortBy || 'name',
        sortOrder: req.query.sortOrder || 'asc'
      };

      logger.info('Listando productos', {
        companyId,
        options
      });

      const result = await productService.getProducts(companyId, options);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: options.page,
          limit: options.limit,
          total: result.total,
          pages: Math.ceil(result.total / options.limit)
        }
      });

    } catch (error) {
      logger.error('Error listando productos', {
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
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { productId } = req.params;
      const updateData = req.body;
      const companyId = req.user.companyId;
      const updatedBy = req.user.userId;

      logger.info('Actualizando producto', {
        productId,
        companyId,
        updatedBy
      });

      const product = await productService.updateProduct(productId, updateData, companyId, updatedBy);

      logger.info('Producto actualizado exitosamente', {
        productId,
        companyId
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED,
        data: product
      });

    } catch (error) {
      logger.error('Error actualizando producto', {
        productId: req.params.productId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Cambiar estado del producto
   */
  async toggleProductStatus(req, res, next) {
    try {
      const { productId } = req.params;
      const companyId = req.user.companyId;
      const updatedBy = req.user.userId;

      logger.info('Cambiando estado de producto', {
        productId,
        companyId,
        updatedBy
      });

      const product = await productService.toggleProductStatus(productId, companyId, updatedBy);

      logger.info('Estado de producto cambiado', {
        productId,
        newStatus: product.is_active
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED,
        data: product
      });

    } catch (error) {
      logger.error('Error cambiando estado de producto', {
        productId: req.params.productId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Actualizar stock del producto
   */
  async updateStock(req, res, next) {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { productId } = req.params;
      const { quantity, type, reason } = req.body;
      const companyId = req.user.companyId;
      const updatedBy = req.user.userId;

      logger.info('Actualizando stock de producto', {
        productId,
        quantity,
        type,
        reason,
        companyId,
        updatedBy
      });

      const product = await productService.updateStock(
        productId, 
        quantity, 
        type, 
        reason, 
        companyId, 
        updatedBy
      );

      logger.info('Stock de producto actualizado', {
        productId,
        newStock: product.current_stock
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED,
        data: product
      });

    } catch (error) {
      logger.error('Error actualizando stock de producto', {
        productId: req.params.productId,
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

      logger.info('Obteniendo productos con stock bajo', { companyId });

      const products = await productService.getLowStockProducts(companyId);

      res.json({
        success: true,
        data: products
      });

    } catch (error) {
      logger.error('Error obteniendo productos con stock bajo', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener historial de movimientos de stock
   */
  async getStockHistory(req, res, next) {
    try {
      const { productId } = req.params;
      const companyId = req.user.companyId;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null
      };

      logger.info('Obteniendo historial de stock', {
        productId,
        companyId,
        options
      });

      const result = await productService.getStockHistory(productId, companyId, options);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: options.page,
          limit: options.limit,
          total: result.total,
          pages: Math.ceil(result.total / options.limit)
        }
      });

    } catch (error) {
      logger.error('Error obteniendo historial de stock', {
        productId: req.params.productId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener categorías de productos
   */
  async getCategories(req, res, next) {
    try {
      const companyId = req.user.companyId;

      logger.info('Obteniendo categorías de productos', { companyId });

      const categories = await productService.getCategories(companyId);

      res.json({
        success: true,
        data: categories
      });

    } catch (error) {
      logger.error('Error obteniendo categorías de productos', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Validar disponibilidad de productos para venta
   */
  async validateProductsAvailability(req, res, next) {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { products } = req.body;
      const companyId = req.user.companyId;

      logger.info('Validando disponibilidad de productos', {
        companyId,
        productsCount: products.length
      });

      const validation = await productService.validateProductsAvailability(products, companyId);

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      logger.error('Error validando disponibilidad de productos', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }
}

module.exports = new ProductController();