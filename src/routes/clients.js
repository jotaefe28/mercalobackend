/**
 * Rutas de Clientes
 * Sistema POS Multitenant
 */

const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/clientController');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { apiRateLimit } = require('../middlewares/rateLimiter.middleware');
const {
  validateCreateClient,
  validateUpdateClient,
  validateSearchClients,
  validateClientId
} = require('../validators/client.validator');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Aplicar rate limiting
router.use(apiRateLimit);

/**
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Crear un nuevo cliente
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - document_type
 *               - document_number
 *               - name
 *             properties:
 *               document_type:
 *                 type: string
 *                 enum: [cedula, cedula_extranjeria, nit, pasaporte, ruc, otro]
 *                 description: Tipo de documento
 *               document_number:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *                 description: Número de documento
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Nombre del cliente
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Apellido del cliente (opcional)
 *               phone:
 *                 type: string
 *                 minLength: 7
 *                 maxLength: 20
 *                 description: Teléfono del cliente (opcional)
 *               email:
 *                 type: string
 *                 maxLength: 100
 *                 description: Email del cliente (opcional)
 *               address:
 *                 type: string
 *                 maxLength: 255
 *                 description: Dirección del cliente (opcional)
 *               city:
 *                 type: string
 *                 maxLength: 50
 *                 description: Ciudad del cliente (opcional)
 *               department:
 *                 type: string
 *                 maxLength: 50
 *                 description: Departamento del cliente (opcional)
 *               birth_date:
 *                 type: string
 *                 format: date
 *                 description: Fecha de nacimiento del cliente (opcional)
 *     responses:
 *       201:
 *         description: Cliente creado exitosamente
 *       400:
 *         description: Errores de validación
 *       409:
 *         description: Cliente ya existe
 */
router.post('/', validateCreateClient, ClientController.createClient);

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: Listar clientes con filtros y paginación
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda
 *       - in: query
 *         name: document_type
 *         schema:
 *           type: string
 *           enum: [cedula, cedula_extranjeria, nit, pasaporte, ruc, otro]
 *         description: Filtrar por tipo de documento
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filtrar por ciudad
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filtrar por departamento
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo
 *       - in: query
 *         name: has_points
 *         schema:
 *           type: boolean
 *         description: Filtrar clientes con puntos
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Elementos por página
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [name, created_at, total_purchases, current_points, last_name]
 *           default: created_at
 *         description: Campo para ordenar
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Orden de clasificación
 *     responses:
 *       200:
 *         description: Lista de clientes obtenida exitosamente
 */
router.get('/', validateSearchClients, ClientController.getClients);

/**
 * @swagger
 * /api/clients/search:
 *   get:
 *     summary: Buscar clientes
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Término de búsqueda
 *       - in: query
 *         name: quick
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Búsqueda rápida (menos campos)
 *     responses:
 *       200:
 *         description: Resultados de búsqueda
 */
router.get('/search', ClientController.searchClients);

/**
 * @swagger
 * /api/clients/stats:
 *   get:
 *     summary: Obtener estadísticas de clientes
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 */
router.get('/stats', ClientController.getClientStats);

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Obtener cliente por ID
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       404:
 *         description: Cliente no encontrado
 */
router.get('/:id', validateClientId, ClientController.getClientById);

/**
 * @swagger
 * /api/clients/{id}:
 *   put:
 *     summary: Actualizar cliente
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               document_type:
 *                 type: string
 *                 enum: [cedula, cedula_extranjeria, nit, pasaporte, ruc, otro]
 *               document_number:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               phone:
 *                 type: string
 *                 minLength: 7
 *                 maxLength: 20
 *               email:
 *                 type: string
 *                 maxLength: 100
 *               address:
 *                 type: string
 *                 maxLength: 255
 *               city:
 *                 type: string
 *                 maxLength: 50
 *               department:
 *                 type: string
 *                 maxLength: 50
 *               birth_date:
 *                 type: string
 *                 format: date
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cliente actualizado exitosamente
 *       404:
 *         description: Cliente no encontrado
 *       409:
 *         description: Conflicto con datos existentes
 */
router.put('/:id', validateClientId, validateUpdateClient, ClientController.updateClient);

/**
 * @swagger
 * /api/clients/{id}:
 *   delete:
 *     summary: Eliminar cliente (soft delete)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Cliente eliminado exitosamente
 *       404:
 *         description: Cliente no encontrado
 */
router.delete('/:id', validateClientId, ClientController.deleteClient);

/**
 * @swagger
 * /api/clients/{document_type}/{document_number}:
 *   get:
 *     summary: Obtener cliente por documento
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: document_type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [cedula, cedula_extranjeria, nit, pasaporte, ruc, otro]
 *         description: Tipo de documento
 *       - in: path
 *         name: document_number
 *         required: true
 *         schema:
 *           type: string
 *         description: Número de documento
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       404:
 *         description: Cliente no encontrado
 */
router.get('/:document_type/:document_number', ClientController.getClientByDocument);

/**
 * @swagger
 * /api/clients/{id}/status:
 *   patch:
 *     summary: Activar/Desactivar cliente
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: Estado activo del cliente
 *     responses:
 *       200:
 *         description: Estado del cliente actualizado
 *       404:
 *         description: Cliente no encontrado
 */
router.patch('/:id/status', validateClientId, ClientController.toggleClientStatus);

/**
 * @swagger
 * /api/clients/{id}/points:
 *   patch:
 *     summary: Actualizar puntos del cliente
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points_change
 *             properties:
 *               points_change:
 *                 type: number
 *                 description: Cambio en puntos (positivo o negativo)
 *     responses:
 *       200:
 *         description: Puntos actualizados exitosamente
 *       404:
 *         description: Cliente no encontrado
 */
router.patch('/:id/points', validateClientId, ClientController.updateClientPoints);

/**
 * @swagger
 * /api/clients/{id}/purchases:
 *   patch:
 *     summary: Actualizar total de compras del cliente
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purchase_amount
 *             properties:
 *               purchase_amount:
 *                 type: number
 *                 minimum: 0
 *                 description: Monto de la compra a agregar
 *     responses:
 *       200:
 *         description: Total de compras actualizado exitosamente
 *       404:
 *         description: Cliente no encontrado
 */
router.patch('/:id/purchases', validateClientId, ClientController.updateClientPurchases);

/**
 * @swagger
 * /api/clients/find/{identifier}:
 *   get:
 *     summary: Buscar cliente por identificador
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Puede ser ID, documento, teléfono o email
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       404:
 *         description: Cliente no encontrado
 */
router.get('/find/:identifier', ClientController.findClientByIdentifier);

module.exports = router;