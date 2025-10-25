/**
 * Script de Pruebas - Sistema de Ventas
 * Sistema POS Multitenant
 * 
 * Pruebas completas del sistema de ventas con integración
 * de productos, clientes, métodos de pago y puntos
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuración del servidor
const BASE_URL = 'http://localhost:3000/api';
const COMPANY_ID = 'test-company-' + Date.now();

// Variables globales para las pruebas
let authToken = '';
let testUser = null;
let testClient = null;
let testProducts = [];
let testPaymentMethods = [];
let testSales = [];

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'bold');
  console.log('='.repeat(60));
}

function logTest(testName, success = true, details = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  const color = success ? 'green' : 'red';
  log(`${status} ${testName}`, color);
  if (details) {
    log(`    ${details}`, 'yellow');
  }
}

// Función auxiliar para hacer requests
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Configurar datos de prueba
async function setupTestData() {
  logSection('CONFIGURACIÓN DE DATOS DE PRUEBA');

  // 1. Crear usuario de prueba
  const userData = {
    name: 'Usuario Test Ventas',
    email: `test-sales-${Date.now()}@example.com`,
    password: 'Test123456!',
    role: 'ADMIN',
    companyId: COMPANY_ID
  };

  log('Creando usuario de prueba...', 'blue');
  const userResult = await makeRequest('POST', '/auth/register', userData);
  
  if (userResult.success) {
    testUser = userResult.data.data;
    authToken = userResult.data.token;
    logTest('Usuario creado', true, `ID: ${testUser.id}`);
  } else {
    logTest('Usuario creado', false, userResult.error.message);
    process.exit(1);
  }

  // Headers con token para próximas requests
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };

  // 2. Crear cliente de prueba
  log('Creando cliente de prueba...', 'blue');
  const clientData = {
    document_type: 'cedula',
    document_number: `${Date.now()}`,
    name: 'Cliente Test',
    last_name: 'Ventas',
    phone: '+573001234567',
    email: `cliente-test-${Date.now()}@example.com`,
    points_balance: 10000
  };

  const clientResult = await makeRequest('POST', '/clients', clientData, authHeaders);
  if (clientResult.success) {
    testClient = clientResult.data.data;
    logTest('Cliente creado', true, `ID: ${testClient.id}, Puntos: ${testClient.points_balance}`);
  } else {
    logTest('Cliente creado', false, clientResult.error.message);
  }

  // 3. Crear productos de prueba
  log('Creando productos de prueba...', 'blue');
  const productsData = [
    {
      code: `PROD-${Date.now()}-1`,
      name: 'Producto Test 1',
      description: 'Producto para pruebas de ventas',
      category: 'Electrónicos',
      unit_of_measure: 'Unidad',
      price: 50000,
      cost: 30000,
      stock: 100,
      min_stock: 10,
      track_stock: true,
      status: 'active'
    },
    {
      code: `PROD-${Date.now()}-2`,
      name: 'Producto Test 2',
      description: 'Segundo producto para pruebas',
      category: 'Hogar',
      unit_of_measure: 'Unidad',
      price: 25000,
      cost: 15000,
      stock: 50,
      min_stock: 5,
      track_stock: true,
      status: 'active'
    }
  ];

  for (let i = 0; i < productsData.length; i++) {
    const productResult = await makeRequest('POST', '/products', productsData[i], authHeaders);
    if (productResult.success) {
      testProducts.push(productResult.data.data);
      logTest(`Producto ${i + 1} creado`, true, `${productResult.data.data.name} - Stock: ${productResult.data.data.stock}`);
    } else {
      logTest(`Producto ${i + 1} creado`, false, productResult.error.message);
    }
  }

  // 4. Crear métodos de pago de prueba
  log('Creando métodos de pago de prueba...', 'blue');
  const paymentMethodsData = [
    {
      name: 'Efectivo Test',
      type: 'cash',
      is_active: true
    },
    {
      name: 'Tarjeta Test',
      type: 'card',
      is_active: true
    }
  ];

  for (let i = 0; i < paymentMethodsData.length; i++) {
    const pmResult = await makeRequest('POST', '/payment-methods', paymentMethodsData[i], authHeaders);
    if (pmResult.success) {
      testPaymentMethods.push(pmResult.data.data);
      logTest(`Método de pago ${i + 1} creado`, true, pmResult.data.data.name);
    } else {
      logTest(`Método de pago ${i + 1} creado`, false, pmResult.error.message);
    }
  }

  log(`\nDatos de prueba configurados exitosamente:`, 'green');
  log(`- Usuario: ${testUser.name} (${testUser.email})`, 'blue');
  log(`- Cliente: ${testClient.name} ${testClient.last_name} (${testClient.points_balance} puntos)`, 'blue');
  log(`- Productos: ${testProducts.length} creados`, 'blue');
  log(`- Métodos de pago: ${testPaymentMethods.length} creados`, 'blue');
}

// Pruebas de creación de ventas
async function testCreateSale() {
  logSection('PRUEBAS DE CREACIÓN DE VENTAS');
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Venta básica exitosa
  log('Test 1: Creando venta básica...', 'blue');
  
  const saleData = {
    client_id: testClient.id,
    items: [
      {
        product_id: testProducts[0].id,
        quantity: 2,
        unit_price: testProducts[0].price,
        discount_amount: 0,
        subtotal: testProducts[0].price * 2
      },
      {
        product_id: testProducts[1].id,
        quantity: 1,
        unit_price: testProducts[1].price,
        discount_amount: 2500,
        subtotal: testProducts[1].price - 2500
      }
    ],
    payment_methods: [
      {
        method_id: testPaymentMethods[0].id,
        amount: 122500,
        reference: 'TEST-REF-001'
      }
    ],
    subtotal: 122500,
    tax_amount: 0,
    discount_amount: 2500,
    points_redeemed: 0,
    total: 122500,
    delivery_type: 'store',
    notes: 'Venta de prueba básica'
  };

  const result = await makeRequest('POST', '/sales', saleData, authHeaders);
  
  if (result.success) {
    testSales.push(result.data.data);
    logTest('Venta básica creada', true, `Factura: ${result.data.data.invoice_number}, Total: $${result.data.data.total}`);
  } else {
    logTest('Venta básica creada', false, result.error.message || JSON.stringify(result.error));
  }

  // Test 2: Venta con redención de puntos
  log('Test 2: Creando venta con redención de puntos...', 'blue');
  
  const saleWithPoints = {
    client_id: testClient.id,
    items: [
      {
        product_id: testProducts[0].id,
        quantity: 1,
        unit_price: testProducts[0].price,
        discount_amount: 0,
        subtotal: testProducts[0].price
      }
    ],
    payment_methods: [
      {
        method_id: testPaymentMethods[1].id,
        amount: 40000,
        reference: 'CARD-001'
      }
    ],
    subtotal: 50000,
    tax_amount: 0,
    discount_amount: 0,
    points_redeemed: 10000,
    total: 40000,
    delivery_type: 'delivery',
    delivery_address: 'Calle 123 #45-67',
    delivery_fee: 0,
    notes: 'Venta con redención de puntos'
  };

  const pointsResult = await makeRequest('POST', '/sales', saleWithPoints, authHeaders);
  
  if (pointsResult.success) {
    testSales.push(pointsResult.data.data);
    logTest('Venta con puntos creada', true, `Puntos redimidos: 10,000, Total final: $${pointsResult.data.data.total}`);
  } else {
    logTest('Venta con puntos creada', false, pointsResult.error.message || JSON.stringify(pointsResult.error));
  }

  // Test 3: Venta con stock insuficiente (debe fallar)
  log('Test 3: Probando venta con stock insuficiente...', 'blue');
  
  const saleInvalidStock = {
    client_id: testClient.id,
    items: [
      {
        product_id: testProducts[0].id,
        quantity: 1000, // Más del stock disponible
        unit_price: testProducts[0].price,
        discount_amount: 0,
        subtotal: testProducts[0].price * 1000
      }
    ],
    payment_methods: [
      {
        method_id: testPaymentMethods[0].id,
        amount: testProducts[0].price * 1000
      }
    ],
    subtotal: testProducts[0].price * 1000,
    total: testProducts[0].price * 1000
  };

  const invalidResult = await makeRequest('POST', '/sales', saleInvalidStock, authHeaders);
  
  if (!invalidResult.success && invalidResult.status === 409) {
    logTest('Validación de stock insuficiente', true, 'Error detectado correctamente');
  } else {
    logTest('Validación de stock insuficiente', false, 'Debería haber fallado por stock insuficiente');
  }
}

// Pruebas de consulta de ventas
async function testSaleQueries() {
  logSection('PRUEBAS DE CONSULTA DE VENTAS');
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Obtener venta por ID
  log('Test 1: Obteniendo venta por ID...', 'blue');
  
  if (testSales.length > 0) {
    const saleId = testSales[0].id;
    const result = await makeRequest('GET', `/sales/${saleId}`, null, authHeaders);
    
    if (result.success) {
      logTest('Consulta venta por ID', true, `Venta encontrada: ${result.data.data.invoice_number}`);
    } else {
      logTest('Consulta venta por ID', false, result.error.message);
    }
  }

  // Test 2: Listar ventas con filtros
  log('Test 2: Listando ventas con filtros...', 'blue');
  
  const today = new Date().toISOString().split('T')[0];
  const result = await makeRequest('GET', `/sales?page=1&limit=10&date_from=${today}`, null, authHeaders);
  
  if (result.success) {
    logTest('Listado de ventas', true, `${result.data.data.length} ventas encontradas`);
  } else {
    logTest('Listado de ventas', false, result.error.message);
  }

  // Test 3: Obtener estadísticas
  log('Test 3: Obteniendo estadísticas de ventas...', 'blue');
  
  const statsResult = await makeRequest('GET', '/sales/stats', null, authHeaders);
  
  if (statsResult.success) {
    logTest('Estadísticas de ventas', true, `Ventas hoy: ${statsResult.data.data.today.total_sales}`);
  } else {
    logTest('Estadísticas de ventas', false, statsResult.error.message);
  }
}

// Pruebas de cancelación de ventas
async function testSaleCancellation() {
  logSection('PRUEBAS DE CANCELACIÓN DE VENTAS');
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };

  if (testSales.length > 0) {
    log('Test 1: Cancelando venta...', 'blue');
    
    const saleId = testSales[0].id;
    const cancelData = {
      reason: 'Prueba de cancelación - Cliente cambió de opinión'
    };

    const result = await makeRequest('POST', `/sales/${saleId}/cancel`, cancelData, authHeaders);
    
    if (result.success) {
      logTest('Cancelación de venta', true, 'Venta cancelada correctamente');
      
      // Verificar que el stock se restauró
      log('Verificando restauración de stock...', 'blue');
      const productCheck = await makeRequest('GET', `/products/${testProducts[0].id}`, null, authHeaders);
      
      if (productCheck.success) {
        logTest('Restauración de stock', true, `Stock actual: ${productCheck.data.data.stock}`);
      } else {
        logTest('Restauración de stock', false, 'No se pudo verificar el stock');
      }
    } else {
      logTest('Cancelación de venta', false, result.error.message);
    }
  }
}

// Pruebas de reportes
async function testSalesReports() {
  logSection('PRUEBAS DE REPORTES DE VENTAS');
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };

  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Test 1: Resumen de ventas
  log('Test 1: Obteniendo resumen de ventas...', 'blue');
  
  const summaryResult = await makeRequest('GET', `/sales/summary?date_from=${lastMonth}&date_to=${today}`, null, authHeaders);
  
  if (summaryResult.success) {
    const summary = summaryResult.data.data;
    logTest('Resumen de ventas', true, `Total ventas: ${summary.total_sales}, Ingresos: $${summary.total_revenue}`);
  } else {
    logTest('Resumen de ventas', false, summaryResult.error.message);
  }

  // Test 2: Productos más vendidos
  log('Test 2: Obteniendo productos más vendidos...', 'blue');
  
  const topProductsResult = await makeRequest('GET', `/sales/top-products?limit=5&date_from=${lastMonth}&date_to=${today}`, null, authHeaders);
  
  if (topProductsResult.success) {
    logTest('Productos más vendidos', true, `${topProductsResult.data.data.length} productos encontrados`);
  } else {
    logTest('Productos más vendidos', false, topProductsResult.error.message);
  }

  // Test 3: Ventas por día
  log('Test 3: Obteniendo ventas por día...', 'blue');
  
  const byDayResult = await makeRequest('GET', `/sales/by-day?date_from=${today}&date_to=${today}`, null, authHeaders);
  
  if (byDayResult.success) {
    logTest('Ventas por día', true, `${byDayResult.data.data.length} días con ventas`);
  } else {
    logTest('Ventas por día', false, byDayResult.error.message);
  }
}

// Pruebas de funcionalidades especiales
async function testSpecialFeatures() {
  logSection('PRUEBAS DE FUNCIONALIDADES ESPECIALES');
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };

  if (testSales.length > 1) {
    const saleId = testSales[1].id; // Usar la segunda venta (no cancelada)

    // Test 1: Obtener recibo
    log('Test 1: Obteniendo recibo para impresión...', 'blue');
    
    const receiptResult = await makeRequest('GET', `/sales/${saleId}/receipt`, null, authHeaders);
    
    if (receiptResult.success) {
      logTest('Recibo de venta', true, `Factura: ${receiptResult.data.data.sale.invoice_number}`);
    } else {
      logTest('Recibo de venta', false, receiptResult.error.message);
    }

    // Test 2: Duplicar venta
    log('Test 2: Duplicando venta...', 'blue');
    
    const duplicateResult = await makeRequest('POST', `/sales/${saleId}/duplicate`, null, authHeaders);
    
    if (duplicateResult.success) {
      logTest('Duplicación de venta', true, `Nueva factura: ${duplicateResult.data.data.invoice_number}`);
    } else {
      logTest('Duplicación de venta', false, duplicateResult.error.message);
    }

    // Test 3: Ventas por cliente
    log('Test 3: Obteniendo ventas por cliente...', 'blue');
    
    const clientSalesResult = await makeRequest('GET', `/sales/by-client/${testClient.id}`, null, authHeaders);
    
    if (clientSalesResult.success) {
      logTest('Ventas por cliente', true, `${clientSalesResult.data.data.length} ventas del cliente`);
    } else {
      logTest('Ventas por cliente', false, clientSalesResult.error.message);
    }
  }
}

// Pruebas de validación y errores
async function testValidationAndErrors() {
  logSection('PRUEBAS DE VALIDACIÓN Y MANEJO DE ERRORES');
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Venta sin items (debe fallar)
  log('Test 1: Probando venta sin items...', 'blue');
  
  const noItemsSale = {
    client_id: testClient.id,
    items: [],
    payment_methods: [
      {
        method_id: testPaymentMethods[0].id,
        amount: 1000
      }
    ],
    subtotal: 1000,
    total: 1000
  };

  const noItemsResult = await makeRequest('POST', '/sales', noItemsSale, authHeaders);
  
  if (!noItemsResult.success && noItemsResult.status === 400) {
    logTest('Validación sin items', true, 'Error detectado correctamente');
  } else {
    logTest('Validación sin items', false, 'Debería haber fallado por falta de items');
  }

  // Test 2: Venta con totales incorrectos (debe fallar)
  log('Test 2: Probando venta con totales incorrectos...', 'blue');
  
  const wrongTotalSale = {
    client_id: testClient.id,
    items: [
      {
        product_id: testProducts[0].id,
        quantity: 1,
        unit_price: testProducts[0].price,
        discount_amount: 0,
        subtotal: testProducts[0].price
      }
    ],
    payment_methods: [
      {
        method_id: testPaymentMethods[0].id,
        amount: 999999 // Total incorrecto
      }
    ],
    subtotal: testProducts[0].price,
    total: 999999 // No coincide con subtotal
  };

  const wrongTotalResult = await makeRequest('POST', '/sales', wrongTotalSale, authHeaders);
  
  if (!wrongTotalResult.success && wrongTotalResult.status === 400) {
    logTest('Validación totales incorrectos', true, 'Error detectado correctamente');
  } else {
    logTest('Validación totales incorrectos', false, 'Debería haber fallado por totales incorrectos');
  }

  // Test 3: Acceso sin autenticación (debe fallar)
  log('Test 3: Probando acceso sin autenticación...', 'blue');
  
  const noAuthResult = await makeRequest('GET', '/sales');
  
  if (!noAuthResult.success && noAuthResult.status === 401) {
    logTest('Validación sin autenticación', true, 'Error detectado correctamente');
  } else {
    logTest('Validación sin autenticación', false, 'Debería haber fallado por falta de autenticación');
  }
}

// Función principal
async function runTests() {
  log('🚀 INICIANDO PRUEBAS DEL SISTEMA DE VENTAS', 'bold');
  log(`Servidor: ${BASE_URL}`, 'blue');
  log(`Empresa de prueba: ${COMPANY_ID}`, 'blue');
  
  try {
    await setupTestData();
    await testCreateSale();
    await testSaleQueries();
    await testSaleCancellation();
    await testSalesReports();
    await testSpecialFeatures();
    await testValidationAndErrors();
    
    logSection('RESUMEN DE PRUEBAS');
    log('✅ Todas las pruebas del sistema de ventas completadas', 'green');
    log(`📊 Ventas creadas: ${testSales.length}`, 'blue');
    log(`🛍️ Productos utilizados: ${testProducts.length}`, 'blue');
    log(`💳 Métodos de pago configurados: ${testPaymentMethods.length}`, 'blue');
    log(`👤 Cliente con ${testClient?.points_balance || 0} puntos`, 'blue');
    
  } catch (error) {
    log(`❌ Error general en las pruebas: ${error.message}`, 'red');
    console.error(error);
  }
}

// Ejecutar pruebas
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  makeRequest,
  BASE_URL
};