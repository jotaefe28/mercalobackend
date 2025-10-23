-- Esquema de Base de Datos
-- Sistema POS Multitenant
-- Creado: 2025-10-21

-- ===================================
-- CONFIGURACIÓN INICIAL
-- ===================================

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS mercalo_pos 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE mercalo_pos;

-- Configurar zona horaria
SET time_zone = '+00:00';

-- ===================================
-- TABLA DE EMPRESAS
-- ===================================

CREATE TABLE companies (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Colombia',
    plan ENUM('BASIC', 'PREMIUM', 'ENTERPRISE') DEFAULT 'BASIC',
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    active_until DATE NULL COMMENT 'Fecha hasta la cual la empresa está activa (NULL = sin límite)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_companies_tax_id (tax_id),
    INDEX idx_companies_plan (plan),
    INDEX idx_companies_active (is_active),
    INDEX idx_companies_active_until (active_until),
    INDEX idx_companies_active_status (is_active, active_until)
);

-- ===================================
-- TABLA DE USUARIOS
-- ===================================

CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    company_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL COMMENT 'Número de teléfono del usuario',
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'MANAGER', 'USER') DEFAULT 'USER',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_by CHAR(36),
    updated_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_email_company (email, company_id),
    INDEX idx_users_company (company_id),
    INDEX idx_users_email (email),
    INDEX idx_users_phone (phone),
    INDEX idx_users_role (role),
    INDEX idx_users_active (is_active)
);

-- ===================================
-- TABLA DE PRODUCTOS
-- ===================================

CREATE TABLE products (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    company_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    category VARCHAR(100),
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cost DECIMAL(10,2) DEFAULT 0.00,
    current_stock INT DEFAULT 0,
    min_stock INT DEFAULT 0,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_by CHAR(36),
    updated_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_sku_company (sku, company_id),
    INDEX idx_products_company (company_id),
    INDEX idx_products_name (name),
    INDEX idx_products_category (category),
    INDEX idx_products_active (is_active),
    INDEX idx_products_stock (current_stock),
    INDEX idx_products_price (price)
);

-- ===================================
-- TABLA DE CLIENTES
-- ===================================

CREATE TABLE clients (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    company_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    document VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    birth_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by CHAR(36),
    updated_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_email_company (email, company_id),
    UNIQUE KEY unique_document_company (document, company_id),
    INDEX idx_clients_company (company_id),
    INDEX idx_clients_name (name),
    INDEX idx_clients_email (email),
    INDEX idx_clients_document (document),
    INDEX idx_clients_active (is_active)
);

-- ===================================
-- TABLA DE MÉTODOS DE PAGO
-- ===================================

CREATE TABLE payment_methods (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    company_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('cash', 'card', 'qr', 'transfer', 'later') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by CHAR(36),
    updated_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_name_company (name, company_id),
    INDEX idx_payment_methods_company (company_id),
    INDEX idx_payment_methods_type (type),
    INDEX idx_payment_methods_active (is_active)
);

-- ===================================
-- TABLA DE VENTAS
-- ===================================

CREATE TABLE sales (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    company_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    client_id CHAR(36),
    invoice_number VARCHAR(50) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    points_redeemed INT DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    status ENUM('completed', 'pending', 'void') DEFAULT 'completed',
    delivery_type ENUM('store', 'delivery') DEFAULT 'store',
    delivery_address TEXT,
    notes TEXT,
    void_reason TEXT,
    voided_by CHAR(36),
    voided_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (voided_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_invoice_company (invoice_number, company_id),
    INDEX idx_sales_company (company_id),
    INDEX idx_sales_user (user_id),
    INDEX idx_sales_client (client_id),
    INDEX idx_sales_status (status),
    INDEX idx_sales_date (created_at),
    INDEX idx_sales_total (total)
);

-- ===================================
-- TABLA DE ITEMS DE VENTA
-- ===================================

CREATE TABLE sale_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    sale_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    
    INDEX idx_sale_items_sale (sale_id),
    INDEX idx_sale_items_product (product_id)
);

-- ===================================
-- TABLA DE PAGOS DE VENTA
-- ===================================

CREATE TABLE sale_payments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    sale_id CHAR(36) NOT NULL,
    payment_method_id CHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
    
    INDEX idx_sale_payments_sale (sale_id),
    INDEX idx_sale_payments_method (payment_method_id)
);

-- ===================================
-- TABLA DE PUNTOS
-- ===================================

CREATE TABLE points (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    client_id CHAR(36) NOT NULL,
    company_id CHAR(36) NOT NULL,
    points INT NOT NULL,
    type ENUM('earned', 'redeemed', 'adjustment', 'expired') NOT NULL,
    reason VARCHAR(255),
    reference VARCHAR(255),
    expires_at TIMESTAMP NULL,
    is_expired BOOLEAN DEFAULT FALSE,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_points_client (client_id),
    INDEX idx_points_company (company_id),
    INDEX idx_points_type (type),
    INDEX idx_points_expires (expires_at),
    INDEX idx_points_expired (is_expired),
    INDEX idx_points_date (created_at)
);

-- ===================================
-- TABLA DE MOVIMIENTOS DE INVENTARIO
-- ===================================

CREATE TABLE inventory_movements (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id CHAR(36) NOT NULL,
    company_id CHAR(36) NOT NULL,
    type ENUM('IN', 'OUT', 'ADJUSTMENT') NOT NULL,
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reason VARCHAR(255),
    reference VARCHAR(255),
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_inventory_product (product_id),
    INDEX idx_inventory_company (company_id),
    INDEX idx_inventory_type (type),
    INDEX idx_inventory_date (created_at)
);

-- ===================================
-- TABLA DE PEDIDOS
-- ===================================

CREATE TABLE orders (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    company_id CHAR(36) NOT NULL,
    client_id CHAR(36) NOT NULL,
    user_id CHAR(36),
    order_number VARCHAR(50) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    status ENUM('PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED') DEFAULT 'PENDING',
    delivery_address TEXT NOT NULL,
    delivery_phone VARCHAR(20),
    delivery_date TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_order_number_company (order_number, company_id),
    INDEX idx_orders_company (company_id),
    INDEX idx_orders_client (client_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_date (created_at)
);

-- ===================================
-- TABLA DE ITEMS DE PEDIDO
-- ===================================

CREATE TABLE order_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    
    INDEX idx_order_items_order (order_id),
    INDEX idx_order_items_product (product_id)
);

-- ===================================
-- INSERTAR DATOS INICIALES
-- ===================================

-- Métodos de pago por defecto para empresas
INSERT INTO payment_methods (id, company_id, name, type, is_active) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Efectivo', 'cash', TRUE),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Tarjeta', 'card', TRUE),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'QR/Digital', 'qr', TRUE),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'Transferencia', 'transfer', TRUE),
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'Pago Posterior', 'later', TRUE);