# API de Gestión de Productos - MercaloPOS

## Descripción General

Este documento describe las APIs para la gestión completa de productos en el sistema MercaloPOS, incluyendo operaciones CRUD, gestión de inventario, búsquedas avanzadas, reportes y funcionalidades especiales.

## Autenticación

Todas las APIs requieren autenticación mediante JWT token en el header:
```
Authorization: Bearer <token>
```

## Roles y Permisos

- **ADMIN**: Acceso completo a todas las APIs
- **MANAGER**: Acceso a todas las APIs excepto eliminación permanente
- **EMPLEADO**: Solo consultas y validaciones

## APIs Disponibles

### 1. CONSULTAS BÁSICAS

#### 1.1 Obtener Todos los Productos
```http
GET /api/products
```

**Query Parameters:**
- `page` (número): Página actual (default: 1)
- `limit` (número): Elementos por página (default: 10, max: 100)
- `search` (string): Término de búsqueda en nombre, SKU, descripción, código de barras
- `category` (string): Filtrar por categoría
- `brand` (string): Filtrar por marca
- `min_price` (número): Precio mínimo
- `max_price` (número): Precio máximo
- `in_stock` (boolean): Solo productos con stock
- `low_stock` (boolean): Solo productos con stock bajo
- `is_active` (boolean): Solo productos activos
- `is_featured` (boolean): Solo productos destacados
- `is_service` (boolean): Solo servicios
- `is_digital` (boolean): Solo productos digitales
- `requires_prescription` (boolean): Solo productos que requieren receta
- `expiring_soon` (boolean): Solo productos próximos a vencer
- `has_discount` (boolean): Solo productos con descuento
- `sort_by` (string): Campo para ordenar (name, price, cost, stock, created_at, updated_at, category, brand, sku)
- `sort_order` (string): Orden (ASC, DESC)

**Respuesta Exitosa:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sku": "PROD-001",
      "name": "Producto Ejemplo",
      "description": "Descripción del producto",
      "category": "alimentos",
      "brand": "Marca",
      "barcode": "1234567890123",
      "price": 10.50,
      "cost": 7.00,
      "stock": 100,
      "min_stock": 10,
      "max_stock": 500,
      "unit_of_measure": "unidad",
      "weight": 0.5,
      "dimensions": {
        "length": 10.0,
        "width": 5.0,
        "height": 3.0
      },
      "tax_rate": 16.0,
      "discount_price": 9.50,
      "expiry_date": "2024-12-31",
      "supplier_id": "uuid",
      "image_url": "https://...",
      "tags": ["tag1", "tag2"],
      "is_service": false,
      "is_featured": true,
      "is_digital": false,
      "requires_prescription": false,
      "age_restriction": 18,
      "is_active": true,
      "stock_status": "IN_STOCK",
      "expiring_soon": false,
      "has_discount": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### 1.2 Buscar Productos
```http
GET /api/products/search?search=término&limit=20
```

#### 1.3 Obtener Producto por ID
```http
GET /api/products/:id
```

#### 1.4 Obtener Producto por SKU
```http
GET /api/products/sku/:sku
```

#### 1.5 Obtener Producto por Código de Barras
```http
GET /api/products/barcode/:barcode
```

### 2. REPORTES Y ESTADÍSTICAS (ADMIN/MANAGER)

#### 2.1 Estadísticas Generales
```http
GET /api/products/reports/stats
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total_products": 500,
    "active_products": 450,
    "out_of_stock": 20,
    "low_stock": 35,
    "featured_products": 50,
    "service_products": 25,
    "digital_products": 10,
    "expiring_soon": 8,
    "with_discount": 75,
    "total_inventory_value": 125000.50,
    "average_price": 25.75,
    "total_stock_units": 15000,
    "unique_categories": 15,
    "unique_brands": 35
  }
}
```

#### 2.2 Productos con Stock Bajo
```http
GET /api/products/reports/low-stock
```

#### 2.3 Lista de Reabastecimiento
```http
GET /api/products/reports/reorder
```

#### 2.4 Productos Próximos a Vencer
```http
GET /api/products/reports/expiring?days=30
```

#### 2.5 Productos con Descuento
```http
GET /api/products/reports/discounted
```

#### 2.6 Productos por Proveedor
```http
GET /api/products/supplier/:supplierId
```

### 3. GESTIÓN DE PRODUCTOS (ADMIN/MANAGER)

#### 3.1 Crear Producto
```http
POST /api/products
```

**Cuerpo de la Solicitud:**
```json
{
  "sku": "PROD-002",
  "name": "Nuevo Producto",
  "description": "Descripción del nuevo producto",
  "category": "bebidas",
  "brand": "Marca Premium",
  "barcode": "9876543210987",
  "price": 15.99,
  "cost": 10.50,
  "stock": 50,
  "min_stock": 5,
  "max_stock": 200,
  "unit_of_measure": "litro",
  "weight": 1.5,
  "dimensions": {
    "length": 15.0,
    "width": 8.0,
    "height": 25.0
  },
  "tax_rate": 16.0,
  "discount_price": 14.99,
  "expiry_date": "2025-06-30",
  "supplier_id": "uuid-del-proveedor",
  "image_url": "https://example.com/image.jpg",
  "tags": ["nuevo", "promoción"],
  "is_service": false,
  "is_featured": true,
  "is_digital": false,
  "requires_prescription": false,
  "age_restriction": 21
}
```

**Campos Obligatorios:**
- `sku`: Código único del producto
- `name`: Nombre del producto
- `price`: Precio de venta
- `stock`: Stock inicial

**Validaciones:**
- SKU único en la empresa
- Código de barras único (si se proporciona)
- Precio mayor que costo (si se proporciona costo)
- Categorías válidas según lista predefinida
- Unidades de medida válidas

#### 3.2 Actualizar Producto
```http
PUT /api/products/:id
```

Mismos campos que crear producto, todos opcionales excepto validaciones de negocio.

#### 3.3 Eliminar Producto (Soft Delete)
```http
DELETE /api/products/:id
```

#### 3.4 Activar/Desactivar Producto
```http
PATCH /api/products/:id/status
```

**Cuerpo:**
```json
{
  "is_active": true
}
```

#### 3.5 Duplicar Producto
```http
POST /api/products/:id/duplicate
```

**Cuerpo (opcional):**
```json
{
  "sku": "NUEVO-SKU",
  "name": "Nombre Modificado",
  "stock": 0,
  "barcode": null
}
```

### 4. GESTIÓN DE INVENTARIO (ADMIN/MANAGER)

#### 4.1 Ajustar Stock
```http
POST /api/products/:id/stock/adjust
```

**Cuerpo:**
```json
{
  "adjustment": 10,
  "reason": "Compra de mercancía"
}
```

**adjustment**: Número positivo o negativo para ajustar el stock
**reason**: Razón del ajuste (obligatorio)

#### 4.2 Actualización Masiva de Precios
```http
PATCH /api/products/bulk/prices
```

**Cuerpo:**
```json
{
  "products": [
    {
      "id": "uuid-producto-1",
      "price": 25.99,
      "cost": 18.50
    },
    {
      "id": "uuid-producto-2",
      "price": 45.00,
      "cost": 32.00
    }
  ]
}
```

**Límites:**
- Máximo 100 productos por actualización
- Rate limiting aplicado

### 5. VALIDACIONES

#### 5.1 Validar Disponibilidad para Venta
```http
POST /api/products/validate/availability
```

**Cuerpo:**
```json
{
  "products": [
    {
      "product_id": "uuid",
      "quantity": 5
    },
    {
      "product_id": "uuid-2",
      "quantity": 2
    }
  ]
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "product_id": "uuid",
      "valid": true,
      "product": {
        "id": "uuid",
        "name": "Producto",
        "price": 10.50,
        "stock": 100
      }
    },
    {
      "product_id": "uuid-2",
      "valid": false,
      "error": "Stock insuficiente",
      "available_stock": 1,
      "requested_quantity": 2
    }
  ]
}
```

## Categorías de Productos Válidas

```javascript
[
  'alimentos', 'bebidas', 'snacks', 'lacteos', 'carnes', 'frutas', 'verduras',
  'panaderia', 'limpieza', 'cuidado_personal', 'farmacia', 'electrodomesticos',
  'tecnologia', 'ropa', 'calzado', 'deportes', 'juguetes', 'libros', 'musica',
  'hogar', 'jardin', 'automotriz', 'mascotas', 'oficina', 'otros'
]
```

## Unidades de Medida Válidas

```javascript
[
  'unidad', 'kilogramo', 'gramo', 'libra', 'onza', 'litro', 'mililitro',
  'galon', 'metro', 'centimetro', 'pulgada', 'pie', 'metro_cuadrado',
  'metro_cubico', 'caja', 'paquete', 'docena', 'par', 'pieza', 'rollo',
  'botella', 'lata', 'frasco', 'bolsa', 'saco'
]
```

## Estados de Stock

- `IN_STOCK`: Stock disponible normal
- `LOW_STOCK`: Stock por debajo del mínimo
- `OUT_OF_STOCK`: Sin stock disponible

## Rate Limiting

- **Consultas generales**: 100 requests/minuto
- **Búsquedas**: 50 requests/minuto
- **Creación/Actualización**: 60 requests/minuto
- **Operaciones administrativas**: 20 requests/5 minutos
- **Actualizaciones masivas**: 20 requests/5 minutos

## Códigos de Error

- `400`: Datos inválidos o faltantes
- `401`: No autenticado
- `403`: Sin permisos suficientes
- `404`: Producto no encontrado
- `409`: Conflicto (SKU o código de barras duplicado)
- `422`: Error de validación de negocio
- `429`: Rate limit excedido
- `500`: Error interno del servidor

## Ejemplos de Uso

### Crear un producto básico
```bash
curl -X POST "https://api.mercalopos.com/api/products" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "COCA-355",
    "name": "Coca Cola 355ml",
    "category": "bebidas",
    "price": 2.50,
    "cost": 1.80,
    "stock": 100,
    "min_stock": 20,
    "unit_of_measure": "unidad",
    "barcode": "7501234567890"
  }'
```

### Buscar productos por término
```bash
curl "https://api.mercalopos.com/api/products/search?search=coca&limit=10" \
  -H "Authorization: Bearer <token>"
```

### Ajustar stock de un producto
```bash
curl -X POST "https://api.mercalopos.com/api/products/uuid-producto/stock/adjust" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "adjustment": -5,
    "reason": "Venta al cliente"
  }'
```

## Notas Importantes

1. **Multitenant**: Todos los productos están aislados por empresa
2. **Soft Delete**: Los productos eliminados se marcan como inactivos
3. **Códigos Únicos**: SKU y códigos de barras deben ser únicos por empresa
4. **Inventario**: Se registran movimientos de inventario automáticamente
5. **Validaciones**: Precios deben ser mayores que costos
6. **Cache**: Algunas consultas frecuentes pueden estar en caché
7. **Logs**: Todas las operaciones se registran para auditoría

Este sistema de gestión de productos proporciona una base sólida para el manejo completo del inventario en un sistema POS multitenant.