/**
 * Modelo de Payment Method (Método de Pago)
 * Sistema POS Multitenant
 */

const { executeQuery, logger } = require('../config/database');
const { addTenantFilter } = require('../config/tenantResolver');
const { v4: uuidv4 } = require('uuid');

class PaymentMethodModel {
  static async create(methodData, companyId) {
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO payment_methods (
          id, company_id, name, channel, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      await executeQuery(query, [
        id, companyId, methodData.name, methodData.channel, 
        true, now, now
      ], 'Crear método de pago');
      
      return await this.findById(id, companyId);
    } catch (error) {
      logger.error('Error creando método de pago:', { error: error.message, methodData, companyId });
      throw error;
    }
  }
  
  static async findById(id, companyId) {
    try {
      let query = `
        SELECT id, company_id, name, channel, is_active, created_at, updated_at
        FROM payment_methods WHERE id = ?
      `;
      let params = [id];
      
      if (companyId) {
        const filtered = addTenantFilter(query, companyId);
        query = filtered.query;
        params.push(filtered.tenantParam);
      }
      
      const methods = await executeQuery(query, params, 'Buscar método de pago por ID');
      return methods.length > 0 ? methods[0] : null;
    } catch (error) {
      logger.error('Error buscando método de pago:', { error: error.message, id, companyId });
      throw error;
    }
  }
  
  static async findAll(companyId, options = {}) {
    try {
      const { isActive = true } = options;
      
      let query = `
        SELECT id, company_id, name, channel, is_active, created_at, updated_at
        FROM payment_methods WHERE company_id = ?
      `;
      let params = [companyId];
      
      if (isActive !== null) {
        query += ' AND is_active = ?';
        params.push(isActive);
      }
      
      query += ' ORDER BY name ASC';
      
      return await executeQuery(query, params, 'Listar métodos de pago');
    } catch (error) {
      logger.error('Error listando métodos de pago:', { error: error.message, companyId, options });
      throw error;
    }
  }
  
  static async update(id, companyId, updateData) {
    try {
      const allowedFields = ['name', 'channel', 'is_active'];
      const updateFields = [];
      const params = [];
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          params.push(updateData[key]);
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }
      
      updateFields.push('updated_at = ?');
      params.push(new Date(), id, companyId);
      
      const query = `
        UPDATE payment_methods 
        SET ${updateFields.join(', ')}
        WHERE id = ? AND company_id = ?
      `;
      
      const result = await executeQuery(query, params, 'Actualizar método de pago');
      if (result.affectedRows === 0) throw new Error('Método de pago no encontrado');
      
      return await this.findById(id, companyId);
    } catch (error) {
      logger.error('Error actualizando método de pago:', { error: error.message, id, companyId, updateData });
      throw error;
    }
  }
}

module.exports = PaymentMethodModel;