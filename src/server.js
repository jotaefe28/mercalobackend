/**
 * Servidor Principal
 * Sistema POS Multitenant
 */

const app = require('./app');
const db = require('./config/database');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    // Verificar conexión a la base de datos
    console.log('🔌 Verificando conexión a la base de datos...');
    await db.execute('SELECT 1 as test');
    console.log('✅ Conexión a la base de datos establecida correctamente');

    // Verificar que las tablas principales existen
    console.log('🔍 Verificando estructura de la base de datos...');
    const [tables] = await db.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('companies', 'users', 'products', 'clients', 'sales')
    `);
    
    if (tables.length < 5) {
      console.warn('⚠️  Advertencia: No se encontraron todas las tablas principales. Asegúrate de ejecutar el script SQL de inicialización.');
    } else {
      console.log('✅ Estructura de la base de datos verificada');
    }

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      console.log('🚀 Servidor iniciado exitosamente');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌐 Entorno: ${NODE_ENV}`);
      console.log(`📊 API Info: http://localhost:${PORT}/api`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
      console.log('');
      console.log('📋 Endpoints disponibles:');
      console.log('  🔐 Autenticación: /api/auth');
      console.log('  👥 Usuarios: /api/users');
      console.log('  📦 Productos: /api/products');
      console.log('  💰 Ventas: /api/sales');
      console.log('  👤 Clientes: /api/clients');
      console.log('  ⭐ Puntos: /api/points');
      console.log('  💳 Métodos de Pago: /api/payment-methods');
      console.log('  📋 Órdenes: /api/orders');
      console.log('');
      console.log('🎯 Sistema POS Multitenant listo para recibir solicitudes');
    });

    // Manejo de cierre graceful
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Señal ${signal} recibida. Cerrando servidor...`);
      
      server.close(async () => {
        console.log('🔌 Servidor HTTP cerrado');
        
        try {
          await db.end();
          console.log('🗄️  Conexión a la base de datos cerrada');
        } catch (error) {
          console.error('❌ Error al cerrar la conexión a la base de datos:', error);
        }
        
        console.log('✅ Cierre graceful completado');
        process.exit(0);
      });

      // Forzar cierre después de 10 segundos
      setTimeout(() => {
        console.error('⚠️  Forzando cierre del servidor...');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('🔑 Error de autenticación de base de datos. Verifica las credenciales en el archivo .env');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 No se puede conectar a la base de datos. Verifica que MySQL esté ejecutándose');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('🗄️  La base de datos especificada no existe. Verifica el nombre en el archivo .env');
    }
    
    process.exit(1);
  }
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('💥 Excepción no capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promesa rechazada no manejada en:', promise, 'razón:', reason);
  process.exit(1);
});

// Iniciar servidor si este archivo se ejecuta directamente
if (require.main === module) {
  startServer();
}

module.exports = { startServer };