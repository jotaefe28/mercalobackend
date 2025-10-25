/**
 * Rutas de Productos
 * Sistema POS Multitenant
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter.middleware');

// Validadores específicos para productos
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateSearchProducts,
  validateStockAdjustment,
  validateBulkPriceUpdate,
  validateProductId,
  validateSKU
} = require('../validators/product.validator');

// Middlewares de autorización
const requireAuth = authMiddleware.authenticateToken;
const requireAdmin = authMiddleware.requireRoles(['ADMIN']);
const requireAdminOrManager = authMiddleware.requireRoles(['ADMIN', 'MANAGER']);

// Aplicar autenticación a todas las rutas
router.use(requireAuth);

// RUTAS DE CONSULTA (Sin restricciones de rol)
// Obtener todos los productos con filtros y paginación
router.get('/', validateSearchProducts, productController.getProducts);

// Buscar productos por término
router.get('/search', validateSearchProducts, productController.searchProducts);

// Obtener producto por ID
router.get('/:id', validateProductId, productController.getProductById);

// Obtener producto por SKU
router.get('/sku/:sku', validateSKU, productController.getProductBySku);

// Obtener producto por código de barras
router.get('/barcode/:barcode', productController.getProductByBarcode);

// RUTAS DE CONSULTA AVANZADA (Solo ADMIN y MANAGER)
// Obtener estadísticas de productos
router.get('/reports/stats', requireAdminOrManager, productController.getProductStats);

// Obtener productos con stock bajo
router.get('/reports/low-stock', requireAdminOrManager, productController.getLowStockProducts);

// Obtener lista de reabastecimiento
router.get('/reports/reorder', requireAdminOrManager, productController.getReorderList);

// Obtener productos próximos a vencer
router.get('/reports/expiring', requireAdminOrManager, productController.getExpiringProducts);

// Obtener productos con descuento
router.get('/reports/discounted', requireAdminOrManager, productController.getDiscountedProducts);

// Obtener productos por proveedor
router.get('/supplier/:supplierId', requireAdminOrManager, productController.getProductsBySupplier);

// RUTAS DE GESTIÓN (Solo ADMIN y MANAGER)
// Crear nuevo producto
router.post('/', 
  requireAdminOrManager,
  rateLimiter.createRateLimit,
  validateCreateProduct,
  productController.createProduct
);

// Actualizar producto
router.put('/:id',
  requireAdminOrManager,
  validateProductId,
  validateUpdateProduct,
  productController.updateProduct
);

// Eliminar producto (soft delete)
router.delete('/:id',
  requireAdminOrManager,
  validateProductId,
  productController.deleteProduct
);

// Activar/Desactivar producto
router.patch('/:id/status',
  requireAdminOrManager,
  validateProductId,
  productController.toggleProductStatus
);

// Duplicar producto
router.post('/:id/duplicate',
  requireAdminOrManager,
  validateProductId,
  productController.duplicateProduct
);

// RUTAS DE GESTIÓN DE INVENTARIO (Solo ADMIN y MANAGER)
// Ajustar stock del producto
router.post('/:id/stock/adjust',
  requireAdminOrManager,
  validateProductId,
  validateStockAdjustment,
  productController.adjustStock
);

// Actualización masiva de precios
router.patch('/bulk/prices',
  requireAdminOrManager,
  rateLimiter.bulkUpdateRateLimit,
  validateBulkPriceUpdate,
  productController.bulkUpdatePrices
);

// RUTAS DE VALIDACIÓN
// Validar disponibilidad de productos para venta
router.post('/validate/availability',
  productController.validateProductsAvailability
);

module.exports = router;