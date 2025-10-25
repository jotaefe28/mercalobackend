# Sistema de Gestión de Clientes - MercaloPOS

## Descripción

Sistema completo de gestión de clientes integrado al POS multitenant, que incluye manejo de información personal, sistema de puntos de fidelización y seguimiento de compras.

## Características Principales

### ✅ Campos de Cliente Implementados

#### **Campos Obligatorios:**
- `document_type` - Tipo de documento (cedula, cedula_extranjeria, nit, pasaporte, ruc, otro)
- `document_number` - Número de documento (3-20 caracteres, alfanumérico + guiones)
- `name` - Nombre del cliente (2-50 caracteres, solo letras y espacios)

#### **Campos Opcionales:**
- `last_name` - Apellido del cliente (2-50 caracteres)
- `phone` - Teléfono (7-20 caracteres, números, espacios, guiones, paréntesis, +)
- `email` - Email (hasta 100 caracteres, formato válido)
- `address` - Dirección (hasta 255 caracteres)
- `city` - Ciudad (hasta 50 caracteres, letras, espacios, guiones, puntos)
- `department` - Departamento/Estado (hasta 50 caracteres)
- `birth_date` - Fecha de nacimiento (formato YYYY-MM-DD, entre 1900 y hoy)

#### **Campos del Sistema:**
- `current_points` - Puntos actuales de fidelización
- `total_purchases` - Total de compras realizadas
- `is_active` - Estado activo del cliente
- `created_at` - Fecha de creación
- `updated_at` - Fecha de última actualización

## APIs Disponibles

### 1. **Crear Cliente**
```http
POST /api/clients
Content-Type: application/json
Authorization: Bearer {token}

{
  "document_type": "cedula",
  "document_number": "12345678",
  "name": "Juan Carlos",
  "last_name": "Pérez García",
  "phone": "+573001234567",
  "email": "juan.perez@email.com",
  "address": "Calle 123 #45-67",
  "city": "Bogotá",
  "department": "Cundinamarca",
  "birth_date": "1985-06-15"
}
```

### 2. **Listar Clientes con Filtros**
```http
GET /api/clients?page=1&limit=10&search=Juan&document_type=cedula&city=Bogotá&is_active=true&sort_by=name&sort_order=ASC
Authorization: Bearer {token}
```

### 3. **Obtener Cliente por ID**
```http
GET /api/clients/{client_id}
Authorization: Bearer {token}
```

### 4. **Obtener Cliente por Documento**
```http
GET /api/clients/{document_type}/{document_number}
Authorization: Bearer {token}
```

### 5. **Actualizar Cliente**
```http
PUT /api/clients/{client_id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "phone": "+573009876543",
  "email": "nuevo.email@example.com",
  "address": "Nueva dirección"
}
```

### 6. **Buscar Clientes**
```http
GET /api/clients/search?search=Juan&quick=false
Authorization: Bearer {token}
```

### 7. **Activar/Desactivar Cliente**
```http
PATCH /api/clients/{client_id}/status
Content-Type: application/json
Authorization: Bearer {token}

{
  "is_active": false
}
```

### 8. **Actualizar Puntos**
```http
PATCH /api/clients/{client_id}/points
Content-Type: application/json
Authorization: Bearer {token}

{
  "points_change": 100
}
```

### 9. **Actualizar Total de Compras**
```http
PATCH /api/clients/{client_id}/purchases
Content-Type: application/json
Authorization: Bearer {token}

{
  "purchase_amount": 150000
}
```

### 10. **Obtener Estadísticas**
```http
GET /api/clients/stats
Authorization: Bearer {token}
```

### 11. **Eliminar Cliente (Soft Delete)**
```http
DELETE /api/clients/{client_id}
Authorization: Bearer {token}
```

### 12. **Buscar por Identificador**
```http
GET /api/clients/find/{identifier}
Authorization: Bearer {token}
```

## Validaciones Implementadas

### Tipos de Documento Válidos
- `cedula` - Cédula de ciudadanía
- `cedula_extranjeria` - Cédula de extranjería
- `nit` - Número de identificación tributaria
- `pasaporte` - Pasaporte
- `ruc` - Registro único de contribuyente
- `otro` - Otro tipo de documento

### Reglas de Validación
- **Documento único**: No pueden existir dos clientes con el mismo tipo y número de documento
- **Email único**: No pueden existir dos clientes con el mismo email (si se proporciona)
- **Teléfono único**: No pueden existir dos clientes con el mismo teléfono (si se proporciona)
- **Formato de fecha**: Las fechas deben estar en formato ISO 8601 (YYYY-MM-DD)
- **Caracteres especiales**: Solo se permiten caracteres específicos en cada campo

## Características Técnicas

### Seguridad
- ✅ Rate limiting por endpoint
- ✅ Validación de entrada con Joi
- ✅ Sanitización de datos
- ✅ Autenticación JWT obligatoria
- ✅ Aislamiento por tenant (company_id)

### Performance
- ✅ Paginación en listados
- ✅ Índices de base de datos optimizados
- ✅ Búsqueda rápida vs búsqueda completa
- ✅ Soft delete para mantener integridad referencial

### Funcionalidades
- ✅ Sistema de puntos integrado
- ✅ Seguimiento de compras totales
- ✅ Búsqueda flexible (nombre, documento, teléfono, email)
- ✅ Filtros avanzados
- ✅ Estadísticas detalladas
- ✅ Gestión de estados (activo/inactivo)

## Estructura de Respuesta

### Cliente Individual
```json
{
  "success": true,
  "message": "Cliente encontrado",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "document_type": "cedula",
    "document_number": "12345678",
    "name": "Juan Carlos",
    "last_name": "Pérez García",
    "phone": "+573001234567",
    "email": "juan.perez@email.com",
    "address": "Calle 123 #45-67",
    "city": "Bogotá",
    "department": "Cundinamarca",
    "birth_date": "1985-06-15",
    "current_points": 100,
    "total_purchases": 150000,
    "is_active": true,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T15:45:00.000Z"
  }
}
```

### Lista Paginada
```json
{
  "success": true,
  "message": "Clientes obtenidos exitosamente",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### Estadísticas
```json
{
  "success": true,
  "message": "Estadísticas obtenidas exitosamente",
  "data": {
    "total_clients": 150,
    "active_clients": 140,
    "inactive_clients": 10,
    "clients_with_points": 85,
    "total_points_outstanding": 12500,
    "total_sales_to_customers": 2500000,
    "average_points_per_client": 147.06,
    "avg_purchase_per_customer": 16666.67,
    "new_clients_last_30_days": 12
  }
}
```

## Códigos de Estado HTTP

- **200 OK**: Operación exitosa
- **201 Created**: Cliente creado exitosamente
- **400 Bad Request**: Errores de validación
- **401 Unauthorized**: Token de autenticación inválido
- **404 Not Found**: Cliente no encontrado
- **409 Conflict**: Cliente ya existe (documento, email o teléfono duplicado)
- **429 Too Many Requests**: Rate limit excedido
- **500 Internal Server Error**: Error interno del servidor

## Pruebas

Para probar el sistema completo de clientes, ejecuta:

```bash
node test-clients-api.js
```

Este script realiza pruebas de:
- ✅ Autenticación
- ✅ Creación de cliente
- ✅ Listado con filtros
- ✅ Búsqueda por ID
- ✅ Búsqueda por documento
- ✅ Actualización de datos
- ✅ Búsqueda de texto
- ✅ Gestión de puntos
- ✅ Seguimiento de compras
- ✅ Estadísticas
- ✅ Cambio de estado

## Integración con Otros Módulos

### Sistema de Ventas
- Al registrar una venta, se actualizan automáticamente los puntos y el total de compras del cliente
- Los puntos se otorgan en proporción 1:1 (1 punto por cada peso gastado)

### Sistema de Puntos
- Los clientes pueden canjear puntos por descuentos
- Se mantiene un historial de transacciones de puntos

### Reportes
- Las estadísticas de clientes se integran con el sistema de reportes
- Se pueden generar reportes de clientes más frecuentes, clientes con más puntos, etc.

## Consideraciones de Implementación

### Base de Datos
- El modelo utiliza UUIDs como identificadores únicos
- Se implementa soft delete para mantener integridad referencial
- Los índices están optimizados para búsquedas frecuentes

### Multitenant
- Todos los datos están aislados por `company_id`
- Las consultas incluyen automáticamente el filtro de tenant

### Logging
- Todas las operaciones se registran con niveles apropiados
- Se incluye información de contexto para debugging

## Próximas Mejoras

- [ ] Integración con sistema de notificaciones (email/SMS)
- [ ] Segmentación de clientes por comportamiento de compra
- [ ] Programa de fidelización por niveles
- [ ] Exportación de datos de clientes
- [ ] Importación masiva de clientes
- [ ] API webhooks para eventos de cliente