# Sistema de Gestión de Ventas - MercaloPOS

## Descripción

Sistema completo de gestión de ventas integrado al POS multitenant, que incluye manejo de inventario automático, sistema de puntos, múltiples métodos de pago, cancelaciones y reportes avanzados.

## Características Principales

### ✅ Funcionalidades Implementadas

#### **Gestión de Ventas:**
- ✅ Creación de ventas con múltiples productos
- ✅ Múltiples métodos de pago por venta
- ✅ Sistema de descuentos por producto y venta
- ✅ Cálculo automático de impuestos y totales
- ✅ Generación automática de números de factura
- ✅ Gestión de tipos de entrega (tienda, domicilio, pickup)

#### **Integración con Inventario:**
- ✅ Actualización automática de stock
- ✅ Validación de disponibilidad de productos
- ✅ Registro de movimientos de inventario
- ✅ Reversión automática en cancelaciones

#### **Sistema de Puntos:**
- ✅ Acumulación automática de puntos (1 punto = 1 peso)
- ✅ Redención de puntos como método de pago
- ✅ Validación de puntos disponibles
- ✅ Historial completo de transacciones

#### **Reportes y Estadísticas:**
- ✅ Resumen de ventas por período
- ✅ Productos más vendidos
- ✅ Ventas por día/mes/año
- ✅ Estadísticas de clientes
- ✅ Análisis de métodos de pago

#### **Seguridad y Validación:**
- ✅ Validaciones completas con Joi
- ✅ Rate limiting por endpoint
- ✅ Autenticación JWT obligatoria
- ✅ Roles y permisos diferenciados
- ✅ Aislamiento por tenant (company_id)

## APIs Disponibles

### 1. **Crear Venta**
```http
POST /api/sales
Content-Type: application/json
Authorization: Bearer {token}

{
  "client_id": "uuid-del-cliente",
  "items": [
    {
      "product_id": "uuid-del-producto",
      "quantity": 2,
      "unit_price": 15000,
      "discount_amount": 1000,
      "subtotal": 29000
    }
  ],
  "payment_methods": [
    {
      "method_id": "uuid-metodo-pago",
      "amount": 50000,
      "reference": "REF123"
    }
  ],
  "subtotal": 29000,
  "tax_amount": 5510,
  "discount_amount": 1000,
  "points_redeemed": 2000,
  "total": 31510,
  "delivery_type": "store",
  "delivery_address": "Calle 123 #45-67",
  "delivery_fee": 0,
  "notes": "Venta de prueba"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Venta creada exitosamente",
  "data": {
    "id": "uuid-venta",
    "invoice_number": "FAC-000001",
    "client_id": "uuid-cliente",
    "user_id": "uuid-usuario",
    "subtotal": 29000,
    "tax_amount": 5510,
    "discount_amount": 1000,
    "points_redeemed": 2000,
    "total": 31510,
    "status": "completed",
    "delivery_type": "store",
    "created_at": "2024-01-15T10:30:00.000Z",
    "items": [...],
    "payments": [...],
    "points_transactions": [...]
  },
  "meta": {
    "invoice_number": "FAC-000001",
    "total": 31510,
    "items_count": 1
  }
}
```

### 2. **Listar Ventas con Filtros**
```http
GET /api/sales?page=1&limit=10&status=completed&date_from=2024-01-01&date_to=2024-01-31&client_id=uuid&search=FAC-000001
Authorization: Bearer {token}
```

**Parámetros de consulta disponibles:**
- `page` - Número de página (default: 1)
- `limit` - Elementos por página (default: 50, max: 100)
- `client_id` - Filtrar por cliente específico
- `user_id` - Filtrar por usuario que registró la venta
- `status` - Estado de la venta (pending, completed, cancelled, refunded)
- `date_from` - Fecha desde (YYYY-MM-DD)
- `date_to` - Fecha hasta (YYYY-MM-DD)
- `delivery_type` - Tipo de entrega (store, delivery, pickup)
- `min_total` - Monto mínimo
- `max_total` - Monto máximo
- `invoice_number` - Buscar por número de factura
- `search` - Búsqueda general (factura, cliente, notas)

### 3. **Obtener Venta por ID**
```http
GET /api/sales/{sale_id}
Authorization: Bearer {token}
```

### 4. **Actualizar Venta**
```http
PUT /api/sales/{sale_id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "delivery_address": "Nueva dirección",
  "delivery_fee": 5000,
  "notes": "Notas actualizadas"
}
```

### 5. **Cancelar Venta**
```http
POST /api/sales/{sale_id}/cancel
Content-Type: application/json
Authorization: Bearer {token}

{
  "reason": "Cliente solicitó cancelación por cambio de opinión"
}
```

### 6. **Obtener Resumen de Ventas**
```http
GET /api/sales/summary?date_from=2024-01-01&date_to=2024-01-31
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Resumen de ventas obtenido exitosamente",
  "data": {
    "total_sales": 150,
    "total_revenue": 2500000,
    "average_sale": 16666.67,
    "completed_sales": 140,
    "cancelled_sales": 10,
    "total_points_redeemed": 50000
  },
  "top_products": [
    {
      "name": "Producto A",
      "code": "PROD001",
      "total_quantity": 100,
      "total_revenue": 500000
    }
  ],
  "period": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  }
}
```

### 7. **Obtener Ventas por Día**
```http
GET /api/sales/by-day?date_from=2024-01-01&date_to=2024-01-31
Authorization: Bearer {token}
```

### 8. **Obtener Productos Más Vendidos**
```http
GET /api/sales/top-products?limit=10&date_from=2024-01-01&date_to=2024-01-31
Authorization: Bearer {token}
```

### 9. **Obtener Estadísticas Generales**
```http
GET /api/sales/stats
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Estadísticas de ventas obtenidas exitosamente",
  "data": {
    "today": {
      "total_sales": 15,
      "total_revenue": 350000,
      "average_sale": 23333.33
    },
    "last_30_days": {
      "total_sales": 450,
      "total_revenue": 7500000,
      "average_sale": 16666.67
    },
    "top_products": [...]
  }
}
```

### 10. **Obtener Ventas por Cliente**
```http
GET /api/sales/by-client/{client_id}?limit=20&offset=0
Authorization: Bearer {token}
```

### 11. **Obtener Recibo para Impresión**
```http
GET /api/sales/{sale_id}/receipt
Authorization: Bearer {token}
```

### 12. **Duplicar Venta**
```http
POST /api/sales/{sale_id}/duplicate
Authorization: Bearer {token}
```

## Validaciones Implementadas

### Estados de Venta Válidos
- `pending` - Venta pendiente
- `completed` - Venta completada
- `cancelled` - Venta cancelada
- `refunded` - Venta reembolsada

### Tipos de Entrega Válidos
- `store` - Recogida en tienda
- `delivery` - Entrega a domicilio
- `pickup` - Punto de recogida

### Reglas de Validación

#### **Items de Venta:**
- Mínimo 1 item, máximo 100 items por venta
- Cantidad debe ser número positivo (máx. 10,000)
- Precio unitario debe ser positivo (máx. $999,999.99)
- Descuento no puede ser negativo
- Subtotal debe coincidir con cálculo: (precio × cantidad) - descuento

#### **Métodos de Pago:**
- Mínimo 1 método, máximo 10 métodos por venta
- Suma de pagos debe coincidir con total de venta
- Métodos de pago deben estar activos
- Referencia opcional (máx. 100 caracteres)

#### **Totales:**
- Subtotal = suma de subtotales de items
- Total = subtotal + impuestos + tarifa_entrega - descuentos - puntos_redimidos
- Todos los montos deben ser positivos
- Máximo 2 decimales en todos los montos

#### **Clientes y Puntos:**
- Cliente debe existir y estar activo (si se especifica)
- Puntos redimidos no pueden exceder balance disponible
- Puntos se otorgan automáticamente (1 punto = 1 peso gastado)

## Flujo de Procesamiento de Venta

### 1. **Validación Inicial**
- Validar estructura de datos con Joi
- Verificar autenticación y permisos
- Aplicar rate limiting

### 2. **Validaciones de Negocio**
- Verificar usuario pertenece a la empresa
- Validar cliente existe (si se especifica)
- Verificar puntos disponibles para redención
- Validar productos existen y están activos
- Verificar stock disponible
- Validar métodos de pago están activos
- Verificar cálculos matemáticos

### 3. **Procesamiento Transaccional**
- Generar número de factura único
- Crear registro de venta
- Insertar items de venta
- Registrar métodos de pago
- Actualizar stock de productos
- Registrar movimientos de inventario
- Procesar transacciones de puntos
- Actualizar estadísticas del cliente

### 4. **Respuesta**
- Retornar venta creada con información completa
- Incluir metadatos útiles
- Logs de auditoría completos

## Rate Limiting

### Límites por Endpoint
- **Crear venta**: 10 requests/minuto
- **Reportes**: 20 requests/minuto  
- **Operaciones generales**: 100 requests/minuto

### Códigos de Respuesta
- **429 Too Many Requests**: Rate limit excedido
- **401 Unauthorized**: Token inválido
- **403 Forbidden**: Permisos insuficientes
- **400 Bad Request**: Errores de validación
- **404 Not Found**: Recurso no encontrado
- **409 Conflict**: Conflictos de negocio (stock, puntos)
- **500 Internal Server Error**: Error del servidor

## Integración con Otros Módulos

### Sistema de Productos
- Validación de existencia y disponibilidad
- Actualización automática de stock
- Verificación de precios mínimos
- Registro de movimientos de inventario

### Sistema de Clientes
- Validación de existencia del cliente
- Actualización de estadísticas de compra
- Gestión de puntos de fidelización
- Historial de compras

### Sistema de Puntos
- Acumulación automática: 1 punto = 1 peso
- Redención como método de pago
- Validación de balance disponible
- Historial de transacciones

### Sistema de Métodos de Pago
- Validación de métodos activos
- Soporte para múltiples métodos por venta
- Referencias opcionales para trazabilidad

## Características Técnicas

### Seguridad
- ✅ Autenticación JWT obligatoria
- ✅ Rate limiting diferenciado
- ✅ Validación exhaustiva de entrada
- ✅ Sanitización de datos
- ✅ Aislamiento por tenant
- ✅ Roles y permisos granulares

### Performance
- ✅ Paginación en consultas masivas
- ✅ Índices optimizados en base de datos
- ✅ Transacciones atómicas
- ✅ Consultas paralelas para reportes
- ✅ Cache de datos frecuentes

### Funcionalidades Avanzadas
- ✅ Cancelación con reversión automática
- ✅ Duplicación de ventas
- ✅ Generación de recibos
- ✅ Reportes estadísticos
- ✅ Búsqueda flexible
- ✅ Filtros avanzados

## Manejo de Errores

### Errores de Negocio
```json
{
  "success": false,
  "message": "Stock insuficiente. Disponible: 5, Requerido: 10",
  "error_code": "INSUFFICIENT_RESOURCES"
}
```

### Errores de Validación
```json
{
  "success": false,
  "message": "Error de validación",
  "errors": [
    {
      "field": "items.0.quantity",
      "message": "La cantidad debe ser un número positivo"
    }
  ],
  "error_code": "VALIDATION_ERROR"
}
```

### Errores de Sistema
```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error_code": "INTERNAL_ERROR"
}
```

## Logging y Auditoría

Todas las operaciones se registran con:
- **Información de contexto**: usuario, empresa, timestamps
- **Datos de la operación**: montos, productos, métodos de pago
- **Resultados**: éxito/fallo, IDs generados
- **Errores**: stack traces, causas de fallo
- **Performance**: tiempos de respuesta, consultas DB

## Próximas Mejoras

- [ ] Facturación electrónica (DIAN)
- [ ] Integración con pasarelas de pago
- [ ] Ventas a crédito
- [ ] Cotizaciones y órdenes
- [ ] Descuentos por volumen
- [ ] Promociones automáticas
- [ ] Webhooks para eventos
- [ ] API de sincronización offline
- [ ] Reportes avanzados con gráficos
- [ ] Exportación a Excel/PDF

## Pruebas

Para probar el sistema completo de ventas:

```bash
node test-sales-api.js
```

El script de pruebas incluye:
- ✅ Autenticación
- ✅ Creación de venta completa
- ✅ Validaciones de stock
- ✅ Procesamiento de puntos
- ✅ Múltiples métodos de pago
- ✅ Cancelación de ventas
- ✅ Reportes y estadísticas
- ✅ Filtros y búsquedas
- ✅ Manejo de errores