/**
 * Controlador de Clientes
 * Sistema POS Multitenant
 */

const ClientService = require('../services/clientService');
const { logger } = require('../middlewares/logger');

class ClientController {
  /**
   * Crear un nuevo cliente
   */
  static async createClient(req, res) {
    try {
      const clientData = req.body;
      const companyId = req.user.company_id;
      
      const client = await ClientService.createClient(clientData, companyId);
      
      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        data: client
      });
      
    } catch (error) {
      logger.error('Error en createClient controller:', {
        error: error.message,
        body: req.body,
        companyId: req.user.company_id
      });
      
      const statusCode = error.message.includes('Ya existe') ? 409 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        data: null
      });
    }
  }

  /**
   * Obtener cliente por ID
   */
  static async getClientById(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.company_id;
      
      const client = await ClientService.getClientById(id, companyId);
      
      res.status(200).json({
        success: true,
        message: 'Cliente encontrado',
        data: client
      });
      
    } catch (error) {
      logger.error('Error en getClientById controller:', {
        error: error.message,
        clientId: req.params.id,
        companyId: req.user.company_id
      });
      
      const statusCode = error.message === 'Cliente no encontrado' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        data: null
      });
    }
  }
  
  /**
   * Obtener cliente por documento
   */
  static async getClientByDocument(req, res) {
    try {
      const { document_type, document_number } = req.params;
      const companyId = req.user.company_id;
      
      const client = await ClientService.getClientByDocument(document_number, document_type, companyId);
      
      res.status(200).json({
        success: true,
        message: 'Cliente encontrado',
        data: client
      });
      
    } catch (error) {
      logger.error('Error en getClientByDocument controller:', {
        error: error.message,
        document_type: req.params.document_type,
        document_number: req.params.document_number,
        companyId: req.user.company_id
      });
      
      const statusCode = error.message === 'Cliente no encontrado' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        data: null
      });
    }
  }

  /**
   * Listar clientes con filtros y paginación
   */
  static async getClients(req, res) {
    try {
      const filters = req.query;
      const companyId = req.user.company_id;
      
      const result = await ClientService.getClients(filters, companyId);
      
      res.status(200).json({
        success: true,
        message: 'Clientes obtenidos exitosamente',
        data: result.clients,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages
        }
      });
      
    } catch (error) {
      logger.error('Error en getClients controller:', {
        error: error.message,
        query: req.query,
        companyId: req.user.company_id
      });
      
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        data: null
      });
    }
  }
  
  /**
   * Buscar clientes
   */
  static async searchClients(req, res) {
    try {
      const { search, quick } = req.query;
      const companyId = req.user.company_id;
      
      if (!search || search.trim().length < 1) {
        return res.status(400).json({
          success: false,
          message: 'El término de búsqueda es requerido',
          data: null
        });
      }
      
      const clients = await ClientService.searchClients(search, companyId, { quick: quick === 'true' });
      
      res.status(200).json({
        success: true,
        message: 'Búsqueda realizada exitosamente',
        data: clients
      });
      
    } catch (error) {
      logger.error('Error en searchClients controller:', {
        error: error.message,
        search: req.query.search,
        companyId: req.user.company_id
      });
      
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        data: null
      });
    }
  }

  /**
   * Actualizar cliente
   */
  static async updateClient(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const companyId = req.user.company_id;
      
      const client = await ClientService.updateClient(id, updateData, companyId);
      
      res.status(200).json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: client
      });
      
    } catch (error) {
      logger.error('Error en updateClient controller:', {
        error: error.message,
        clientId: req.params.id,
        body: req.body,
        companyId: req.user.company_id
      });
      
      let statusCode = 500;
      if (error.message === 'Cliente no encontrado') {
        statusCode = 404;
      } else if (error.message.includes('Ya existe')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        data: null
      });
    }
  }
  
  /**
   * Eliminar cliente (soft delete)
   */
  static async deleteClient(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.company_id;
      
      await ClientService.deleteClient(id, companyId);
      
      res.status(200).json({
        success: true,
        message: 'Cliente eliminado exitosamente',
        data: null
      });
      
    } catch (error) {
      logger.error('Error en deleteClient controller:', {
        error: error.message,
        clientId: req.params.id,
        companyId: req.user.company_id
      });
      
      const statusCode = error.message === 'Cliente no encontrado' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        data: null
      });
    }
  }

  /**
   * Activar/Desactivar cliente
   */
  static async toggleClientStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      const companyId = req.user.company_id;
      
      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'El campo is_active debe ser verdadero o falso',
          data: null
        });
      }
      
      const client = await ClientService.toggleClientStatus(id, is_active, companyId);
      
      res.status(200).json({
        success: true,
        message: `Cliente ${is_active ? 'activado' : 'desactivado'} exitosamente`,
        data: client
      });
      
    } catch (error) {
      logger.error('Error en toggleClientStatus controller:', {
        error: error.message,
        clientId: req.params.id,
        is_active: req.body.is_active,
        companyId: req.user.company_id
      });
      
      const statusCode = error.message === 'Cliente no encontrado' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        data: null
      });
    }
  }
  
  /**
   * Actualizar puntos del cliente
   */
  static async updateClientPoints(req, res) {
    try {
      const { id } = req.params;
      const { points_change } = req.body;
      const companyId = req.user.company_id;
      
      if (typeof points_change !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'El campo points_change debe ser un número',
          data: null
        });
      }
      
      const client = await ClientService.updateClientPoints(id, points_change, companyId);
      
      res.status(200).json({
        success: true,
        message: 'Puntos del cliente actualizados exitosamente',
        data: client
      });
      
    } catch (error) {
      logger.error('Error en updateClientPoints controller:', {
        error: error.message,
        clientId: req.params.id,
        points_change: req.body.points_change,
        companyId: req.user.company_id
      });
      
      const statusCode = error.message === 'Cliente no encontrado' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        data: null
      });
    }
  }

  /**
   * Actualizar total de compras del cliente
   */
  static async updateClientPurchases(req, res) {
    try {
      const { id } = req.params;
      const { purchase_amount } = req.body;
      const companyId = req.user.company_id;
      
      if (typeof purchase_amount !== 'number' || purchase_amount < 0) {
        return res.status(400).json({
          success: false,
          message: 'El campo purchase_amount debe ser un número positivo',
          data: null
        });
      }
      
      const client = await ClientService.updateClientPurchases(id, purchase_amount, companyId);
      
      res.status(200).json({
        success: true,
        message: 'Total de compras del cliente actualizado exitosamente',
        data: client
      });
      
    } catch (error) {
      logger.error('Error en updateClientPurchases controller:', {
        error: error.message,
        clientId: req.params.id,
        purchase_amount: req.body.purchase_amount,
        companyId: req.user.company_id
      });
      
      const statusCode = error.message === 'Cliente no encontrado' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        data: null
      });
    }
  }
  
  /**
   * Obtener estadísticas de clientes
   */
  static async getClientStats(req, res) {
    try {
      const companyId = req.user.company_id;
      
      const stats = await ClientService.getClientStats(companyId);
      
      res.status(200).json({
        success: true,
        message: 'Estadísticas de clientes obtenidas exitosamente',
        data: stats
      });
      
    } catch (error) {
      logger.error('Error en getClientStats controller:', {
        error: error.message,
        companyId: req.user.company_id
      });
      
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        data: null
      });
    }
  }
  
  /**
   * Buscar cliente por identificador
   */
  static async findClientByIdentifier(req, res) {
    try {
      const { identifier } = req.params;
      const companyId = req.user.company_id;
      
      const client = await ClientService.findClientByIdentifier(identifier, companyId);
      
      res.status(200).json({
        success: true,
        message: 'Cliente encontrado',
        data: client
      });
      
    } catch (error) {
      logger.error('Error en findClientByIdentifier controller:', {
        error: error.message,
        identifier: req.params.identifier,
        companyId: req.user.company_id
      });
      
      const statusCode = error.message === 'Cliente no encontrado' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        data: null
      });
    }
  }
}

module.exports = ClientController;