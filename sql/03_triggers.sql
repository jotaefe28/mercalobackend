-- Triggers
-- Sistema POS Multitenant
-- Creado: 2025-10-21

USE mercalo_pos;

-- ===================================
-- DELIMITER CHANGE
-- ===================================
DELIMITER //

-- ===================================
-- TRIGGER: VALIDAR STOCK ANTES DE VENTA
-- ===================================

CREATE TRIGGER tr_validate_stock_before_sale
BEFORE INSERT ON sale_items
FOR EACH ROW
BEGIN
    DECLARE v_current_stock INT;
    DECLARE v_company_id CHAR(36);
    
    -- Obtener stock actual y company_id
    SELECT p.current_stock, s.company_id 
    INTO v_current_stock, v_company_id
    FROM products p
    INNER JOIN sales s ON s.id = NEW.sale_id
    WHERE p.id = NEW.product_id AND p.company_id = s.company_id;
    
    -- Validar stock suficiente
    IF v_current_stock < NEW.quantity THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Stock insuficiente para completar la venta';
    END IF;
END //

-- ===================================
-- TRIGGER: VALIDAR PUNTOS ANTES DE REDENCIÓN
-- ===================================

CREATE TRIGGER tr_validate_points_before_redemption
BEFORE INSERT ON points
FOR EACH ROW
BEGIN
    DECLARE v_available_points INT DEFAULT 0;
    
    -- Solo validar para redenciones
    IF NEW.type = 'redeemed' AND NEW.points < 0 THEN
        -- Calcular puntos disponibles
        SELECT COALESCE(SUM(points), 0) INTO v_available_points
        FROM points
        WHERE client_id = NEW.client_id 
        AND company_id = NEW.company_id
        AND (expires_at IS NULL OR expires_at > NOW())
        AND is_expired = FALSE;
        
        -- Validar puntos suficientes
        IF v_available_points < ABS(NEW.points) THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Puntos insuficientes para la redención';
        END IF;
    END IF;
END //

-- ===================================
-- TRIGGER: ACTUALIZAR TIMESTAMP EN USUARIOS
-- ===================================

CREATE TRIGGER tr_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //

-- ===================================
-- TRIGGER: ACTUALIZAR TIMESTAMP EN PRODUCTOS
-- ===================================

CREATE TRIGGER tr_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //

-- ===================================
-- TRIGGER: ACTUALIZAR TIMESTAMP EN CLIENTES
-- ===================================

CREATE TRIGGER tr_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //

-- ===================================
-- TRIGGER: ACTUALIZAR TIMESTAMP EN EMPRESAS
-- ===================================

CREATE TRIGGER tr_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //

-- ===================================
-- TRIGGER: ACTUALIZAR TIMESTAMP EN VENTAS
-- ===================================

CREATE TRIGGER tr_sales_updated_at
BEFORE UPDATE ON sales
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //

-- ===================================
-- TRIGGER: ACTUALIZAR TIMESTAMP EN PEDIDOS
-- ===================================

CREATE TRIGGER tr_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //

-- ===================================
-- TRIGGER: CREAR MÉTODOS DE PAGO POR DEFECTO PARA NUEVA EMPRESA
-- ===================================

CREATE TRIGGER tr_create_default_payment_methods
AFTER INSERT ON companies
FOR EACH ROW
BEGIN
    -- Insertar métodos de pago por defecto
    INSERT INTO payment_methods (id, company_id, name, type, is_active) VALUES
    (UUID(), NEW.id, 'Efectivo', 'cash', TRUE),
    (UUID(), NEW.id, 'Tarjeta', 'card', TRUE),
    (UUID(), NEW.id, 'QR/Digital', 'qr', TRUE),
    (UUID(), NEW.id, 'Transferencia', 'transfer', TRUE),
    (UUID(), NEW.id, 'Pago Posterior', 'later', TRUE);
END //

-- ===================================
-- TRIGGER: VALIDAR LÍMITES DE PLAN ANTES DE CREAR USUARIO
-- ===================================

CREATE TRIGGER tr_validate_user_plan_limits
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    DECLARE v_plan VARCHAR(20);
    DECLARE v_user_count INT;
    DECLARE v_max_users INT;
    
    -- Obtener plan de la empresa
    SELECT plan INTO v_plan
    FROM companies
    WHERE id = NEW.company_id;
    
    -- Contar usuarios actuales
    SELECT COUNT(*) INTO v_user_count
    FROM users
    WHERE company_id = NEW.company_id AND is_active = TRUE;
    
    -- Determinar límite según el plan
    CASE v_plan
        WHEN 'BASIC' THEN SET v_max_users = 5;
        WHEN 'PREMIUM' THEN SET v_max_users = 20;
        WHEN 'ENTERPRISE' THEN SET v_max_users = -1; -- Ilimitado
        ELSE SET v_max_users = 5;
    END CASE;
    
    -- Validar límite (si no es ilimitado)
    IF v_max_users > 0 AND v_user_count >= v_max_users THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Se ha alcanzado el límite de usuarios para este plan';
    END IF;
END //

-- ===================================
-- TRIGGER: VALIDAR LÍMITES DE PLAN ANTES DE CREAR PRODUCTO
-- ===================================

CREATE TRIGGER tr_validate_product_plan_limits
BEFORE INSERT ON products
FOR EACH ROW
BEGIN
    DECLARE v_plan VARCHAR(20);
    DECLARE v_product_count INT;
    DECLARE v_max_products INT;
    
    -- Obtener plan de la empresa
    SELECT plan INTO v_plan
    FROM companies
    WHERE id = NEW.company_id;
    
    -- Contar productos actuales
    SELECT COUNT(*) INTO v_product_count
    FROM products
    WHERE company_id = NEW.company_id AND is_active = TRUE;
    
    -- Determinar límite según el plan
    CASE v_plan
        WHEN 'BASIC' THEN SET v_max_products = 100;
        WHEN 'PREMIUM' THEN SET v_max_products = 1000;
        WHEN 'ENTERPRISE' THEN SET v_max_products = -1; -- Ilimitado
        ELSE SET v_max_products = 100;
    END CASE;
    
    -- Validar límite (si no es ilimitado)
    IF v_max_products > 0 AND v_product_count >= v_max_products THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Se ha alcanzado el límite de productos para este plan';
    END IF;
END //

-- ===================================
-- TRIGGER: REGISTRAR MOVIMIENTO DE INVENTARIO EN CAMBIO DE STOCK
-- ===================================

CREATE TRIGGER tr_log_inventory_movement
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
    -- Solo registrar si cambió el stock
    IF OLD.current_stock != NEW.current_stock THEN
        INSERT INTO inventory_movements (
            id, product_id, company_id, type, quantity,
            previous_stock, new_stock, reason, reference
        ) VALUES (
            UUID(), 
            NEW.id, 
            NEW.company_id,
            CASE 
                WHEN NEW.current_stock > OLD.current_stock THEN 'IN'
                WHEN NEW.current_stock < OLD.current_stock THEN 'OUT'
                ELSE 'ADJUSTMENT'
            END,
            ABS(NEW.current_stock - OLD.current_stock),
            OLD.current_stock,
            NEW.current_stock,
            'Actualización directa',
            CONCAT('Cambio manual - ', NOW())
        );
    END IF;
END //

-- ===================================
-- TRIGGER: VALIDAR INTEGRIDAD DE VENTA
-- ===================================

CREATE TRIGGER tr_validate_sale_integrity
BEFORE INSERT ON sales
FOR EACH ROW
BEGIN
    -- Validar que el usuario pertenezca a la empresa
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = NEW.user_id AND company_id = NEW.company_id AND is_active = TRUE
    ) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Usuario no válido para esta empresa';
    END IF;
    
    -- Validar que el cliente pertenezca a la empresa (si se especifica)
    IF NEW.client_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM clients 
        WHERE id = NEW.client_id AND company_id = NEW.company_id AND is_active = TRUE
    ) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cliente no válido para esta empresa';
    END IF;
    
    -- Validar que el total sea positivo
    IF NEW.total < 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'El total de la venta no puede ser negativo';
    END IF;
END //

-- ===================================
-- TRIGGER: ACTUALIZAR ÚLTIMO LOGIN DE USUARIO
-- ===================================

CREATE TRIGGER tr_update_last_login
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    -- Solo actualizar si se está marcando como activo y no era activo antes
    IF NEW.is_active = TRUE AND OLD.is_active = FALSE THEN
        SET NEW.last_login = CURRENT_TIMESTAMP;
    END IF;
END //

-- ===================================
-- TRIGGER: VALIDAR UNICIDAD DE EMAIL EN EMPRESA
-- ===================================

CREATE TRIGGER tr_validate_unique_email_company
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM users 
        WHERE email = NEW.email AND company_id = NEW.company_id AND id != NEW.id
    ) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'El email ya está registrado en esta empresa';
    END IF;
END //

CREATE TRIGGER tr_validate_unique_email_company_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    IF NEW.email != OLD.email AND EXISTS (
        SELECT 1 FROM users 
        WHERE email = NEW.email AND company_id = NEW.company_id AND id != NEW.id
    ) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'El email ya está registrado en esta empresa';
    END IF;
END //

-- Restaurar delimiter
DELIMITER ;