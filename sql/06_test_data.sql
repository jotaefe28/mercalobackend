-- Script de Datos de Prueba
-- Sistema POS Multitenant
-- Creado: 2025-10-21

USE mercalo_pos;

-- ===================================
-- DESHABILITAR VERIFICACIONES TEMPORALMENTE
-- ===================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- ===================================
-- EMPRESA DE PRUEBA
-- ===================================

INSERT INTO companies (id, name, tax_id, email, phone, address, city, country, plan, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Tienda Demo', '900123456-1', 'admin@tiendademo.com', '+57 300 123 4567', 'Calle 123 #45-67', 'Bogotá', 'Colombia', 'PREMIUM', TRUE);

-- ===================================
-- USUARIOS DE PRUEBA
-- ===================================

INSERT INTO users (id, company_id, name, email, password, role, is_active) VALUES
-- Contraseña: Admin123!
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'Administrador Demo', 'admin@tiendademo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewDcT8UcVszsE8WK', 'ADMIN', TRUE),
-- Contraseña: Manager123!
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'Gerente Demo', 'gerente@tiendademo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewDcT8UcVszsE8WK', 'MANAGER', TRUE),
-- Contraseña: User123!
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 'Vendedor Demo', 'vendedor@tiendademo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewDcT8UcVszsE8WK', 'USER', TRUE);

-- ===================================
-- MÉTODOS DE PAGO DE LA EMPRESA DEMO
-- ===================================

INSERT INTO payment_methods (id, company_id, name, type, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440001', 'Efectivo', 'cash', TRUE),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440001', 'Tarjeta Débito/Crédito', 'card', TRUE),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440001', 'Nequi/Daviplata', 'qr', TRUE),
('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440001', 'Transferencia Bancaria', 'transfer', TRUE),
('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440001', 'Crédito/Pago Posterior', 'later', TRUE);

-- ===================================
-- PRODUCTOS DE PRUEBA
-- ===================================

INSERT INTO products (id, company_id, name, description, sku, category, price, cost, current_stock, min_stock, is_active, created_by) VALUES
-- Bebidas
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440001', 'Coca Cola 350ml', 'Bebida gaseosa sabor cola', 'BEB001', 'Bebidas', 2500.00, 1800.00, 50, 10, TRUE, '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440001', 'Agua Natural 500ml', 'Agua purificada', 'BEB002', 'Bebidas', 1500.00, 1000.00, 100, 20, TRUE, '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440001', 'Cerveza Nacional', 'Cerveza nacional 330ml', 'BEB003', 'Bebidas', 3000.00, 2200.00, 30, 5, TRUE, '550e8400-e29b-41d4-a716-446655440011'),

-- Snacks
('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440001', 'Papas Fritas Naturales', 'Bolsa de papas fritas 150g', 'SNK001', 'Snacks', 4500.00, 3200.00, 25, 5, TRUE, '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440035', '550e8400-e29b-41d4-a716-446655440001', 'Chocolatina', 'Chocolatina de leche 50g', 'SNK002', 'Snacks', 2000.00, 1400.00, 80, 15, TRUE, '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440001', 'Galletas Integral', 'Paquete de galletas integrales', 'SNK003', 'Snacks', 3500.00, 2500.00, 40, 8, TRUE, '550e8400-e29b-41d4-a716-446655440011'),

-- Comida
('550e8400-e29b-41d4-a716-446655440037', '550e8400-e29b-41d4-a716-446655440001', 'Sándwich Mixto', 'Sándwich de jamón y queso', 'COM001', 'Comida', 8500.00, 5500.00, 15, 3, TRUE, '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440038', '550e8400-e29b-41d4-a716-446655440001', 'Empanada de Pollo', 'Empanada casera de pollo', 'COM002', 'Comida', 3000.00, 1800.00, 20, 5, TRUE, '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440039', '550e8400-e29b-41d4-a716-446655440001', 'Arepa con Queso', 'Arepa de maíz con queso', 'COM003', 'Comida', 4000.00, 2500.00, 12, 3, TRUE, '550e8400-e29b-41d4-a716-446655440011'),

-- Productos con stock bajo para testing
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440001', 'Producto Stock Bajo', 'Producto para pruebas de stock', 'TST001', 'Test', 5000.00, 3000.00, 2, 10, TRUE, '550e8400-e29b-41d4-a716-446655440011');

-- ===================================
-- CLIENTES DE PRUEBA
-- ===================================

INSERT INTO clients (id, company_id, name, email, phone, document, address, city, is_active, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', 'Juan Pérez', 'juan.perez@email.com', '+57 300 111 2222', '12345678', 'Carrera 10 #20-30', 'Bogotá', TRUE, '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440001', 'María García', 'maria.garcia@email.com', '+57 310 333 4444', '87654321', 'Calle 50 #15-25', 'Medellín', TRUE, '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440001', 'Carlos López', 'carlos.lopez@email.com', '+57 320 555 6666', '11223344', 'Avenida 80 #45-60', 'Cali', TRUE, '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440001', 'Ana Martínez', 'ana.martinez@email.com', '+57 315 777 8888', '44332211', 'Transversal 5 #12-18', 'Barranquilla', TRUE, '550e8400-e29b-41d4-a716-446655440011');

-- ===================================
-- VENTAS DE PRUEBA
-- ===================================

-- Venta 1: Juan Pérez
INSERT INTO sales (id, company_id, user_id, client_id, invoice_number, subtotal, tax_amount, discount_amount, points_redeemed, total, status, delivery_type, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440051', 'INV-000001', 10000.00, 1900.00, 0.00, 0, 11900.00, 'completed', 'store', DATE_SUB(NOW(), INTERVAL 2 DAY));

INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total_price) VALUES
('550e8400-e29b-41d4-a716-446655440071', '550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440031', 2, 2500.00, 5000.00), -- 2 Coca Colas
('550e8400-e29b-41d4-a716-446655440072', '550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440034', 1, 4500.00, 4500.00), -- 1 Papas
('550e8400-e29b-41d4-a716-446655440073', '550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440032', 1, 1500.00, 1500.00); -- 1 Agua

INSERT INTO sale_payments (id, sale_id, payment_method_id, amount) VALUES
('550e8400-e29b-41d4-a716-446655440081', '550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440021', 11900.00); -- Efectivo

-- Venta 2: María García
INSERT INTO sales (id, company_id, user_id, client_id, invoice_number, subtotal, tax_amount, discount_amount, points_redeemed, total, status, delivery_type, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440052', 'INV-000002', 15000.00, 2850.00, 0.00, 0, 17850.00, 'completed', 'delivery', DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total_price) VALUES
('550e8400-e29b-41d4-a716-446655440074', '550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440037', 1, 8500.00, 8500.00), -- 1 Sándwich
('550e8400-e29b-41d4-a716-446655440075', '550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440038', 2, 3000.00, 6000.00), -- 2 Empanadas
('550e8400-e29b-41d4-a716-446655440076', '550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440032', 1, 1500.00, 1500.00); -- 1 Agua

INSERT INTO sale_payments (id, sale_id, payment_method_id, amount) VALUES
('550e8400-e29b-41d4-a716-446655440082', '550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440022', 17850.00); -- Tarjeta

-- Venta 3: Carlos López (con redención de puntos)
INSERT INTO sales (id, company_id, user_id, client_id, invoice_number, subtotal, tax_amount, discount_amount, points_redeemed, total, status, delivery_type, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440063', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440053', 'INV-000003', 12000.00, 2280.00, 0.00, 5, 14275.00, 'completed', 'store', NOW());

INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total_price) VALUES
('550e8400-e29b-41d4-a716-446655440077', '550e8400-e29b-41d4-a716-446655440063', '550e8400-e29b-41d4-a716-446655440039', 3, 4000.00, 12000.00); -- 3 Arepas

INSERT INTO sale_payments (id, sale_id, payment_method_id, amount) VALUES
('550e8400-e29b-41d4-a716-446655440083', '550e8400-e29b-41d4-a716-446655440063', '550e8400-e29b-41d4-a716-446655440023', 14275.00); -- QR

-- ===================================
-- PUNTOS DE PRUEBA
-- ===================================

-- Puntos ganados por las compras
INSERT INTO points (id, client_id, company_id, points, type, reason, reference, expires_at) VALUES
-- Juan Pérez - puntos por venta 1
('550e8400-e29b-41d4-a716-446655440091', '550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', 11, 'earned', 'Compra', 'INV-000001', DATE_ADD(NOW(), INTERVAL 1 YEAR)),
-- María García - puntos por venta 2
('550e8400-e29b-41d4-a716-446655440092', '550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440001', 17, 'earned', 'Compra', 'INV-000002', DATE_ADD(NOW(), INTERVAL 1 YEAR)),
-- Carlos López - puntos por venta anterior (simulada)
('550e8400-e29b-41d4-a716-446655440093', '550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440001', 20, 'earned', 'Compra anterior', 'INV-000000', DATE_ADD(NOW(), INTERVAL 1 YEAR)),
-- Carlos López - redención en venta 3
('550e8400-e29b-41d4-a716-446655440094', '550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440001', -5, 'redeemed', 'Redención en venta', 'INV-000003'),
-- Carlos López - puntos ganados por venta 3
('550e8400-e29b-41d4-a716-446655440095', '550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440001', 14, 'earned', 'Compra', 'INV-000003', DATE_ADD(NOW(), INTERVAL 1 YEAR)),
-- Ana Martínez - puntos de bonificación
('550e8400-e29b-41d4-a716-446655440096', '550e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440001', 50, 'earned', 'Bonificación de bienvenida', 'BONUS-001', DATE_ADD(NOW(), INTERVAL 1 YEAR));

-- ===================================
-- MOVIMIENTOS DE INVENTARIO
-- ===================================

-- Actualizar stock basado en las ventas
UPDATE products SET current_stock = current_stock - 2 WHERE id = '550e8400-e29b-41d4-a716-446655440031'; -- Coca Cola
UPDATE products SET current_stock = current_stock - 2 WHERE id = '550e8400-e29b-41d4-a716-446655440032'; -- Agua
UPDATE products SET current_stock = current_stock - 1 WHERE id = '550e8400-e29b-41d4-a716-446655440034'; -- Papas
UPDATE products SET current_stock = current_stock - 1 WHERE id = '550e8400-e29b-41d4-a716-446655440037'; -- Sándwich
UPDATE products SET current_stock = current_stock - 2 WHERE id = '550e8400-e29b-41d4-a716-446655440038'; -- Empanadas
UPDATE products SET current_stock = current_stock - 3 WHERE id = '550e8400-e29b-41d4-a716-446655440039'; -- Arepas

-- Registrar movimientos de inventario para las ventas
INSERT INTO inventory_movements (id, product_id, company_id, type, quantity, previous_stock, new_stock, reason, reference) VALUES
-- Venta 1
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440001', 'OUT', 2, 50, 48, 'Venta', 'INV-000001'),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440001', 'OUT', 1, 25, 24, 'Venta', 'INV-000001'),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440001', 'OUT', 1, 100, 99, 'Venta', 'INV-000001'),
-- Venta 2
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440037', '550e8400-e29b-41d4-a716-446655440001', 'OUT', 1, 15, 14, 'Venta', 'INV-000002'),
('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440038', '550e8400-e29b-41d4-a716-446655440001', 'OUT', 2, 20, 18, 'Venta', 'INV-000002'),
('550e8400-e29b-41d4-a716-446655440106', '550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440001', 'OUT', 1, 99, 98, 'Venta', 'INV-000002'),
-- Venta 3
('550e8400-e29b-41d4-a716-446655440107', '550e8400-e29b-41d4-a716-446655440039', '550e8400-e29b-41d4-a716-446655440001', 'OUT', 3, 12, 9, 'Venta', 'INV-000003');

-- ===================================
-- PEDIDOS DE PRUEBA
-- ===================================

INSERT INTO orders (id, company_id, client_id, user_id, order_number, subtotal, tax_amount, total, status, delivery_address, delivery_phone, notes) VALUES
('550e8400-e29b-41d4-a716-446655440111', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440012', 'ORD-000001', 8000.00, 1520.00, 9520.00, 'PENDING', 'Calle 50 #15-25, Medellín', '+57 310 333 4444', 'Entregar en la tarde');

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price) VALUES
('550e8400-e29b-41d4-a716-446655440121', '550e8400-e29b-41d4-a716-446655440111', '550e8400-e29b-41d4-a716-446655440037', 1, 8500.00, 8500.00); -- 1 Sándwich

-- ===================================
-- RESTAURAR VERIFICACIONES
-- ===================================

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- ===================================
-- MENSAJE DE CONFIRMACIÓN
-- ===================================

SELECT 'Datos de prueba insertados correctamente' AS mensaje,
       (SELECT COUNT(*) FROM companies WHERE is_active = TRUE) AS empresas,
       (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS usuarios,
       (SELECT COUNT(*) FROM products WHERE is_active = TRUE) AS productos,
       (SELECT COUNT(*) FROM clients WHERE is_active = TRUE) AS clientes,
       (SELECT COUNT(*) FROM sales WHERE status = 'completed') AS ventas,
       (SELECT COALESCE(SUM(points), 0) FROM points) AS puntos_totales;