/**
 * Script de Pruebas para APIs de Productos - MercaloPOS
 * 
 * Este script proporciona ejemplos completos para probar todas las APIs
 * de gestión de productos del sistema MercaloPOS.
 */

const baseURL = 'http://localhost:3000/api';
let authToken = ''; // Reemplazar con token válido

/**
 * Configuración de headers para las peticiones
 */
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authToken}`
});

/**
 * Función auxiliar para realizar peticiones HTTP
 */
async function makeRequest(method, endpoint, data = null) {
  const url = `${baseURL}${endpoint}`;
  const options = {
    method,
    headers: getHeaders()
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    console.log(`\n=== ${method} ${endpoint} ===`);
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    return { status: response.status, data: result };
  } catch (error) {
    console.error(`Error en ${method} ${endpoint}:`, error.message);
    return { error: error.message };
  }
}

/**
 * PRUEBAS DE PRODUCTOS
 */

// 1. OBTENER ESTADÍSTICAS DE PRODUCTOS
async function testGetProductStats() {
  return await makeRequest('GET', '/products/reports/stats');
}

// 2. CREAR PRODUCTO BÁSICO
async function testCreateBasicProduct() {
  const productData = {
    sku: 'COCA-355-TEST',
    name: 'Coca Cola 355ml - Test',
    description: 'Bebida gaseosa sabor cola en lata de 355ml',
    category: 'bebidas',
    brand: 'Coca Cola',
    barcode: '7501234567890',
    price: 2.50,
    cost: 1.80,
    stock: 100,
    min_stock: 20,
    max_stock: 500,
    unit_of_measure: 'unidad',
    weight: 0.355,
    tax_rate: 16.0,
    is_featured: true,
    tags: ['bebida', 'gaseosa', 'cola']
  };
  
  return await makeRequest('POST', '/products', productData);
}

// 3. CREAR PRODUCTO COMPLETO CON TODAS LAS PROPIEDADES
async function testCreateCompleteProduct() {
  const productData = {
    sku: 'LAPTOP-HP-001',
    name: 'Laptop HP Pavilion 15.6"',
    description: 'Laptop HP Pavilion con procesador Intel Core i5, 8GB RAM, 256GB SSD',
    category: 'tecnologia',
    brand: 'HP',
    barcode: '1234567890123',
    price: 15999.00,
    cost: 12500.00,
    stock: 5,
    min_stock: 2,
    max_stock: 20,
    unit_of_measure: 'unidad',
    weight: 1.8,
    dimensions: {
      length: 35.8,
      width: 24.2,
      height: 1.9
    },
    tax_rate: 16.0,
    discount_price: 14999.00,
    supplier_id: null,
    image_url: 'https://example.com/laptop-hp.jpg',
    tags: ['laptop', 'computadora', 'hp', 'promoción'],
    is_service: false,
    is_featured: true,
    is_digital: false,
    requires_prescription: false,
    age_restriction: null
  };
  
  return await makeRequest('POST', '/products', productData);
}

// 4. CREAR PRODUCTO DE SERVICIO
async function testCreateServiceProduct() {
  const serviceData = {
    sku: 'SERV-MANT-001',
    name: 'Servicio de Mantenimiento Preventivo',
    description: 'Servicio completo de mantenimiento preventivo para equipos',
    category: 'otros',
    price: 150.00,
    cost: 80.00,
    stock: 0, // Los servicios no tienen stock físico
    min_stock: 0,
    unit_of_measure: 'unidad',
    tax_rate: 16.0,
    is_service: true,
    is_featured: false
  };
  
  return await makeRequest('POST', '/products', serviceData);
}

// 5. OBTENER TODOS LOS PRODUCTOS CON FILTROS
async function testGetProductsWithFilters() {
  const params = new URLSearchParams({
    page: '1',
    limit: '5',
    category: 'bebidas',
    is_active: 'true',
    sort_by: 'name',
    sort_order: 'ASC'
  });
  
  return await makeRequest('GET', `/products?${params}`);
}

// 6. BUSCAR PRODUCTOS
async function testSearchProducts() {
  const params = new URLSearchParams({
    search: 'coca',
    limit: '10'
  });
  
  return await makeRequest('GET', `/products/search?${params}`);
}

// 7. BÚSQUEDA AVANZADA CON MÚLTIPLES FILTROS
async function testAdvancedSearch() {
  const params = new URLSearchParams({
    search: 'laptop',
    category: 'tecnologia',
    min_price: '10000',
    max_price: '20000',
    is_featured: 'true',
    sort_by: 'price',
    sort_order: 'DESC',
    limit: '20'
  });
  
  return await makeRequest('GET', `/products?${params}`);
}

// 8. OBTENER PRODUCTO POR SKU
async function testGetProductBySku() {
  return await makeRequest('GET', '/products/sku/COCA-355-TEST');
}

// 9. OBTENER PRODUCTO POR CÓDIGO DE BARRAS
async function testGetProductByBarcode() {
  return await makeRequest('GET', '/products/barcode/7501234567890');
}

// 10. ACTUALIZAR PRODUCTO
async function testUpdateProduct(productId) {
  const updateData = {
    price: 2.75,
    discount_price: 2.50,
    stock: 80,
    is_featured: false,
    tags: ['bebida', 'gaseosa', 'cola', 'actualizado']
  };
  
  return await makeRequest('PUT', `/products/${productId}`, updateData);
}

// 11. AJUSTAR STOCK
async function testAdjustStock(productId) {
  const adjustmentData = {
    adjustment: -10,
    reason: 'Venta al cliente - prueba'
  };
  
  return await makeRequest('POST', `/products/${productId}/stock/adjust`, adjustmentData);
}

// 12. ACTIVAR/DESACTIVAR PRODUCTO
async function testToggleProductStatus(productId) {
  const statusData = {
    is_active: false
  };
  
  return await makeRequest('PATCH', `/products/${productId}/status`, statusData);
}

// 13. DUPLICAR PRODUCTO
async function testDuplicateProduct(productId) {
  const overrides = {
    sku: 'COCA-355-COPY',
    name: 'Coca Cola 355ml - Copia',
    stock: 0,
    barcode: null
  };
  
  return await makeRequest('POST', `/products/${productId}/duplicate`, overrides);
}

// 14. ACTUALIZACIÓN MASIVA DE PRECIOS
async function testBulkUpdatePrices(productIds) {
  const bulkData = {
    products: productIds.map((id, index) => ({
      id,
      price: 25.99 + (index * 5),
      cost: 18.50 + (index * 3)
    }))
  };
  
  return await makeRequest('PATCH', '/products/bulk/prices', bulkData);
}

// 15. VALIDAR DISPONIBILIDAD DE PRODUCTOS
async function testValidateAvailability(productIds) {
  const validationData = {
    products: productIds.map(id => ({
      product_id: id,
      quantity: 5
    }))
  };
  
  return await makeRequest('POST', '/products/validate/availability', validationData);
}

// 16. OBTENER PRODUCTOS CON STOCK BAJO
async function testGetLowStockProducts() {
  return await makeRequest('GET', '/products/reports/low-stock');
}

// 17. OBTENER LISTA DE REABASTECIMIENTO
async function testGetReorderList() {
  return await makeRequest('GET', '/products/reports/reorder');
}

// 18. OBTENER PRODUCTOS PRÓXIMOS A VENCER
async function testGetExpiringProducts() {
  const params = new URLSearchParams({
    days: '30'
  });
  
  return await makeRequest('GET', `/products/reports/expiring?${params}`);
}

// 19. OBTENER PRODUCTOS CON DESCUENTO
async function testGetDiscountedProducts() {
  return await makeRequest('GET', '/products/reports/discounted');
}

// 20. ELIMINAR PRODUCTO
async function testDeleteProduct(productId) {
  return await makeRequest('DELETE', `/products/${productId}`);
}

// 21. PRUEBAS DE VALIDACIÓN - PRODUCTO INVÁLIDO
async function testCreateInvalidProduct() {
  const invalidData = {
    // SKU faltante
    name: '', // Nombre vacío
    price: -10, // Precio negativo
    stock: -5, // Stock negativo
    category: 'categoria-invalida' // Categoría no válida
  };
  
  return await makeRequest('POST', '/products', invalidData);
}

// 22. PRUEBA DE SKU DUPLICADO
async function testCreateDuplicateSku() {
  const duplicateData = {
    sku: 'COCA-355-TEST', // SKU que ya existe
    name: 'Producto Duplicado',
    price: 10.00,
    stock: 50
  };
  
  return await makeRequest('POST', '/products', duplicateData);
}

/**
 * EJECUTAR TODAS LAS PRUEBAS
 */
async function runAllTests() {
  console.log('🚀 Iniciando pruebas de APIs de Productos...\n');
  
  if (!authToken) {
    console.error('❌ Error: Debe configurar el authToken antes de ejecutar las pruebas');
    return;
  }
  
  try {
    // 1. Estadísticas iniciales
    console.log('\n📊 1. OBTENIENDO ESTADÍSTICAS INICIALES...');
    await testGetProductStats();
    
    // 2. Crear productos de prueba
    console.log('\n📦 2. CREANDO PRODUCTOS DE PRUEBA...');
    const basicProduct = await testCreateBasicProduct();
    const completeProduct = await testCreateCompleteProduct();
    const serviceProduct = await testCreateServiceProduct();
    
    // Obtener IDs de productos creados
    const basicProductId = basicProduct.data?.data?.id;
    const completeProductId = completeProduct.data?.data?.id;
    const serviceProductId = serviceProduct.data?.data?.id;
    
    // 3. Consultas y búsquedas
    console.log('\n🔍 3. PROBANDO CONSULTAS Y BÚSQUEDAS...');
    await testGetProductsWithFilters();
    await testSearchProducts();
    await testAdvancedSearch();
    
    if (basicProductId) {
      await testGetProductBySku();
      await testGetProductByBarcode();
    }
    
    // 4. Actualización de productos
    console.log('\n✏️ 4. PROBANDO ACTUALIZACIONES...');
    if (basicProductId) {
      await testUpdateProduct(basicProductId);
      await testAdjustStock(basicProductId);
      await testToggleProductStatus(basicProductId);
    }
    
    // 5. Funciones avanzadas
    console.log('\n🔧 5. PROBANDO FUNCIONES AVANZADAS...');
    if (basicProductId) {
      await testDuplicateProduct(basicProductId);
    }
    
    const productIds = [basicProductId, completeProductId].filter(Boolean);
    if (productIds.length > 0) {
      await testBulkUpdatePrices(productIds);
      await testValidateAvailability(productIds);
    }
    
    // 6. Reportes
    console.log('\n📈 6. PROBANDO REPORTES...');
    await testGetLowStockProducts();
    await testGetReorderList();
    await testGetExpiringProducts();
    await testGetDiscountedProducts();
    
    // 7. Pruebas de validación
    console.log('\n⚠️ 7. PROBANDO VALIDACIONES...');
    await testCreateInvalidProduct();
    await testCreateDuplicateSku();
    
    // 8. Estadísticas finales
    console.log('\n📊 8. ESTADÍSTICAS FINALES...');
    await testGetProductStats();
    
    // 9. Limpieza (opcional)
    console.log('\n🧹 9. LIMPIEZA OPCIONAL...');
    if (basicProductId) {
      // await testDeleteProduct(basicProductId);
    }
    
    console.log('\n✅ ¡Todas las pruebas completadas!');
    
  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error.message);
  }
}

/**
 * PRUEBAS ESPECÍFICAS PARA DESARROLLO
 */

// Prueba rápida para desarrollo
async function quickTest() {
  console.log('🚀 Ejecutando prueba rápida...\n');
  
  await testGetProductStats();
  await testGetProductsWithFilters();
  await testSearchProducts();
}

// Prueba de creación masiva
async function testMassCreation() {
  console.log('🚀 Probando creación masiva...\n');
  
  const products = [
    {
      sku: 'PEPSI-355',
      name: 'Pepsi 355ml',
      category: 'bebidas',
      price: 2.30,
      cost: 1.70,
      stock: 120
    },
    {
      sku: 'SPRITE-355',
      name: 'Sprite 355ml',
      category: 'bebidas',
      price: 2.40,
      cost: 1.75,
      stock: 110
    },
    {
      sku: 'FANTA-355',
      name: 'Fanta 355ml',
      category: 'bebidas',
      price: 2.35,
      cost: 1.72,
      stock: 115
    }
  ];
  
  for (const product of products) {
    await makeRequest('POST', '/products', product);
  }
}

/**
 * INSTRUCCIONES DE USO
 */
console.log(`
=== SCRIPT DE PRUEBAS - APIs DE PRODUCTOS ===

1. Configurar el token de autenticación:
   authToken = 'tu-jwt-token-aqui';

2. Ejecutar todas las pruebas:
   runAllTests();

3. Ejecutar prueba rápida:
   quickTest();

4. Ejecutar creación masiva:
   testMassCreation();

5. Ejecutar prueba específica:
   testCreateBasicProduct();

NOTA: Asegúrate de tener una conexión válida al servidor
y permisos apropiados antes de ejecutar las pruebas.
`);

// Exportar funciones para uso individual
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    quickTest,
    testMassCreation,
    testCreateBasicProduct,
    testCreateCompleteProduct,
    testGetProductStats,
    testSearchProducts,
    testUpdateProduct,
    testAdjustStock,
    testBulkUpdatePrices,
    testValidateAvailability
  };
}