/**
 * Modelo de Company (Empresa)
 * Sistema POS Multitenant
 * 
 * Maneja las operaciones CRUD para empresas en el sistema multitenant
 */

const { executeQuery, executeTransaction, logger } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class CompanyModel {
  /**
   * Crear una nueva empresa
   * @param {Object} companyData - Datos de la empresa
   * @returns {Promise<Object>} Empresa creada
   */
  static async create(companyData) {
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO companies (
          id, name, tax_id, email, phone, address, plan, active_until, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        id,
        companyData.name,
        companyData.tax_id,
        companyData.email,
        companyData.phone || null,
        companyData.address || null,
        companyData.plan || 'BASIC',
        companyData.active_until || null,
        true,
        now,
        now
      ];
      
      await executeQuery(query, params, 'Crear empresa');
      
      // Retornar la empresa creada
      return await this.findById(id);
    } catch (error) {
      logger.error('Error creando empresa:', {
        error: error.message,
        companyData
      });
      throw error;
    }
  }
  
  /**
   * Buscar empresa por ID
   * @param {string} id - ID de la empresa
   * @returns {Promise<Object|null>} Empresa encontrada o null
   */
  static async findById(id) {
    try {
      const query = `
        SELECT 
          id,
          name,
          tax_id,
          email,
          phone,
          address,
          plan,
          active_until,
          is_active,
          created_at,
          updated_at
        FROM companies 
        WHERE id = ?
      `;
      
      const companies = await executeQuery(query, [id], 'Buscar empresa por ID');
      return companies.length > 0 ? companies[0] : null;
    } catch (error) {
      logger.error('Error buscando empresa por ID:', {
        error: error.message,
        id
      });
      throw error;
    }
  }
  
  /**
   * Buscar empresa por tax_id
   * @param {string} taxId - Tax ID de la empresa
   * @returns {Promise<Object|null>} Empresa encontrada o null
   */
  static async findByTaxId(taxId) {
    try {
      const query = `
        SELECT 
          id,
          name,
          tax_id,
          email,
          phone,
          address,
          plan,
          active_until,
          is_active,
          created_at,
          updated_at
        FROM companies 
        WHERE tax_id = ?
      `;
      
      const companies = await executeQuery(query, [taxId], 'Buscar empresa por Tax ID');
      return companies.length > 0 ? companies[0] : null;
    } catch (error) {
      logger.error('Error buscando empresa por Tax ID:', {
        error: error.message,
        taxId
      });
      throw error;
    }
  }
  
  /**
   * Listar todas las empresas con paginación
   * @param {Object} options - Opciones de paginación y filtrado
   * @returns {Promise<Object>} Lista de empresas con metadatos
   */
  static async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc',
        isActive = null,
        plan = null,
        search = null
      } = options;
      
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let params = [];
      
      // Filtros
      if (isActive !== null) {
        whereConditions.push('is_active = ?');
        params.push(isActive);
      }
      
      if (plan) {
        whereConditions.push('plan = ?');
        params.push(plan);
      }
      
      if (search) {
        whereConditions.push('(name LIKE ? OR tax_id LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';
      
      // Query para contar total
      const countQuery = `SELECT COUNT(*) as total FROM companies ${whereClause}`;
      const totalResult = await executeQuery(countQuery, params, 'Contar empresas');
      const total = totalResult[0].total;
      
      // Query principal
      const query = `
        SELECT 
          id,
          name,
          tax_id,
          email,
          phone,
          address,
          plan,
          active_until,
          is_active,
          created_at,
          updated_at
        FROM companies 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      params.push(limit, offset);
      const companies = await executeQuery(query, params, 'Listar empresas');
      
      return {
        data: companies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error listando empresas:', {
        error: error.message,
        options
      });
      throw error;
    }
  }
  
  /**
   * Actualizar empresa
   * @param {string} id - ID de la empresa
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Empresa actualizada
   */
  static async update(id, updateData) {
    try {
      const allowedFields = ['name', 'tax_id', 'email', 'phone', 'address', 'plan', 'active_until', 'is_active'];
      const updateFields = [];
      const params = [];
      
      // Construir query de actualización dinámicamente
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
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
      
      // Agregar ID para el WHERE
      params.push(id);
      
      const query = `
        UPDATE companies 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      
      const result = await executeQuery(query, params, 'Actualizar empresa');
      
      if (result.affectedRows === 0) {
        throw new Error('Empresa no encontrada');
      }
      
      // Retornar empresa actualizada
      return await this.findById(id);
    } catch (error) {
      logger.error('Error actualizando empresa:', {
        error: error.message,
        id,
        updateData
      });
      throw error;
    }
  }
  
  /**
   * Eliminar empresa (soft delete)
   * @param {string} id - ID de la empresa
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  static async delete(id) {
    try {
      const query = `
        UPDATE companies 
        SET is_active = false, updated_at = ?
        WHERE id = ?
      `;
      
      const result = await executeQuery(
        query, 
        [new Date(), id], 
        'Eliminar empresa (soft delete)'
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error eliminando empresa:', {
        error: error.message,
        id
      });
      throw error;
    }
  }
  
  /**
   * Verificar si una empresa está próxima a vencer
   * @param {string} id - ID de la empresa
   * @returns {Promise<Object>} Estado de vencimiento
   */
  static async checkExpiration(id) {
    try {
      const query = `
        SELECT 
          id,
          name,
          active_until,
          is_active,
          CASE 
            WHEN active_until IS NULL THEN 'NEVER_EXPIRES'
            WHEN active_until <= NOW() THEN 'EXPIRED'
            WHEN active_until <= DATE_ADD(NOW(), INTERVAL 7 DAY) THEN 'EXPIRING_SOON'
            ELSE 'ACTIVE'
          END as expiration_status,
          CASE 
            WHEN active_until IS NOT NULL 
            THEN DATEDIFF(active_until, NOW())
            ELSE NULL
          END as days_remaining
        FROM companies 
        WHERE id = ?
      `;
      
      const companies = await executeQuery(query, [id], 'Verificar expiración de empresa');
      return companies.length > 0 ? companies[0] : null;
    } catch (error) {
      logger.error('Error verificando expiración de empresa:', {
        error: error.message,
        id
      });
      throw error;
    }
  }
  
  /**
   * Obtener estadísticas de una empresa
   * @param {string} id - ID de la empresa
   * @returns {Promise<Object>} Estadísticas de la empresa
   */
  static async getStats(id) {
    try {
      const query = `
        SELECT 
          c.id,
          c.name,
          c.plan,
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT p.id) as total_products,
          COUNT(DISTINCT cl.id) as total_clients,
          COUNT(DISTINCT s.id) as total_sales,
          COALESCE(SUM(s.total), 0) as total_revenue,
          COUNT(DISTINCT CASE WHEN s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN s.id END) as sales_last_30_days,
          COALESCE(SUM(CASE WHEN s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN s.total ELSE 0 END), 0) as revenue_last_30_days
        FROM companies c
        LEFT JOIN users u ON c.id = u.company_id AND u.is_active = 1
        LEFT JOIN products p ON c.id = p.company_id AND p.is_active = 1
        LEFT JOIN clients cl ON c.id = cl.company_id
        LEFT JOIN sales s ON c.id = s.company_id AND s.status = 'completed'
        WHERE c.id = ?
        GROUP BY c.id
      `;
      
      const stats = await executeQuery(query, [id], 'Obtener estadísticas de empresa');
      return stats.length > 0 ? stats[0] : null;
    } catch (error) {
      logger.error('Error obteniendo estadísticas de empresa:', {
        error: error.message,
        id
      });
      throw error;
    }
  }
  
  /**
   * Extender suscripción de una empresa
   * @param {string} id - ID de la empresa
   * @param {number} months - Meses a extender
   * @returns {Promise<Object>} Empresa actualizada
   */
  static async extendSubscription(id, months) {
    try {
      const query = `
        UPDATE companies 
        SET 
          active_until = CASE 
            WHEN active_until IS NULL OR active_until <= NOW() 
            THEN DATE_ADD(NOW(), INTERVAL ? MONTH)
            ELSE DATE_ADD(active_until, INTERVAL ? MONTH)
          END,
          updated_at = ?
        WHERE id = ?
      `;
      
      const result = await executeQuery(
        query, 
        [months, months, new Date(), id], 
        'Extender suscripción de empresa'
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Empresa no encontrada');
      }
      
      return await this.findById(id);
    } catch (error) {
      logger.error('Error extendiendo suscripción de empresa:', {
        error: error.message,
        id,
        months
      });
      throw error;
    }
  }
}

module.exports = CompanyModel;