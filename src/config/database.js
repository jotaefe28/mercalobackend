/**
 * Configuración de Base de Datos MySQL con Pool de Conexiones
 * Sistema POS Multitenant
 */

const mysql = require('mysql2/promise');
const winston = require('winston');
require('dotenv').config();

// Configuración del logger para database
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Configuración del pool de conexiones MySQL
const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // Configuración del pool
  connectionLimit: 20,        // Máximo 20 conexiones simultáneas
  queueLimit: 0,             // Sin límite en la cola
  acquireTimeout: 60000,     // Timeout para obtener conexión: 60s
  timeout: 60000,            // Timeout para consultas: 60s
  reconnect: true,           // Reconexión automática
  
  // Configuración de seguridad
  ssl: false,                // SSL deshabilitado para desarrollo
  
  // Configuración de charset
  charset: 'utf8mb4',
  
  // Configuración de timezone
  timezone: 'local',
  
  // Configuración adicional para performance
  multipleStatements: false,  // Prevenir inyección SQL
  supportBigNumbers: true,
  bigNumberStrings: true,
  
  // Configuración de keep-alive
  keepAliveInitialDelay: 0,
  enableKeepAlive: true
};

// Crear el pool de conexiones
const pool = mysql.createPool(poolConfig);

/**
 * Función para probar la conexión a la base de datos
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('✓ Conexión a MySQL establecida correctamente', {
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      poolSize: poolConfig.connectionLimit
    });
    return true;
  } catch (error) {
    logger.error('✗ Error al conectar con MySQL:', {
      error: error.message,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME
    });
    return false;
  }
}

/**
 * Función para ejecutar consultas con logging automático
 * @param {string} query - Consulta SQL
 * @param {Array} params - Parámetros para la consulta
 * @param {string} operation - Descripción de la operación
 * @returns {Promise} Resultado de la consulta
 */
async function executeQuery(query, params = [], operation = 'Query') {
  const startTime = Date.now();
  let connection;
  
  try {
    connection = await pool.getConnection();
    const [results] = await connection.execute(query, params);
    const duration = Date.now() - startTime;
    
    logger.info(`✓ ${operation} ejecutado correctamente`, {
      duration: `${duration}ms`,
      affectedRows: results.affectedRows || results.length || 0
    });
    
    return results;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`✗ Error en ${operation}:`, {
      error: error.message,
      duration: `${duration}ms`,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      params: params.length > 0 ? 'Con parámetros' : 'Sin parámetros'
    });
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Función para ejecutar transacciones de manera segura
 * @param {Function} callback - Función que contiene las operaciones de la transacción
 * @returns {Promise} Resultado de la transacción
 */
async function executeTransaction(callback) {
  const connection = await pool.getConnection();
  const startTime = Date.now();
  
  try {
    await connection.beginTransaction();
    
    // Ejecutar las operaciones de la transacción
    const result = await callback(connection);
    
    await connection.commit();
    const duration = Date.now() - startTime;
    
    logger.info('✓ Transacción completada exitosamente', {
      duration: `${duration}ms`
    });
    
    return result;
  } catch (error) {
    await connection.rollback();
    const duration = Date.now() - startTime;
    
    logger.error('✗ Transacción falló - Rollback ejecutado:', {
      error: error.message,
      duration: `${duration}ms`
    });
    
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Función para obtener estadísticas del pool de conexiones
 */
function getPoolStats() {
  const stats = {
    totalConnections: pool.config.connectionLimit,
    activeConnections: pool._allConnections.length,
    freeConnections: pool._freeConnections.length,
    queuedRequests: pool._connectionQueue.length
  };
  
  logger.info('📊 Estadísticas del Pool de Conexiones:', stats);
  return stats;
}

/**
 * Función para cerrar el pool de conexiones de manera segura
 */
async function closePool() {
  try {
    await pool.end();
    logger.info('✓ Pool de conexiones MySQL cerrado correctamente');
  } catch (error) {
    logger.error('✗ Error al cerrar el pool de conexiones:', error.message);
  }
}

// Manejo de eventos del pool
pool.on('connection', (connection) => {
  logger.debug(`Nueva conexión establecida como id ${connection.threadId}`);
});

pool.on('error', (error) => {
  logger.error('Error en el pool de conexiones MySQL:', {
    error: error.message,
    code: error.code
  });
});

// Exportar pool y funciones utilitarias
module.exports = pool;
module.exports.testConnection = testConnection;
module.exports.executeQuery = executeQuery;
module.exports.executeTransaction = executeTransaction;
module.exports.getPoolStats = getPoolStats;
module.exports.closePool = closePool;
module.exports.logger = logger;