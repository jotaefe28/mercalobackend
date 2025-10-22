-- Índices Adicionales para Optimización
-- Sistema POS Multitenant
-- Creado: 2025-10-21

USE mercalo_pos;

-- ===================================
-- ÍNDICES COMPUESTOS PARA CONSULTAS FRECUENTES
-- ===================================

-- Índices para consultas de ventas por empresa y fecha
CREATE INDEX idx_sales_company_date ON sales(company_id, created_at);
CREATE INDEX idx_sales_company_status_date ON sales(company_id, status, created_at);
CREATE INDEX idx_sales_company_client_date ON sales(company_id, client_id, created_at);

-- Índices para consultas de productos por empresa
CREATE INDEX idx_products_company_active ON products(company_id, is_active);
CREATE INDEX idx_products_company_category ON products(company_id, category);
CREATE INDEX idx_products_company_stock ON products(company_id, current_stock);

-- Índices para consultas de clientes
CREATE INDEX idx_clients_company_active ON clients(company_id, is_active);
CREATE INDEX idx_clients_company_name ON clients(company_id, name);

-- Índices para puntos
CREATE INDEX idx_points_client_company ON points(client_id, company_id);
CREATE INDEX idx_points_company_type_date ON points(company_id, type, created_at);
CREATE INDEX idx_points_client_type_active ON points(client_id, type, is_expired);

-- Índices para movimientos de inventario
CREATE INDEX idx_inventory_product_date ON inventory_movements(product_id, created_at);
CREATE INDEX idx_inventory_company_date ON inventory_movements(company_id, created_at);

-- Índices para items de venta
CREATE INDEX idx_sale_items_product_date ON sale_items(product_id, created_at);

-- Índices para usuarios
CREATE INDEX idx_users_company_role ON users(company_id, role);
CREATE INDEX idx_users_company_active ON users(company_id, is_active);

-- ===================================
-- ÍNDICES PARA BÚSQUEDAS DE TEXTO
-- ===================================

-- Índices de texto completo para búsquedas
ALTER TABLE products ADD FULLTEXT(name, description);
ALTER TABLE clients ADD FULLTEXT(name, email);

-- ===================================
-- ÍNDICES PARA CLAVES FORÁNEAS
-- ===================================

-- Asegurar índices en todas las claves foráneas para mejor rendimiento
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_payments_sale_id ON sale_payments(sale_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- ===================================
-- ÍNDICES PARA REPORTES Y ANALYTICS
-- ===================================

-- Índices para reportes de ventas
CREATE INDEX idx_sales_date_amount ON sales(created_at, total);
CREATE INDEX idx_sales_user_date ON sales(user_id, created_at);

-- Índices para análisis de productos
CREATE INDEX idx_products_price_category ON products(price, category);
CREATE INDEX idx_products_created_date ON products(created_at);

-- Índices para análisis de clientes
CREATE INDEX idx_clients_created_date ON clients(created_at);

-- ===================================
-- ESTADÍSTICAS DE TABLAS
-- ===================================

-- Actualizar estadísticas para optimizador de consultas
ANALYZE TABLE companies;
ANALYZE TABLE users;
ANALYZE TABLE products;
ANALYZE TABLE clients;
ANALYZE TABLE sales;
ANALYZE TABLE sale_items;
ANALYZE TABLE points;
ANALYZE TABLE inventory_movements;
ANALYZE TABLE payment_methods;
ANALYZE TABLE sale_payments;
ANALYZE TABLE orders;
ANALYZE TABLE order_items;