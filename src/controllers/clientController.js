/**
 * Controlador de Clientes
 * Sistema POS Multitenant
 */

const clientService = require('../services/clientService');
const { validationResult } = require('express-validator');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../utils/constants');

class ClientController {
  /**
   * Crear nuevo cliente
   */
  async createClient(req, res, next) {
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

      const clientData = req.body;
      const companyId = req.user.companyId;
      const createdBy = req.user.userId;

      logger.info('Creando cliente', {
        email: clientData.email,
        document: clientData.document,
        companyId,
        createdBy
      });

      const client = await clientService.createClient(clientData, companyId, createdBy);

      logger.info('Cliente creado exitosamente', {
        clientId: client.id,
        email: client.email,
        document: client.document
      });

      res.status(201).json({
        success: true,
        message: RESPONSE_MESSAGES.CREATED,
        data: client
      });

    } catch (error) {
      logger.error('Error creando cliente', {
        error: error.message,
        companyId: req.user?.companyId
      });
      next(error);
    }
  }

  /**
   * Obtener cliente por ID
   */
  async getClientById(req, res, next) {
    try {
      const { clientId } = req.params;
      const companyId = req.user.companyId;

      const client = await clientService.getClientById(clientId, companyId);

      res.json({
        success: true,
        data: client
      });

    } catch (error) {
      logger.error('Error obteniendo cliente', {
        clientId: req.params.clientId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener cliente por email
   */
  async getClientByEmail(req, res, next) {
    try {
      const { email } = req.params;
      const companyId = req.user.companyId;

      const client = await clientService.getClientByEmail(email, companyId);

      res.json({
        success: true,
        data: client
      });

    } catch (error) {
      logger.error('Error obteniendo cliente por email', {
        email: req.params.email,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener cliente por documento
   */
  async getClientByDocument(req, res, next) {
    try {
      const { document } = req.params;
      const companyId = req.user.companyId;

      const client = await clientService.getClientByDocument(document, companyId);

      res.json({
        success: true,
        data: client
      });

    } catch (error) {
      logger.error('Error obteniendo cliente por documento', {
        document: req.params.document,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Listar clientes
   */
  async getClients(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        search: req.query.search || '',
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : null,
        sortBy: req.query.sortBy || 'name',
        sortOrder: req.query.sortOrder || 'asc'
      };

      logger.info('Listando clientes', {
        companyId,
        options
      });

      const result = await clientService.getClients(companyId, options);

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
      logger.error('Error listando clientes', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Actualizar cliente
   */
  async updateClient(req, res, next) {
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

      const { clientId } = req.params;
      const updateData = req.body;
      const companyId = req.user.companyId;
      const updatedBy = req.user.userId;

      logger.info('Actualizando cliente', {
        clientId,
        companyId,
        updatedBy
      });

      const client = await clientService.updateClient(clientId, updateData, companyId, updatedBy);

      logger.info('Cliente actualizado exitosamente', {
        clientId,
        companyId
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED,
        data: client
      });

    } catch (error) {
      logger.error('Error actualizando cliente', {
        clientId: req.params.clientId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Cambiar estado del cliente
   */
  async toggleClientStatus(req, res, next) {
    try {
      const { clientId } = req.params;
      const companyId = req.user.companyId;
      const updatedBy = req.user.userId;

      logger.info('Cambiando estado de cliente', {
        clientId,
        companyId,
        updatedBy
      });

      const client = await clientService.toggleClientStatus(clientId, companyId, updatedBy);

      logger.info('Estado de cliente cambiado', {
        clientId,
        newStatus: client.is_active
      });

      res.json({
        success: true,
        message: RESPONSE_MESSAGES.UPDATED,
        data: client
      });

    } catch (error) {
      logger.error('Error cambiando estado de cliente', {
        clientId: req.params.clientId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Buscar clientes
   */
  async searchClients(req, res, next) {
    try {
      const { q: searchTerm } = req.query;
      const companyId = req.user.companyId;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      logger.info('Buscando clientes', {
        searchTerm,
        companyId
      });

      const clients = await clientService.searchClients(companyId, searchTerm);

      res.json({
        success: true,
        data: clients
      });

    } catch (error) {
      logger.error('Error buscando clientes', {
        searchTerm: req.query.q,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener historial de compras del cliente
   */
  async getClientPurchaseHistory(req, res, next) {
    try {
      const { clientId } = req.params;
      const companyId = req.user.companyId;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null
      };

      logger.info('Obteniendo historial de compras de cliente', {
        clientId,
        companyId,
        options
      });

      const result = await clientService.getClientPurchaseHistory(clientId, companyId, options);

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
      logger.error('Error obteniendo historial de compras', {
        clientId: req.params.clientId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener estadísticas del cliente
   */
  async getClientStats(req, res, next) {
    try {
      const { clientId } = req.params;
      const companyId = req.user.companyId;

      logger.info('Obteniendo estadísticas de cliente', {
        clientId,
        companyId
      });

      const stats = await clientService.getClientStats(clientId, companyId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error obteniendo estadísticas de cliente', {
        clientId: req.params.clientId,
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener clientes más frecuentes
   */
  async getTopClients(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const options = {
        limit: parseInt(req.query.limit) || 10,
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null,
        sortBy: req.query.sortBy || 'purchase_count'
      };

      logger.info('Obteniendo clientes más frecuentes', {
        companyId,
        options
      });

      const topClients = await clientService.getTopClients(companyId, options);

      res.json({
        success: true,
        data: topClients
      });

    } catch (error) {
      logger.error('Error obteniendo clientes más frecuentes', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Obtener estadísticas generales de clientes
   */
  async getCompanyClientStats(req, res, next) {
    try {
      const companyId = req.user.companyId;

      logger.info('Obteniendo estadísticas de clientes de empresa', {
        companyId
      });

      const stats = await clientService.getCompanyClientStats(companyId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error obteniendo estadísticas de clientes de empresa', {
        companyId: req.user?.companyId,
        error: error.message
      });
      next(error);
    }
  }
}

module.exports = new ClientController();