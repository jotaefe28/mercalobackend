/**
 * Servicio de Clientes
 * Sistema POS Multitenant
 */

const Client = require('../models/Client');
const Points = require('../models/Points');
const { logger } = require('../middlewares/logger');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../utils/constants');

class ClientService {
  /**
   * Crear nuevo cliente
   */
  async createClient(clientData, companyId, createdBy) {
    try {
      logger.info('Creando nuevo cliente', {
        email: clientData.email,
        document: clientData.document,
        companyId,
        createdBy
      });

      // Verificar que no exista el email
      if (clientData.email) {
        const existingByEmail = await Client.findByEmail(clientData.email, companyId);
        if (existingByEmail) {
          throw {
            code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
            message: 'El email ya está registrado'
          };
        }
      }

      // Verificar que no exista el documento
      if (clientData.document) {
        const existingByDocument = await Client.findByDocument(clientData.document, companyId);
        if (existingByDocument) {
          throw {
            code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
            message: 'El documento ya está registrado'
          };
        }
      }

      // Agregar datos adicionales
      const clientWithCompany = {
        ...clientData,
        company_id: companyId,
        created_by: createdBy
      };

      // Crear cliente
      const client = await Client.create(clientWithCompany);

      logger.info('Cliente creado exitosamente', {
        clientId: client.id,
        email: client.email,
        document: client.document,
        companyId
      });

      return client;

    } catch (error) {
      logger.error('Error creando cliente', {
        email: clientData.email,
        document: clientData.document,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener cliente por ID
   */
  async getClientById(clientId, companyId) {
    try {
      const client = await Client.findByIdAndCompany(clientId, companyId);
      if (!client) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Cliente no encontrado'
        };
      }

      // Obtener balance de puntos
      const pointsBalance = await Points.getClientBalance(clientId, companyId);
      client.points_balance = pointsBalance.available_points || 0;

      return client;

    } catch (error) {
      logger.error('Error obteniendo cliente', {
        clientId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener cliente por email
   */
  async getClientByEmail(email, companyId) {
    try {
      const client = await Client.findByEmail(email, companyId);
      if (!client) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Cliente no encontrado'
        };
      }

      // Obtener balance de puntos
      const pointsBalance = await Points.getClientBalance(client.id, companyId);
      client.points_balance = pointsBalance.available_points || 0;

      return client;

    } catch (error) {
      logger.error('Error obteniendo cliente por email', {
        email,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener cliente por documento
   */
  async getClientByDocument(document, companyId) {
    try {
      const client = await Client.findByDocument(document, companyId);
      if (!client) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Cliente no encontrado'
        };
      }

      // Obtener balance de puntos
      const pointsBalance = await Points.getClientBalance(client.id, companyId);
      client.points_balance = pointsBalance.available_points || 0;

      return client;

    } catch (error) {
      logger.error('Error obteniendo cliente por documento', {
        document,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Listar clientes
   */
  async getClients(companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        isActive = null,
        sortBy = 'name',
        sortOrder = 'asc'
      } = options;

      logger.info('Listando clientes', {
        companyId,
        page,
        limit,
        search,
        isActive,
        sortBy,
        sortOrder
      });

      const filters = { company_id: companyId };
      
      if (isActive !== null) filters.is_active = isActive;

      const result = await Client.findAll(filters, {
        page,
        limit,
        search,
        searchFields: ['name', 'email', 'document', 'phone'],
        sortBy,
        sortOrder
      });

      // Agregar balance de puntos a cada cliente
      for (let client of result.data) {
        const pointsBalance = await Points.getClientBalance(client.id, companyId);
        client.points_balance = pointsBalance.available_points || 0;
      }

      logger.info('Clientes listados exitosamente', {
        companyId,
        total: result.total,
        returned: result.data.length
      });

      return result;

    } catch (error) {
      logger.error('Error listando clientes', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Actualizar cliente
   */
  async updateClient(clientId, updateData, companyId, updatedBy) {
    try {
      logger.info('Actualizando cliente', {
        clientId,
        companyId,
        updatedBy
      });

      // Verificar que el cliente existe
      const existingClient = await Client.findByIdAndCompany(clientId, companyId);
      if (!existingClient) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Cliente no encontrado'
        };
      }

      // Si se actualiza el email, verificar que no esté en uso
      if (updateData.email && updateData.email !== existingClient.email) {
        const emailInUse = await Client.findByEmail(updateData.email, companyId);
        if (emailInUse) {
          throw {
            code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
            message: 'El email ya está en uso'
          };
        }
      }

      // Si se actualiza el documento, verificar que no esté en uso
      if (updateData.document && updateData.document !== existingClient.document) {
        const documentInUse = await Client.findByDocument(updateData.document, companyId);
        if (documentInUse) {
          throw {
            code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
            message: 'El documento ya está en uso'
          };
        }
      }

      // Preparar datos de actualización
      const dataToUpdate = {
        ...updateData,
        updated_by: updatedBy,
        updated_at: new Date()
      };

      // Actualizar cliente
      const updatedClient = await Client.update(clientId, dataToUpdate);

      // Obtener balance de puntos
      const pointsBalance = await Points.getClientBalance(clientId, companyId);
      updatedClient.points_balance = pointsBalance.available_points || 0;

      logger.info('Cliente actualizado exitosamente', {
        clientId,
        companyId
      });

      return updatedClient;

    } catch (error) {
      logger.error('Error actualizando cliente', {
        clientId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cambiar estado activo/inactivo del cliente
   */
  async toggleClientStatus(clientId, companyId, updatedBy) {
    try {
      logger.info('Cambiando estado de cliente', {
        clientId,
        companyId,
        updatedBy
      });

      // Verificar que el cliente existe
      const client = await Client.findByIdAndCompany(clientId, companyId);
      if (!client) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Cliente no encontrado'
        };
      }

      const newStatus = !client.is_active;
      const updatedClient = await Client.update(clientId, {
        is_active: newStatus,
        updated_by: updatedBy,
        updated_at: new Date()
      });

      // Obtener balance de puntos
      const pointsBalance = await Points.getClientBalance(clientId, companyId);
      updatedClient.points_balance = pointsBalance.available_points || 0;

      logger.info('Estado de cliente cambiado exitosamente', {
        clientId,
        newStatus,
        companyId
      });

      return updatedClient;

    } catch (error) {
      logger.error('Error cambiando estado de cliente', {
        clientId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Buscar clientes por criterios múltiples
   */
  async searchClients(companyId, searchTerm) {
    try {
      logger.info('Buscando clientes', {
        companyId,
        searchTerm
      });

      if (!searchTerm || searchTerm.trim().length < 2) {
        return [];
      }

      const clients = await Client.search(companyId, searchTerm.trim());

      // Agregar balance de puntos a cada cliente
      for (let client of clients) {
        const pointsBalance = await Points.getClientBalance(client.id, companyId);
        client.points_balance = pointsBalance.available_points || 0;
      }

      logger.info('Búsqueda de clientes completada', {
        companyId,
        searchTerm,
        resultsCount: clients.length
      });

      return clients;

    } catch (error) {
      logger.error('Error buscando clientes', {
        companyId,
        searchTerm,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener historial de compras del cliente
   */
  async getClientPurchaseHistory(clientId, companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        dateFrom = null,
        dateTo = null
      } = options;

      logger.info('Obteniendo historial de compras de cliente', {
        clientId,
        companyId,
        page,
        limit,
        dateFrom,
        dateTo
      });

      // Verificar que el cliente existe
      const client = await Client.findByIdAndCompany(clientId, companyId);
      if (!client) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Cliente no encontrado'
        };
      }

      const history = await Client.getPurchaseHistory(clientId, {
        page,
        limit,
        dateFrom,
        dateTo
      });

      logger.info('Historial de compras obtenido', {
        clientId,
        companyId,
        total: history.total,
        returned: history.data.length
      });

      return history;

    } catch (error) {
      logger.error('Error obteniendo historial de compras', {
        clientId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener estadísticas del cliente
   */
  async getClientStats(clientId, companyId) {
    try {
      logger.info('Obteniendo estadísticas de cliente', {
        clientId,
        companyId
      });

      // Verificar que el cliente existe
      const client = await Client.findByIdAndCompany(clientId, companyId);
      if (!client) {
        throw {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Cliente no encontrado'
        };
      }

      const stats = await Client.getClientStats(clientId);

      // Agregar balance de puntos actual
      const pointsBalance = await Points.getClientBalance(clientId, companyId);
      stats.current_points_balance = pointsBalance.available_points || 0;

      logger.info('Estadísticas de cliente obtenidas', {
        clientId,
        companyId,
        stats
      });

      return stats;

    } catch (error) {
      logger.error('Error obteniendo estadísticas de cliente', {
        clientId,
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener clientes más frecuentes
   */
  async getTopClients(companyId, options = {}) {
    try {
      const {
        limit = 10,
        dateFrom = null,
        dateTo = null,
        sortBy = 'purchase_count' // purchase_count, total_spent, points_balance
      } = options;

      logger.info('Obteniendo clientes más frecuentes', {
        companyId,
        limit,
        sortBy,
        dateFrom,
        dateTo
      });

      const topClients = await Client.getTopClients(companyId, {
        limit,
        dateFrom,
        dateTo,
        sortBy
      });

      // Agregar balance de puntos actual a cada cliente
      for (let client of topClients) {
        const pointsBalance = await Points.getClientBalance(client.id, companyId);
        client.current_points_balance = pointsBalance.available_points || 0;
      }

      logger.info('Clientes más frecuentes obtenidos', {
        companyId,
        count: topClients.length
      });

      return topClients;

    } catch (error) {
      logger.error('Error obteniendo clientes más frecuentes', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener estadísticas generales de clientes de la empresa
   */
  async getCompanyClientStats(companyId) {
    try {
      logger.info('Obteniendo estadísticas de clientes de empresa', {
        companyId
      });

      const stats = await Client.getCompanyStats(companyId);

      logger.info('Estadísticas de clientes de empresa obtenidas', {
        companyId,
        stats
      });

      return stats;

    } catch (error) {
      logger.error('Error obteniendo estadísticas de clientes de empresa', {
        companyId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new ClientService();