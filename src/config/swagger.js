/**
 * Configuración de Swagger para Documentación de API
 * Sistema POS Multitenant
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Configuración básica de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MercaloPOS API',
      version: '1.0.0',
      description: `
        API REST para Sistema POS (Point of Sale) Multitenant con Sistema de Puntos Integrado
        
        Este sistema permite a múltiples empresas gestionar de manera independiente:
        - Ventas y facturación completa
        - Inventario de productos con categorías
        - Gestión de clientes y sistema de puntos (1 punto = $1)
        - Múltiples métodos de pago y entregas
        - Sistema de usuarios con roles granulares
        - Órdenes y pedidos avanzados
        
        **Características principales:**
        - Arquitectura multitenant con aislamiento completo de datos por company_id
        - Autenticación JWT con refresh tokens y cookies httpOnly
        - Sistema de puntos revolucionario: 1 punto = $1 de descuento
        - Stored procedures MySQL para operaciones críticas y transacciones
        - Rate limiting inteligente por endpoint
        - Seguridad avanzada con Helmet.js y CORS configurado
        - Logging estructurado para auditoría completa
        - Validación robusta con express-validator
        
        **Sistema de Puntos:**
        Los clientes ganan puntos con cada compra y pueden canjearlos como dinero real.
        Cada punto equivale exactamente a $1 de descuento en futuras compras.
      `,
      contact: {
        name: 'Soporte MercaloPOS',
        email: 'soporte@mercalopos.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'Servidor de Desarrollo'
      },
      {
        url: 'https://api.mercalopos.com',
        description: 'Servidor de Producción'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenido del endpoint de login'
        },
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'Token JWT almacenado en cookie httpOnly'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Descripción del error'
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        Company: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            name: {
              type: 'string',
              example: 'Mi Empresa S.A.S'
            },
            tax_id: {
              type: 'string',
              example: '900123456-1'
            },
            plan: {
              type: 'string',
              enum: ['BASIC', 'PREMIUM', 'ENTERPRISE'],
              example: 'PREMIUM'
            },
            active_until: {
              type: 'string',
              format: 'date',
              nullable: true,
              example: '2024-12-31'
            },
            is_active: {
              type: 'boolean',
              example: true
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            company_id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              example: 'Juan Pérez'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'juan@empresa.com'
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'USER', 'MANAGER'],
              example: 'USER'
            },
            is_active: {
              type: 'boolean',
              example: true
            },
            last_login: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            company_id: {
              type: 'string',
              format: 'uuid'
            },
            sku: {
              type: 'string',
              example: 'PROD-001'
            },
            name: {
              type: 'string',
              example: 'Producto de Ejemplo'
            },
            description: {
              type: 'string',
              nullable: true
            },
            price: {
              type: 'number',
              format: 'decimal',
              example: 25.50
            },
            cost: {
              type: 'number',
              format: 'decimal',
              example: 15.00
            },
            stock: {
              type: 'integer',
              example: 100
            },
            min_stock: {
              type: 'integer',
              example: 10
            },
            is_active: {
              type: 'boolean',
              example: true
            }
          }
        },
        Client: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            company_id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              example: 'María González'
            },
            document: {
              type: 'string',
              example: '12345678'
            },
            phone: {
              type: 'string',
              example: '+57 300 123 4567'
            },
            email: {
              type: 'string',
              format: 'email',
              nullable: true
            },
            address: {
              type: 'string',
              nullable: true
            },
            current_points: {
              type: 'integer',
              example: 150
            }
          }
        },
        Sale: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            company_id: {
              type: 'string',
              format: 'uuid'
            },
            client_id: {
              type: 'string',
              format: 'uuid',
              nullable: true
            },
            user_id: {
              type: 'string',
              format: 'uuid'
            },
            subtotal: {
              type: 'number',
              format: 'decimal',
              example: 100.00
            },
            taxes: {
              type: 'number',
              format: 'decimal',
              example: 19.00
            },
            points_redeemed: {
              type: 'integer',
              example: 50
            },
            total: {
              type: 'number',
              format: 'decimal',
              example: 69.00
            },
            status: {
              type: 'string',
              enum: ['completed', 'pending', 'void'],
              example: 'completed'
            },
            delivery_type: {
              type: 'string',
              enum: ['store', 'delivery'],
              example: 'store'
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      },
      {
        CookieAuth: []
      }
    ],
    tags: [
      {
        name: 'Autenticación',
        description: 'Endpoints para login, registro y gestión de tokens JWT'
      },
      {
        name: 'Usuarios',
        description: 'Gestión de usuarios del sistema con roles (ADMIN, MANAGER, CASHIER)'
      },
      {
        name: 'Productos',
        description: 'Gestión completa de inventario, productos y categorías'
      },
      {
        name: 'Ventas',
        description: 'Procesamiento de ventas con múltiples productos y métodos de pago'
      },
      {
        name: 'Clientes',
        description: 'Gestión de clientes y base de datos de contactos'
      },
      {
        name: 'Puntos',
        description: 'Sistema de puntos revolucionario - 1 punto = $1 de descuento'
      },
      {
        name: 'Métodos de Pago',
        description: 'Configuración de métodos de pago (efectivo, tarjeta, digital)'
      },
      {
        name: 'Órdenes',
        description: 'Gestión avanzada de órdenes, pedidos y entregas'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

// Generar especificación de Swagger
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Configuración de Swagger UI
const swaggerUiOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #1f2937; }
    .swagger-ui .scheme-container { background: #f9fafb; padding: 20px; border-radius: 8px; }
  `,
  customSiteTitle: 'POS Multitenant API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true
  }
};

/**
 * Configurar documentación de Swagger en Express app
 * @param {Object} app - Instancia de Express
 */
function setupSwagger(app) {
  // Endpoint para la especificación JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  // Middleware para Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  
  console.log(`📚 Documentación Swagger disponible en: ${process.env.API_BASE_URL || 'http://localhost:3001'}/api-docs`);
}

module.exports = {
  swaggerSpec,
  setupSwagger,
  swaggerUiOptions
};