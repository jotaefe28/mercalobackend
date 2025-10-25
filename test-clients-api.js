/**
 * Test de APIs de Clientes
 * Sistema POS Multitenant
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Token de prueba (debes reemplazarlo con un token válido)
let authToken = '';

/**
 * Función para hacer login y obtener el token
 */
async function authenticate() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com', // Reemplaza con credenciales válidas
      password: 'password123'
    });
    
    authToken = response.data.data.access_token;
    console.log('✅ Autenticación exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error en autenticación:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Headers con autorización
 */
function getHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Test: Crear un nuevo cliente
 */
async function testCreateClient() {
  console.log('\n🧪 Probando crear cliente...');
  
  const newClient = {
    document_type: 'cedula',
    document_number: '12345678',
    name: 'Juan Carlos',
    last_name: 'Pérez García',
    phone: '+573001234567',
    email: 'juan.perez@email.com',
    address: 'Calle 123 #45-67',
    city: 'Bogotá',
    department: 'Cundinamarca',
    birth_date: '1985-06-15'
  };
  
  try {
    const response = await axios.post(`${BASE_URL}/clients`, newClient, {
      headers: getHeaders()
    });
    
    console.log('✅ Cliente creado exitosamente:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error creando cliente:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test: Obtener lista de clientes
 */
async function testGetClients() {
  console.log('\n🧪 Probando obtener lista de clientes...');
  
  try {
    const response = await axios.get(`${BASE_URL}/clients?page=1&limit=10`, {
      headers: getHeaders()
    });
    
    console.log('✅ Lista de clientes obtenida:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test: Buscar cliente por ID
 */
async function testGetClientById(clientId) {
  console.log(`\n🧪 Probando obtener cliente por ID: ${clientId}...`);
  
  try {
    const response = await axios.get(`${BASE_URL}/clients/${clientId}`, {
      headers: getHeaders()
    });
    
    console.log('✅ Cliente encontrado:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error obteniendo cliente por ID:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test: Buscar cliente por documento
 */
async function testGetClientByDocument(documentType, documentNumber) {
  console.log(`\n🧪 Probando obtener cliente por documento: ${documentType}/${documentNumber}...`);
  
  try {
    const response = await axios.get(`${BASE_URL}/clients/${documentType}/${documentNumber}`, {
      headers: getHeaders()
    });
    
    console.log('✅ Cliente encontrado por documento:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error obteniendo cliente por documento:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test: Actualizar cliente
 */
async function testUpdateClient(clientId) {
  console.log(`\n🧪 Probando actualizar cliente: ${clientId}...`);
  
  const updateData = {
    phone: '+573009876543',
    email: 'juan.perez.updated@email.com',
    address: 'Carrera 45 #123-67 Apto 501'
  };
  
  try {
    const response = await axios.put(`${BASE_URL}/clients/${clientId}`, updateData, {
      headers: getHeaders()
    });
    
    console.log('✅ Cliente actualizado exitosamente:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error actualizando cliente:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test: Buscar clientes
 */
async function testSearchClients() {
  console.log('\n🧪 Probando búsqueda de clientes...');
  
  try {
    const response = await axios.get(`${BASE_URL}/clients/search?search=Juan`, {
      headers: getHeaders()
    });
    
    console.log('✅ Búsqueda realizada exitosamente:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error en búsqueda de clientes:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test: Actualizar puntos del cliente
 */
async function testUpdateClientPoints(clientId) {
  console.log(`\n🧪 Probando actualizar puntos del cliente: ${clientId}...`);
  
  try {
    const response = await axios.patch(`${BASE_URL}/clients/${clientId}/points`, {
      points_change: 100
    }, {
      headers: getHeaders()
    });
    
    console.log('✅ Puntos actualizados exitosamente:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error actualizando puntos:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test: Actualizar total de compras
 */
async function testUpdateClientPurchases(clientId) {
  console.log(`\n🧪 Probando actualizar total de compras del cliente: ${clientId}...`);
  
  try {
    const response = await axios.patch(`${BASE_URL}/clients/${clientId}/purchases`, {
      purchase_amount: 150000
    }, {
      headers: getHeaders()
    });
    
    console.log('✅ Total de compras actualizado exitosamente:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error actualizando total de compras:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test: Obtener estadísticas de clientes
 */
async function testGetClientStats() {
  console.log('\n🧪 Probando obtener estadísticas de clientes...');
  
  try {
    const response = await axios.get(`${BASE_URL}/clients/stats`, {
      headers: getHeaders()
    });
    
    console.log('✅ Estadísticas obtenidas exitosamente:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test: Desactivar cliente
 */
async function testToggleClientStatus(clientId) {
  console.log(`\n🧪 Probando cambiar estado del cliente: ${clientId}...`);
  
  try {
    const response = await axios.patch(`${BASE_URL}/clients/${clientId}/status`, {
      is_active: false
    }, {
      headers: getHeaders()
    });
    
    console.log('✅ Estado del cliente cambiado exitosamente:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error cambiando estado del cliente:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Ejecutar todas las pruebas
 */
async function runAllTests() {
  console.log('🚀 Iniciando pruebas de APIs de Clientes...\n');
  
  // Autenticar
  const authenticated = await authenticate();
  if (!authenticated) {
    console.log('❌ No se pudo autenticar. Finalizando pruebas.');
    return;
  }
  
  // Crear cliente
  const newClient = await testCreateClient();
  if (!newClient) {
    console.log('❌ No se pudo crear cliente. Continuando con otras pruebas...');
    return;
  }
  
  const clientId = newClient.id;
  
  // Obtener lista de clientes
  await testGetClients();
  
  // Obtener cliente por ID
  await testGetClientById(clientId);
  
  // Obtener cliente por documento
  await testGetClientByDocument('cedula', '12345678');
  
  // Actualizar cliente
  await testUpdateClient(clientId);
  
  // Buscar clientes
  await testSearchClients();
  
  // Actualizar puntos
  await testUpdateClientPoints(clientId);
  
  // Actualizar total de compras
  await testUpdateClientPurchases(clientId);
  
  // Obtener estadísticas
  await testGetClientStats();
  
  // Cambiar estado
  await testToggleClientStatus(clientId);
  
  console.log('\n✅ Todas las pruebas completadas!');
}

/**
 * Función para validar estructura de cliente
 */
function validateClientStructure(client) {
  const requiredFields = [
    'id', 'document_type', 'document_number', 'name', 
    'current_points', 'total_purchases', 'is_active',
    'created_at', 'updated_at'
  ];
  
  const missingFields = requiredFields.filter(field => !(field in client));
  
  if (missingFields.length > 0) {
    console.warn('⚠️  Campos faltantes en estructura del cliente:', missingFields);
    return false;
  }
  
  console.log('✅ Estructura del cliente válida');
  return true;
}

// Ejecutar pruebas si el script se ejecuta directamente
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  });
}

module.exports = {
  authenticate,
  testCreateClient,
  testGetClients,
  testGetClientById,
  testGetClientByDocument,
  testUpdateClient,
  testSearchClients,
  testUpdateClientPoints,
  testUpdateClientPurchases,
  testGetClientStats,
  testToggleClientStatus,
  validateClientStructure
};