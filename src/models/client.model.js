/**
 * Modelo de Client (Cliente)
 * Sistema POS Multitenant
 * 
 * Maneja las operaciones CRUD para clientes y sistema de puntos de fidelización
 */

const { executeQuery, executeTransaction, logger } = require('../config/database');
const { addTenantFilter } = require('../config/tenantResolver');
const { v4: uuidv4 } = require('uuid');

class ClientModel {
  /**
   * Crear un nuevo cliente
   * @param {Object} clientData - Datos del cliente
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Cliente creado
   */
  static async create(clientData, companyId) {
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO clients (
          id, company_id, document_type, document_number, name, last_name,
          email, phone, address, city, department, birth_date, 
          current_points, total_purchases, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        id,
        companyId,
        clientData.document_type,
        clientData.document_number,
        clientData.name,
        clientData.last_name || null,
        clientData.email || null,
        clientData.phone || null,
        clientData.address || null,
        clientData.city || null,
        clientData.department || null,
        clientData.birth_date || null,
        0, // Puntos iniciales
        0, // Total compras inicial
        true, // Activo por defecto
        now,
        now
      ];
      
      await executeQuery(query, params, 'Crear cliente');
      
      // Retornar cliente creado
      return await this.findById(id, companyId);
    } catch (error) {
      logger.error('Error creando cliente:', {
        error: error.message,
        clientData,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Buscar cliente por ID
   * @param {string} id - ID del cliente
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Cliente encontrado o null
   */
  static async findById(id, companyId) {
    try {
      let query = `
        SELECT 
          id,
          company_id,
          document_type,
          document_number,
          name,
          last_name,
          email,
          phone,
          address,
          city,
          department,
          birth_date,
          current_points,
          total_purchases,
          is_active,
          created_at,
          updated_at
        FROM clients 
        WHERE id = ? AND is_active = true
      `;
      
      let params = [id];
      
      // Agregar filtro de tenant
      if (companyId) {
        const filtered = addTenantFilter(query, companyId);
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      const clients = await executeQuery(query, params, 'Buscar cliente por ID');
      return clients.length > 0 ? clients[0] : null;
    } catch (error) {
      logger.error('Error buscando cliente por ID:', {
        error: error.message,
        id,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Buscar cliente por documento
   * @param {string} documentNumber - Número de documento del cliente
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Cliente encontrado o null
   */
  static async findByDocument(documentNumber, companyId) {
    try {
      let query = `
        SELECT 
          id,
          company_id,
          document_type,
          document_number,
          name,
          last_name,
          email,
          phone,
          address,
          city,
          department,
          birth_date,
          current_points,
          total_purchases,
          is_active,
          created_at,
          updated_at
        FROM clients 
        WHERE document_number = ? AND is_active = true
      `;
      
      let params = [documentNumber];
      
      // Agregar filtro de tenant
      if (companyId) {
        const filtered = addTenantFilter(query, companyId);
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      const clients = await executeQuery(query, params, 'Buscar cliente por documento');
      return clients.length > 0 ? clients[0] : null;
    } catch (error) {
      logger.error('Error buscando cliente por documento:', {
        error: error.message,
        documentNumber,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Buscar cliente por teléfono
   * @param {string} phone - Teléfono del cliente
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Cliente encontrado o null
   */
  static async findByPhone(phone, companyId) {
    try {
      let query = `
        SELECT 
          id,
          company_id,
          document_type,
          document_number,
          name,
          last_name,
          email,
          phone,
          address,
          city,
          department,
          birth_date,
          current_points,
          total_purchases,
          is_active,
          created_at,
          updated_at
        FROM clients 
        WHERE phone = ? AND is_active = true
      `;
      
      let params = [phone];
      
      // Agregar filtro de tenant
      if (companyId) {
        const filtered = addTenantFilter(query, companyId);
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      const clients = await executeQuery(query, params, 'Buscar cliente por teléfono');
      return clients.length > 0 ? clients[0] : null;
    } catch (error) {
      logger.error('Error buscando cliente por teléfono:', {
        error: error.message,
        phone,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Buscar cliente por identificador (documento o teléfono)
   * @param {string} identifier - Documento o teléfono del cliente
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Cliente encontrado o null
   */
  static async findByIdentifier(identifier, companyId) {
    try {
      let query = `
        SELECT 
          id,
          company_id,
          document_type,
          document_number,
          name,
          last_name,
          email,
          phone,
          address,
          city,
          department,
          birth_date,
          current_points,
          total_purchases,
          is_active,
          created_at,
          updated_at
        FROM clients 
        WHERE (document_number = ? OR phone = ?) AND is_active = true
      `;
      
      let params = [identifier, identifier];
      
      // Agregar filtro de tenant
      if (companyId) {
        const filtered = addTenantFilter(query, companyId);
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      const clients = await executeQuery(query, params, 'Buscar cliente por identificador');
      return clients.length > 0 ? clients[0] : null;
    } catch (error) {
      logger.error('Error buscando cliente por identificador:', {
        error: error.message,
        identifier,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Listar clientes con paginación y filtros
   * @param {string} companyId - ID de la empresa
   * @param {Object} options - Opciones de paginación y filtrado
   * @returns {Promise<Object>} Lista de clientes con metadatos
   */
  static async findAll(companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        search = null,
        document_type = null,
        is_active = true,
        city = null,
        hasPoints = null
      } = options;
      
      const offset = (page - 1) * limit;
      let whereConditions = ['company_id = ?'];
      let params = [companyId];
      
      // Filtro de activos
      if (is_active !== undefined) {
        whereConditions.push('is_active = ?');
        params.push(is_active);
      }
      
      // Filtro por tipo de documento
      if (document_type) {
        whereConditions.push('document_type = ?');
        params.push(document_type);
      }
      
      // Filtro por ciudad
      if (city) {
        whereConditions.push('city LIKE ?');
        params.push(`%${city}%`);
      }
      
      // Filtros adicionales
      if (search) {
        whereConditions.push(`(
          name LIKE ? OR 
          last_name LIKE ? OR 
          document_number LIKE ? OR 
          phone LIKE ? OR 
          email LIKE ?
        )`);
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      if (hasPoints !== null) {
        if (hasPoints) {
          whereConditions.push('current_points > 0');
        } else {
          whereConditions.push('current_points = 0');
        }
      }
      
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      
      // Query para contar total
      const countQuery = `SELECT COUNT(*) as total FROM clients ${whereClause}`;
      const totalResult = await executeQuery(countQuery, params, 'Contar clientes');
      const total = totalResult[0].total;
      
      // Query principal
      const query = `
        SELECT 
          id,
          company_id,
          document_type,
          document_number,
          name,
          last_name,
          email,
          phone,
          address,
          city,
          department,
          birth_date,
          current_points,
          total_purchases,
          is_active,
          created_at,
          updated_at
        FROM clients 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      params.push(parseInt(limit), parseInt(offset));
      const clients = await executeQuery(query, params, 'Listar clientes');
      
      return {
        clients,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: total,
          total_pages: Math.ceil(total / limit),
          from: offset + 1,
          to: Math.min(offset + limit, total),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error listando clientes:', {
        error: error.message,
        companyId,
        options
      });
      throw error;
    }
  }
  
  /**
   * Buscar clientes por término de búsqueda
   * @param {string} companyId - ID de la empresa
   * @param {string} term - Término de búsqueda
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>} Lista de clientes encontrados
   */
  static async search(companyId, term, limit = 20) {
    try {
      const query = `
        SELECT 
          id,
          company_id,
          document_type,
          document_number,
          name,
          last_name,
          email,
          phone,
          address,
          city,
          department,
          birth_date,
          current_points,
          total_purchases,
          is_active,
          created_at,
          updated_at
        FROM clients 
        WHERE company_id = ? 
          AND is_active = true
          AND (
            name LIKE ? OR 
            last_name LIKE ? OR
            document_number LIKE ? OR 
            phone LIKE ? OR
            email LIKE ?
          )
        ORDER BY 
          CASE 
            WHEN name LIKE ? THEN 1
            WHEN document_number = ? THEN 2
            WHEN phone = ? THEN 3
            WHEN document_number LIKE ? THEN 4
            WHEN phone LIKE ? THEN 5
            ELSE 6
          END,
          name ASC
        LIMIT ?
      `;
      
      const searchTerm = `%${term}%`;
      const exactSearchTerm = `${term}%`;
      
      const params = [
        companyId,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        exactSearchTerm,
        term,
        term,
        exactSearchTerm,
        exactSearchTerm,
        limit
      ];
      
      return await executeQuery(query, params, 'Buscar clientes');
    } catch (error) {
      logger.error('Error buscando clientes:', {
        error: error.message,
        companyId,
        term,
        limit
      });
      throw error;
    }
  }
  
  /**
   * Búsqueda rápida de clientes (para autocomplete)
   * @param {string} companyId - ID de la empresa
   * @param {string} term - Término de búsqueda
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>} Lista simplificada de clientes
   */
  static async quickSearch(companyId, term, limit = 10) {
    try {
      const query = `
        SELECT 
          id,
          name,
          last_name,
          document_number,
          phone,
          current_points
        FROM clients 
        WHERE company_id = ? 
          AND is_active = true
          AND (
            name LIKE ? OR 
            last_name LIKE ? OR
            document_number LIKE ? OR 
            phone LIKE ?
          )
        ORDER BY 
          CASE 
            WHEN document_number = ? THEN 1
            WHEN phone = ? THEN 2
            WHEN name LIKE ? THEN 3
            ELSE 4
          END,
          name ASC
        LIMIT ?
      `;
      
      const searchTerm = `%${term}%`;
      const exactSearchTerm = `${term}%`;
      
      const params = [
        companyId,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        term,
        term,
        exactSearchTerm,
        limit
      ];
      
      return await executeQuery(query, params, 'Búsqueda rápida de clientes');
    } catch (error) {
      logger.error('Error en búsqueda rápida de clientes:', {
        error: error.message,
        companyId,
        term,
        limit
      });
      throw error;
    }
  }
  
  /**
   * Actualizar cliente
   * @param {string} id - ID del cliente
   * @param {string} companyId - ID de la empresa
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Cliente actualizado
   */
  static async update(id, companyId, updateData) {
    try {
      const allowedFields = [
        'document_type', 'document_number', 'name', 'last_name',
        'email', 'phone', 'address', 'city', 'department', 
        'birth_date', 'is_active'
      ];
      const updateFields = [];
      const params = [];
      
      // Construir query de actualización dinámicamente
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          updateFields.push(`${key} = ?`);
          params.push(updateData[key]);
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }
      
      // Agregar updated_at
      updateFields.push('updated_at = ?');
      params.push(new Date());
      
      // Agregar condiciones WHERE
      params.push(id, companyId);
      
      const query = `
        UPDATE clients 
        SET ${updateFields.join(', ')}
        WHERE id = ? AND company_id = ?
      `;
      
      const result = await executeQuery(query, params, 'Actualizar cliente');
      
      if (result.affectedRows === 0) {
        throw new Error('Cliente no encontrado');
      }
      
      // Retornar cliente actualizado
      return await this.findById(id, companyId);
    } catch (error) {
      logger.error('Error actualizando cliente:', {
        error: error.message,
        id,
        companyId,
        updateData
      });
      throw error;
    }
  }
  
  /**
   * Eliminar cliente (soft delete)
   * @param {string} id - ID del cliente
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  static async delete(id, companyId) {
    try {
      const query = `
        UPDATE clients 
        SET is_active = false, updated_at = NOW()
        WHERE id = ? AND company_id = ?
      `;
      
      const result = await executeQuery(
        query, 
        [id, companyId], 
        'Eliminar cliente'
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error eliminando cliente:', {
        error: error.message,
        id,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Actualizar puntos del cliente
   * @param {string} id - ID del cliente
   * @param {string} companyId - ID de la empresa
   * @param {number} pointsChange - Cambio en puntos (positivo o negativo)
   * @param {string} reason - Razón del cambio
   * @param {string} saleId - ID de la venta asociada (opcional)
   * @returns {Promise<Object>} Cliente actualizado
   */
  static async updatePoints(id, companyId, pointsChange, reason, saleId = null) {
    try {
      return await executeTransaction(async (connection) => {
        // Obtener puntos actuales
        const [currentClient] = await connection.execute(
          'SELECT current_points FROM clients WHERE id = ? AND company_id = ? FOR UPDATE',
          [id, companyId]
        );
        
        if (currentClient.length === 0) {
          throw new Error('Cliente no encontrado');
        }
        
        const currentPoints = currentClient[0].current_points;
        const newPoints = currentPoints + pointsChange;
        
        if (newPoints < 0) {
          throw new Error('El cliente no tiene suficientes puntos');
        }
        
        // Actualizar puntos del cliente
        await connection.execute(
          'UPDATE clients SET current_points = ?, updated_at = ? WHERE id = ? AND company_id = ?',
          [newPoints, new Date(), id, companyId]
        );
        
        // Registrar movimiento de puntos
        await connection.execute(`
          INSERT INTO customer_points_log (
            id, company_id, customer_id, change_amount, reason, 
            previous_points, new_points, sale_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(),
          companyId,
          id,
          pointsChange,
          reason,
          currentPoints,
          newPoints,
          saleId,
          new Date()
        ]);
        
        return newPoints;
      });
      
      // Retornar cliente actualizado
      return await this.findById(id, companyId);
    } catch (error) {
      logger.error('Error actualizando puntos del cliente:', {
        error: error.message,
        id,
        companyId,
        pointsChange,
        reason
      });
      throw error;
    }
  }
  
  /**
   * Actualizar total de compras del cliente
   * @param {string} id - ID del cliente
   * @param {string} companyId - ID de la empresa
   * @param {number} amount - Monto a agregar
   * @returns {Promise<Object>} Cliente actualizado
   */
  static async updateTotalPurchases(id, companyId, amount) {
    try {
      const query = `
        UPDATE clients 
        SET total_purchases = total_purchases + ?, updated_at = NOW()
        WHERE id = ? AND company_id = ?
      `;

      const result = await executeQuery(query, [amount, id, companyId], 'Actualizar total compras cliente');

      if (result.affectedRows === 0) {
        throw new Error('Cliente no encontrado o no pertenece a la empresa');
      }

      return await this.findById(id, companyId);
    } catch (error) {
      logger.error('Error actualizando total de compras del cliente:', {
        error: error.message,
        id,
        amount,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Verificar si documento ya existe en la empresa
   * @param {string} documentNumber - Documento a verificar
   * @param {string} companyId - ID de la empresa
   * @param {string} excludeClientId - ID de cliente a excluir (para updates)
   * @returns {Promise<boolean>} True si el documento ya existe
   */
  static async documentExists(documentNumber, companyId, excludeClientId = null) {
    try {
      let query = `
        SELECT COUNT(*) as count 
        FROM clients 
        WHERE document_number = ? AND company_id = ? AND is_active = true
      `;
      
      let params = [documentNumber, companyId];
      
      if (excludeClientId) {
        query += ' AND id != ?';
        params.push(excludeClientId);
      }
      
      const result = await executeQuery(query, params, 'Verificar existencia de documento');
      return result[0].count > 0;
    } catch (error) {
      logger.error('Error verificando existencia de documento:', {
        error: error.message,
        documentNumber,
        companyId,
        excludeClientId
      });
      throw error;
    }
  }
  
  /**
   * Obtener estadísticas de clientes
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Estadísticas de clientes
   */
  static async getStats(companyId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_clients,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_clients,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_clients,
          COUNT(CASE WHEN current_points > 0 THEN 1 END) as clients_with_points,
          COALESCE(SUM(current_points), 0) as total_points_outstanding,
          COALESCE(SUM(total_purchases), 0) as total_sales_to_customers,
          COALESCE(AVG(current_points), 0) as average_points_per_client,
          COALESCE(AVG(total_purchases), 0) as avg_purchase_per_customer,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_clients_last_30_days
        FROM clients 
        WHERE company_id = ?
      `;
      
      const stats = await executeQuery(query, [companyId], 'Obtener estadísticas de clientes');
      return stats[0];
    } catch (error) {
      logger.error('Error obteniendo estadísticas de clientes:', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }
}

module.exports = ClientModel;