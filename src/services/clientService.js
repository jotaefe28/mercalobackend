/**
 * Servicio de Clientes
 * Sistema POS Multitenant
 */

const Client = require('../models/client.model');
const { logger } = require('../middlewares/logger');
const { v4: uuidv4 } = require('uuid');

class ClientService {
  /**
   * Crear un nuevo cliente
   * @param {Object} clientData - Datos del cliente
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Cliente creado
   */
  static async createClient(clientData, companyId) {
    try {
      // Verificar si el documento ya existe
      const existingDocument = await Client.documentExists(
        clientData.document_number, 
        clientData.document_type, 
        companyId
      );
      
      if (existingDocument) {
        throw new Error('Ya existe un cliente con este número de documento');
      }
      
      // Verificar si el email ya existe (si se proporciona)
      if (clientData.email && clientData.email.trim() !== '') {
        const existingEmail = await Client.findByEmail(clientData.email, companyId);
        if (existingEmail) {
          throw new Error('Ya existe un cliente con este email');
        }
      }
      
      // Verificar si el teléfono ya existe (si se proporciona)
      if (clientData.phone && clientData.phone.trim() !== '') {
        const existingPhone = await Client.findByPhone(clientData.phone, companyId);
        if (existingPhone) {
          throw new Error('Ya existe un cliente con este teléfono');
        }
      }
      
      // Preparar datos del cliente
      const newClientData = {
        id: uuidv4(),
        ...clientData,
        company_id: companyId,
        current_points: 0,
        total_purchases: 0,
        is_active: true
      };
      
      // Crear el cliente
      const clientId = await Client.create(newClientData);
      
      // Obtener y devolver el cliente creado
      const createdClient = await Client.findById(clientId, companyId);
      
      logger.info('Cliente creado exitosamente:', {
        clientId,
        companyId,
        document: clientData.document_number
      });
      
      return createdClient;
    } catch (error) {
      logger.error('Error creando cliente:', {
        error: error.message,
        clientData: { ...clientData, company_id: companyId }
      });
      throw error;
    }
  }

  /**
   * Obtener cliente por ID
   * @param {string} clientId - ID del cliente
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Cliente encontrado o null
   */
  static async getClientById(clientId, companyId) {
    try {
      const client = await Client.findById(clientId, companyId);
      
      if (!client) {
        throw new Error('Cliente no encontrado');
      }
      
      return client;
    } catch (error) {
      logger.error('Error obteniendo cliente por ID:', {
        error: error.message,
        clientId,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Obtener cliente por documento
   * @param {string} documentNumber - Número de documento
   * @param {string} documentType - Tipo de documento
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Cliente encontrado o null
   */
  static async getClientByDocument(documentNumber, documentType, companyId) {
    try {
      const client = await Client.findByDocument(documentNumber, documentType, companyId);
      
      if (!client) {
        throw new Error('Cliente no encontrado');
      }
      
      return client;
    } catch (error) {
      logger.error('Error obteniendo cliente por documento:', {
        error: error.message,
        documentNumber,
        documentType,
        companyId
      });
      throw error;
    }
  }

  /**
   * Obtener lista de clientes con filtros y paginación
   * @param {Object} filters - Filtros de búsqueda
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Lista de clientes paginada
   */
  static async getClients(filters, companyId) {
    try {
      const { page = 1, limit = 10, sort_by = 'created_at', sort_order = 'DESC', ...searchFilters } = filters;
      
      // Construir filtros para la consulta
      const queryFilters = {
        ...searchFilters,
        page: parseInt(page),
        limit: parseInt(limit),
        sort_by,
        sort_order
      };
      
      const result = await Client.findAll(companyId, queryFilters);
      
      logger.info('Clientes obtenidos exitosamente:', {
        companyId,
        filters: queryFilters,
        totalFound: result.total
      });
      
      return result;
    } catch (error) {
      logger.error('Error obteniendo lista de clientes:', {
        error: error.message,
        filters,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Buscar clientes
   * @param {string} searchTerm - Término de búsqueda
   * @param {string} companyId - ID de la empresa
   * @param {Object} options - Opciones de búsqueda
   * @returns {Promise<Array>} Lista de clientes encontrados
   */
  static async searchClients(searchTerm, companyId, options = {}) {
    try {
      const { limit = 10, quick = false } = options;
      
      let clients;
      if (quick) {
        clients = await Client.quickSearch(searchTerm, companyId, limit);
      } else {
        clients = await Client.search(searchTerm, companyId, limit);
      }
      
      logger.info('Búsqueda de clientes realizada:', {
        companyId,
        searchTerm,
        found: clients.length,
        quick
      });
      
      return clients;
    } catch (error) {
      logger.error('Error buscando clientes:', {
        error: error.message,
        searchTerm,
        companyId,
        options
      });
      throw error;
    }
  }

  /**
   * Actualizar cliente
   * @param {string} clientId - ID del cliente
   * @param {Object} updateData - Datos a actualizar
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Cliente actualizado
   */
  static async updateClient(clientId, updateData, companyId) {
    try {
      // Verificar que el cliente existe
      const existingClient = await Client.findById(clientId, companyId);
      if (!existingClient) {
        throw new Error('Cliente no encontrado');
      }
      
      // Verificar documento único si se está actualizando
      if (updateData.document_number || updateData.document_type) {
        const documentNumber = updateData.document_number || existingClient.document_number;
        const documentType = updateData.document_type || existingClient.document_type;
        
        const existingDocument = await Client.documentExists(documentNumber, documentType, companyId);
        if (existingDocument && existingDocument.id !== clientId) {
          throw new Error('Ya existe otro cliente con este número de documento');
        }
      }
      
      // Verificar email único si se está actualizando
      if (updateData.email && updateData.email.trim() !== '') {
        const existingEmail = await Client.findByEmail(updateData.email, companyId);
        if (existingEmail && existingEmail.id !== clientId) {
          throw new Error('Ya existe otro cliente con este email');
        }
      }
      
      // Verificar teléfono único si se está actualizando
      if (updateData.phone && updateData.phone.trim() !== '') {
        const existingPhone = await Client.findByPhone(updateData.phone, companyId);
        if (existingPhone && existingPhone.id !== clientId) {
          throw new Error('Ya existe otro cliente con este teléfono');
        }
      }
      
      // Actualizar cliente
      await Client.update(clientId, updateData, companyId);
      
      // Obtener y devolver el cliente actualizado
      const updatedClient = await Client.findById(clientId, companyId);
      
      logger.info('Cliente actualizado exitosamente:', {
        clientId,
        companyId,
        updateData
      });
      
      return updatedClient;
    } catch (error) {
      logger.error('Error actualizando cliente:', {
        error: error.message,
        clientId,
        updateData,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Eliminar cliente (soft delete)
   * @param {string} clientId - ID del cliente
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async deleteClient(clientId, companyId) {
    try {
      // Verificar que el cliente existe
      const existingClient = await Client.findById(clientId, companyId);
      if (!existingClient) {
        throw new Error('Cliente no encontrado');
      }
      
      // Eliminar cliente (soft delete)
      await Client.delete(clientId, companyId);
      
      logger.info('Cliente eliminado exitosamente:', {
        clientId,
        companyId
      });
      
      return true;
    } catch (error) {
      logger.error('Error eliminando cliente:', {
        error: error.message,
        clientId,
        companyId
      });
      throw error;
    }
  }

  /**
   * Activar/Desactivar cliente
   * @param {string} clientId - ID del cliente
   * @param {boolean} isActive - Estado activo
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Cliente actualizado
   */
  static async toggleClientStatus(clientId, isActive, companyId) {
    try {
      const updateData = { is_active: isActive };
      const updatedClient = await this.updateClient(clientId, updateData, companyId);
      
      logger.info('Estado de cliente actualizado:', {
        clientId,
        companyId,
        isActive
      });
      
      return updatedClient;
    } catch (error) {
      logger.error('Error actualizando estado de cliente:', {
        error: error.message,
        clientId,
        isActive,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Actualizar puntos del cliente
   * @param {string} clientId - ID del cliente
   * @param {number} pointsChange - Cambio en puntos (positivo o negativo)
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Cliente actualizado
   */
  static async updateClientPoints(clientId, pointsChange, companyId) {
    try {
      // Verificar que el cliente existe
      const existingClient = await Client.findById(clientId, companyId);
      if (!existingClient) {
        throw new Error('Cliente no encontrado');
      }
      
      // Actualizar puntos
      await Client.updatePoints(clientId, pointsChange, companyId);
      
      // Obtener cliente actualizado
      const updatedClient = await Client.findById(clientId, companyId);
      
      logger.info('Puntos de cliente actualizados:', {
        clientId,
        companyId,
        pointsChange,
        newBalance: updatedClient.current_points
      });
      
      return updatedClient;
    } catch (error) {
      logger.error('Error actualizando puntos de cliente:', {
        error: error.message,
        clientId,
        pointsChange,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Actualizar total de compras del cliente
   * @param {string} clientId - ID del cliente
   * @param {number} purchaseAmount - Monto de la compra
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Cliente actualizado
   */
  static async updateClientPurchases(clientId, purchaseAmount, companyId) {
    try {
      // Verificar que el cliente existe
      const existingClient = await Client.findById(clientId, companyId);
      if (!existingClient) {
        throw new Error('Cliente no encontrado');
      }
      
      // Actualizar total de compras
      await Client.updateTotalPurchases(clientId, purchaseAmount, companyId);
      
      // Obtener cliente actualizado
      const updatedClient = await Client.findById(clientId, companyId);
      
      logger.info('Total de compras de cliente actualizado:', {
        clientId,
        companyId,
        purchaseAmount,
        newTotal: updatedClient.total_purchases
      });
      
      return updatedClient;
    } catch (error) {
      logger.error('Error actualizando total de compras de cliente:', {
        error: error.message,
        clientId,
        purchaseAmount,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Obtener estadísticas de clientes
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Estadísticas de clientes
   */
  static async getClientStats(companyId) {
    try {
      const stats = await Client.getStats(companyId);
      
      logger.info('Estadísticas de clientes obtenidas:', {
        companyId,
        totalClients: stats.total_clients
      });
      
      return stats;
    } catch (error) {
      logger.error('Error obteniendo estadísticas de clientes:', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Verificar si un cliente existe por identificador
   * @param {string} identifier - Puede ser ID, documento, teléfono o email
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Cliente encontrado o null
   */
  static async findClientByIdentifier(identifier, companyId) {
    try {
      const client = await Client.findByIdentifier(identifier, companyId);
      
      if (!client) {
        throw new Error('Cliente no encontrado');
      }
      
      return client;
    } catch (error) {
      logger.error('Error buscando cliente por identificador:', {
        error: error.message,
        identifier,
        companyId
      });
      throw error;
    }
  }
}

module.exports = ClientService;