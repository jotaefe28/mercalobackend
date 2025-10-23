/**
 * Modelo de User (Usuario)
 * Sistema POS Multitenant
 * 
 * Maneja las operaciones CRUD para usuarios con aislamiento por empresa
 */

const { executeQuery, executeTransaction, logger } = require('../config/database');
const { addTenantFilter } = require('../config/tenantResolver');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

class UserModel {
  /**
   * Crear un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Usuario creado (sin contraseña)
   */
  static async create(userData, companyId) {
    try {
      const id = uuidv4();
      const now = new Date();
      
      // Hash de la contraseña
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      const query = `
        INSERT INTO users (
          id, company_id, name, email, phone, password, role, 
          is_active, created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        id,
        companyId,
        userData.name,
        userData.email,
        userData.phone ? userData.phone : null,
        hashedPassword,
        userData.role || 'USER',
        true,
        null, // created_by (será null para el primer admin)
        null, // updated_by (será null para el primer admin)
        now,
        now
      ];

      // Verificar que no haya parámetros undefined
      const hasUndefined = params.some(param => param === undefined);
      if (hasUndefined) {
        logger.error('Parámetro undefined detectado:', {
          params: params.map((p, i) => ({ index: i, value: p, type: typeof p }))
        });
        throw new Error('Datos de usuario incompletos');
      }
      
      await executeQuery(query, params, 'Crear usuario');
      
      // Retornar usuario creado sin contraseña
      return await this.findById(id, companyId);
    } catch (error) {
      logger.error('Error creando usuario:', {
        error: error.message,
        userData: { ...userData, password: '[HIDDEN]' },
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Buscar usuario por ID
   * @param {string} id - ID del usuario
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Usuario encontrado o null
   */
  static async findById(id, companyId) {
    try {
      let query = `
        SELECT 
          id,
          company_id,
          name,
          email,
          role,
          is_active,
          last_login,
          created_at,
          updated_at
        FROM users 
        WHERE id = ?
      `;
      
      let params = [id];
      
      // Agregar filtro de tenant
      if (companyId) {
        const filtered = addTenantFilter(query, companyId);
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      const users = await executeQuery(query, params, 'Buscar usuario por ID');
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('Error buscando usuario por ID:', {
        error: error.message,
        id,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Buscar usuario por email (para autenticación)
   * @param {string} email - Email del usuario
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Usuario con hash de contraseña
   */
  static async findByEmailWithPassword(email, companyId) {
    try {
      let query = `
        SELECT 
          id,
          company_id,
          name,
          email,
          phone,
          password,
          role,
          is_active,
          last_login,
          created_by,
          updated_by,
          created_at,
          updated_at
        FROM users 
        WHERE email = ? AND is_active = 1
      `;
      
      let params = [email];
      
      // Agregar filtro de tenant
      if (companyId) {
        const filtered = addTenantFilter(query, companyId);
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      const users = await executeQuery(query, params, 'Buscar usuario por email');
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('Error buscando usuario por email:', {
        error: error.message,
        email,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Buscar usuario por email (sin contraseña)
   * @param {string} email - Email del usuario
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object|null>} Usuario encontrado o null
   */
  static async findByEmail(email, companyId) {
    try {
      let query = `
        SELECT 
          id,
          company_id,
          name,
          email,
          phone,
          role,
          is_active,
          last_login,
          created_by,
          updated_by,
          created_at,
          updated_at
        FROM users 
        WHERE email = ?
      `;
      
      let params = [email];
      
      // Agregar filtro de tenant
      if (companyId) {
        const filtered = addTenantFilter(query, companyId);
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      const users = await executeQuery(query, params, 'Buscar usuario por email');
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('Error buscando usuario por email:', {
        error: error.message,
        email,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Listar usuarios de una empresa con paginación
   * @param {string} companyId - ID de la empresa
   * @param {Object} options - Opciones de paginación y filtrado
   * @returns {Promise<Object>} Lista de usuarios con metadatos
   */
  static async findAll(companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc',
        role = null,
        isActive = null,
        search = null
      } = options;
      
      const offset = (page - 1) * limit;
      let whereConditions = ['company_id = ?'];
      let params = [companyId];
      
      // Filtros adicionales
      if (role) {
        whereConditions.push('role = ?');
        params.push(role);
      }
      
      if (isActive !== null) {
        whereConditions.push('is_active = ?');
        params.push(isActive);
      }
      
      if (search) {
        whereConditions.push('(name LIKE ? OR email LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
      
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      
      // Query para contar total
      const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
      const totalResult = await executeQuery(countQuery, params, 'Contar usuarios');
      const total = totalResult[0].total;
      
      // Query principal
      const query = `
        SELECT 
          id,
          company_id,
          name,
          email,
          role,
          is_active,
          last_login,
          created_at,
          updated_at
        FROM users 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      params.push(limit, offset);
      const users = await executeQuery(query, params, 'Listar usuarios');
      
      return {
        data: users,
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
      logger.error('Error listando usuarios:', {
        error: error.message,
        companyId,
        options
      });
      throw error;
    }
  }
  
  /**
   * Actualizar usuario
   * @param {string} id - ID del usuario
   * @param {string} companyId - ID de la empresa
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Usuario actualizado
   */
  static async update(id, companyId, updateData) {
    try {
      const allowedFields = ['name', 'email', 'role', 'is_active'];
      const updateFields = [];
      const params = [];
      
      // Construir query de actualización dinámicamente
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      }
      
      // Manejar actualización de contraseña por separado
      if (updateData.password) {
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(updateData.password, saltRounds);
        updateFields.push('password = ?');
        params.push(hashedPassword);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }
      
      // Agregar updated_at
      updateFields.push('updated_at = ?');
      params.push(new Date());
      
      // Agregar condiciones WHERE
      params.push(id, companyId);
      
      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = ? AND company_id = ?
      `;
      
      const result = await executeQuery(query, params, 'Actualizar usuario');
      
      if (result.affectedRows === 0) {
        throw new Error('Usuario no encontrado');
      }
      
      // Retornar usuario actualizado
      return await this.findById(id, companyId);
    } catch (error) {
      logger.error('Error actualizando usuario:', {
        error: error.message,
        id,
        companyId,
        updateData: { ...updateData, password: updateData.password ? '[HIDDEN]' : undefined }
      });
      throw error;
    }
  }
  
  /**
   * Eliminar usuario (soft delete)
   * @param {string} id - ID del usuario
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  static async delete(id, companyId) {
    try {
      const query = `
        UPDATE users 
        SET is_active = false, updated_at = ?
        WHERE id = ? AND company_id = ?
      `;
      
      const result = await executeQuery(
        query, 
        [new Date(), id, companyId], 
        'Eliminar usuario (soft delete)'
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error eliminando usuario:', {
        error: error.message,
        id,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Actualizar último login del usuario
   * @param {string} id - ID del usuario
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<boolean>} True si se actualizó correctamente
   */
  static async updateLastLogin(id, companyId) {
    try {
      const query = `
        UPDATE users 
        SET last_login = ?, updated_at = ?
        WHERE id = ? AND company_id = ?
      `;
      
      const now = new Date();
      const result = await executeQuery(
        query, 
        [now, now, id, companyId], 
        'Actualizar último login'
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error actualizando último login:', {
        error: error.message,
        id,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Verificar contraseña
   * @param {string} plainPassword - Contraseña en texto plano
   * @param {string} hashedPassword - Contraseña hasheada
   * @returns {Promise<boolean>} True si la contraseña es correcta
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Error verificando contraseña:', {
        error: error.message
      });
      return false;
    }
  }
  
  /**
   * Contar usuarios por rol en una empresa
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Conteo por roles
   */
  static async countByRole(companyId) {
    try {
      const query = `
        SELECT 
          role,
          COUNT(*) as count
        FROM users 
        WHERE company_id = ? AND is_active = 1
        GROUP BY role
      `;
      
      const results = await executeQuery(query, [companyId], 'Contar usuarios por rol');
      
      // Convertir a objeto para fácil acceso
      const counts = {
        ADMIN: 0,
        MANAGER: 0,
        USER: 0
      };
      
      results.forEach(result => {
        counts[result.role] = result.count;
      });
      
      return counts;
    } catch (error) {
      logger.error('Error contando usuarios por rol:', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }
  
  /**
   * Verificar si un email ya existe en la empresa
   * @param {string} email - Email a verificar
   * @param {string} companyId - ID de la empresa
   * @param {string} excludeUserId - ID de usuario a excluir (para updates)
   * @returns {Promise<boolean>} True si el email ya existe
   */
  static async emailExists(email, companyId, excludeUserId = null) {
    try {
      let query = `
        SELECT COUNT(*) as count 
        FROM users 
        WHERE email = ? AND company_id = ?
      `;
      
      let params = [email, companyId];
      
      if (excludeUserId) {
        query += ' AND id != ?';
        params.push(excludeUserId);
      }
      
      const result = await executeQuery(query, params, 'Verificar existencia de email');
      return result[0].count > 0;
    } catch (error) {
      logger.error('Error verificando existencia de email:', {
        error: error.message,
        email,
        companyId,
        excludeUserId
      });
      throw error;
    }
  }
}

module.exports = UserModel;