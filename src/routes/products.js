/**
 * Rutas de Productos
 * Sistema POS Multitenant
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middlewares/auth');
const { body, param } = require('express-validator');
const { INVENTORY_MOVEMENT_TYPES } = require('../utils/constants');

// Validaciones
const createProductValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('El nombre del producto es requerido y debe tener máximo 255 caracteres'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  body('cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El costo debe ser un número positivo'),
  body('current_stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El stock actual debe ser un número entero positivo'),
  body('min_stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El stock mínimo debe ser un número entero positivo'),
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El SKU debe tener máximo 100 caracteres'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La categoría debe tener máximo 100 caracteres')
];

const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('El nombre del producto debe tener máximo 255 caracteres'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  body('cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El costo debe ser un número positivo'),
  body('current_stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El stock actual debe ser un número entero positivo'),
  body('min_stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El stock mínimo debe ser un número entero positivo'),
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El SKU debe tener máximo 100 caracteres'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La categoría debe tener máximo 100 caracteres')
];

const updateStockValidation = [
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero positivo'),
  body('type')
    .isIn(Object.values(INVENTORY_MOVEMENT_TYPES))
    .withMessage('Tipo de movimiento inválido'),
  body('reason')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('La razón es requerida y debe tener máximo 255 caracteres')
];

const validateProductsValidation = [
  body('products')
    .isArray({ min: 1 })
    .withMessage('Se debe proporcionar al menos un producto'),
  body('products.*.product_id')
    .isUUID()
    .withMessage('ID de producto inválido'),
  body('products.*.quantity')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero positivo')
];

const productIdValidation = [
  param('productId')
    .isUUID()
    .withMessage('ID de producto inválido')
];

const skuValidation = [
  param('sku')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('SKU inválido')
];

// Middlewares de autorización
const requireAdminOrManager = authMiddleware.requireRoles(['ADMIN', 'MANAGER']);

// Aplicar autenticación a todas las rutas
router.use(authMiddleware.authenticateToken);

// Rutas de productos
router.post('/', requireAdminOrManager, createProductValidation, productController.createProduct);
router.get('/', productController.getProducts);
router.get('/categories', productController.getCategories);
router.get('/low-stock', productController.getLowStockProducts);
router.post('/validate-availability', validateProductsValidation, productController.validateProductsAvailability);
router.get('/sku/:sku', skuValidation, productController.getProductBySku);
router.get('/:productId', productIdValidation, productController.getProductById);
router.put('/:productId', requireAdminOrManager, productIdValidation, updateProductValidation, productController.updateProduct);
router.patch('/:productId/toggle-status', requireAdminOrManager, productIdValidation, productController.toggleProductStatus);
router.post('/:productId/update-stock', requireAdminOrManager, productIdValidation, updateStockValidation, productController.updateStock);
router.get('/:productId/stock-history', requireAdminOrManager, productIdValidation, productController.getStockHistory);

module.exports = router;