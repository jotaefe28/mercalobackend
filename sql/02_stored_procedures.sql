-- Stored Procedures
-- Sistema POS Multitenant
-- Creado: 2025-10-21

USE mercalo_pos;

-- ===================================
-- DELIMITER CHANGE
-- ===================================
DELIMITER //

-- ===================================
-- SP: PROCESAR VENTA COMPLETA
-- ===================================

CREATE PROCEDURE sp_process_sale(
    IN p_company_id CHAR(36),
    IN p_user_id CHAR(36),
    IN p_client_id CHAR(36),
    IN p_invoice_number VARCHAR(50),
    IN p_subtotal DECIMAL(10,2),
    IN p_tax_amount DECIMAL(10,2),
    IN p_discount_amount DECIMAL(10,2),
    IN p_points_redeemed INT,
    IN p_total DECIMAL(10,2),
    IN p_delivery_type ENUM('store', 'delivery'),
    IN p_delivery_address TEXT,
    IN p_notes TEXT,
    IN p_items JSON,
    IN p_payments JSON,
    OUT p_sale_id CHAR(36),
    OUT p_result VARCHAR(255)
)
BEGIN
    DECLARE v_sale_id CHAR(36);
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_item_count INT;
    DECLARE v_payment_count INT;
    DECLARE v_i INT DEFAULT 0;
    DECLARE v_product_id CHAR(36);
    DECLARE v_quantity INT;
    DECLARE v_unit_price DECIMAL(10,2);
    DECLARE v_total_price DECIMAL(10,2);
    DECLARE v_current_stock INT;
    DECLARE v_payment_method_id CHAR(36);
    DECLARE v_payment_amount DECIMAL(10,2);
    DECLARE v_payment_reference VARCHAR(255);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1
            v_error_msg = MESSAGE_TEXT;
        SET p_result = CONCAT('ERROR: ', v_error_msg);
    END;
    
    START TRANSACTION;
    
    -- Generar ID para la venta
    SET v_sale_id = UUID();
    
    -- Insertar venta principal
    INSERT INTO sales (
        id, company_id, user_id, client_id, invoice_number,
        subtotal, tax_amount, discount_amount, points_redeemed,
        total, delivery_type, delivery_address, notes, status
    ) VALUES (
        v_sale_id, p_company_id, p_user_id, p_client_id, p_invoice_number,
        p_subtotal, p_tax_amount, p_discount_amount, p_points_redeemed,
        p_total, p_delivery_type, p_delivery_address, p_notes, 'completed'
    );
    
    -- Procesar items de la venta
    SET v_item_count = JSON_LENGTH(p_items);
    
    WHILE v_i < v_item_count DO
        SET v_product_id = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].product_id')));
        SET v_quantity = JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].quantity'));
        SET v_unit_price = JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].unit_price'));
        SET v_total_price = v_quantity * v_unit_price;
        
        -- Verificar stock disponible
        SELECT current_stock INTO v_current_stock 
        FROM products 
        WHERE id = v_product_id AND company_id = p_company_id;
        
        IF v_current_stock < v_quantity THEN
            SET v_error_msg = CONCAT('Stock insuficiente para producto: ', v_product_id);
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_error_msg;
        END IF;
        
        -- Insertar item de venta
        INSERT INTO sale_items (
            id, sale_id, product_id, quantity, unit_price, total_price
        ) VALUES (
            UUID(), v_sale_id, v_product_id, v_quantity, v_unit_price, v_total_price
        );
        
        -- Actualizar stock del producto
        UPDATE products 
        SET current_stock = current_stock - v_quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_product_id AND company_id = p_company_id;
        
        -- Registrar movimiento de inventario
        INSERT INTO inventory_movements (
            id, product_id, company_id, type, quantity, 
            previous_stock, new_stock, reason, reference
        ) VALUES (
            UUID(), v_product_id, p_company_id, 'OUT', v_quantity,
            v_current_stock, v_current_stock - v_quantity,
            'Venta', p_invoice_number
        );
        
        SET v_i = v_i + 1;
    END WHILE;
    
    -- Procesar pagos
    SET v_payment_count = JSON_LENGTH(p_payments);
    SET v_i = 0;
    
    WHILE v_i < v_payment_count DO
        SET v_payment_method_id = JSON_UNQUOTE(JSON_EXTRACT(p_payments, CONCAT('$[', v_i, '].payment_method_id')));
        SET v_payment_amount = JSON_EXTRACT(p_payments, CONCAT('$[', v_i, '].amount'));
        SET v_payment_reference = JSON_UNQUOTE(JSON_EXTRACT(p_payments, CONCAT('$[', v_i, '].reference')));
        
        -- Insertar pago
        INSERT INTO sale_payments (
            id, sale_id, payment_method_id, amount, reference
        ) VALUES (
            UUID(), v_sale_id, v_payment_method_id, v_payment_amount, v_payment_reference
        );
        
        SET v_i = v_i + 1;
    END WHILE;
    
    -- Procesar redención de puntos si aplica
    IF p_points_redeemed > 0 AND p_client_id IS NOT NULL THEN
        INSERT INTO points (
            id, client_id, company_id, points, type, reason, reference
        ) VALUES (
            UUID(), p_client_id, p_company_id, -p_points_redeemed, 
            'redeemed', 'Redención en venta', p_invoice_number
        );
    END IF;
    
    -- Otorgar puntos por la compra si hay cliente
    IF p_client_id IS NOT NULL THEN
        INSERT INTO points (
            id, client_id, company_id, points, type, reason, reference, expires_at
        ) VALUES (
            UUID(), p_client_id, p_company_id, FLOOR(p_total), 
            'earned', 'Compra', p_invoice_number, DATE_ADD(NOW(), INTERVAL 1 YEAR)
        );
    END IF;
    
    COMMIT;
    
    SET p_sale_id = v_sale_id;
    SET p_result = 'SUCCESS';
END //

-- ===================================
-- SP: ANULAR VENTA
-- ===================================

CREATE PROCEDURE sp_void_sale(
    IN p_sale_id CHAR(36),
    IN p_void_reason TEXT,
    IN p_voided_by CHAR(36),
    OUT p_result VARCHAR(255)
)
BEGIN
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_company_id CHAR(36);
    DECLARE v_client_id CHAR(36);
    DECLARE v_invoice_number VARCHAR(50);
    DECLARE v_points_redeemed INT;
    DECLARE v_total DECIMAL(10,2);
    DECLARE v_status VARCHAR(20);
    DECLARE done INT DEFAULT FALSE;
    
    -- Cursor para items de la venta
    DECLARE item_cursor CURSOR FOR
        SELECT product_id, quantity
        FROM sale_items
        WHERE sale_id = p_sale_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1
            v_error_msg = MESSAGE_TEXT;
        SET p_result = CONCAT('ERROR: ', v_error_msg);
    END;
    
    START TRANSACTION;
    
    -- Obtener datos de la venta
    SELECT company_id, client_id, invoice_number, points_redeemed, total, status
    INTO v_company_id, v_client_id, v_invoice_number, v_points_redeemed, v_total, v_status
    FROM sales
    WHERE id = p_sale_id;
    
    -- Verificar que la venta existe y no está anulada
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Venta no encontrada';
    END IF;
    
    IF v_status = 'void' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta ya está anulada';
    END IF;
    
    -- Actualizar estado de la venta
    UPDATE sales 
    SET status = 'void',
        void_reason = p_void_reason,
        voided_by = p_voided_by,
        voided_at = CURRENT_TIMESTAMP
    WHERE id = p_sale_id;
    
    -- Restaurar stock de productos
    BEGIN
        DECLARE v_product_id CHAR(36);
        DECLARE v_quantity INT;
        DECLARE v_current_stock INT;
        
        OPEN item_cursor;
        
        read_loop: LOOP
            FETCH item_cursor INTO v_product_id, v_quantity;
            IF done THEN
                LEAVE read_loop;
            END IF;
            
            -- Obtener stock actual
            SELECT current_stock INTO v_current_stock
            FROM products
            WHERE id = v_product_id AND company_id = v_company_id;
            
            -- Restaurar stock
            UPDATE products 
            SET current_stock = current_stock + v_quantity,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_product_id AND company_id = v_company_id;
            
            -- Registrar movimiento de inventario
            INSERT INTO inventory_movements (
                id, product_id, company_id, type, quantity,
                previous_stock, new_stock, reason, reference
            ) VALUES (
                UUID(), v_product_id, v_company_id, 'IN', v_quantity,
                v_current_stock, v_current_stock + v_quantity,
                'Anulación de venta', v_invoice_number
            );
        END LOOP;
        
        CLOSE item_cursor;
    END;
    
    -- Restaurar puntos redimidos
    IF v_points_redeemed > 0 AND v_client_id IS NOT NULL THEN
        INSERT INTO points (
            id, client_id, company_id, points, type, reason, reference
        ) VALUES (
            UUID(), v_client_id, v_company_id, v_points_redeemed,
            'adjustment', 'Devolución por anulación', v_invoice_number
        );
    END IF;
    
    -- Remover puntos otorgados por la compra
    IF v_client_id IS NOT NULL THEN
        INSERT INTO points (
            id, client_id, company_id, points, type, reason, reference
        ) VALUES (
            UUID(), v_client_id, v_company_id, -FLOOR(v_total),
            'adjustment', 'Remoción por anulación', v_invoice_number
        );
    END IF;
    
    COMMIT;
    SET p_result = 'SUCCESS';
END //

-- ===================================
-- SP: REDIMIR PUNTOS
-- ===================================

CREATE PROCEDURE sp_redeem_points(
    IN p_client_id CHAR(36),
    IN p_company_id CHAR(36),
    IN p_points_to_redeem INT,
    IN p_reference VARCHAR(255),
    OUT p_result VARCHAR(255)
)
BEGIN
    DECLARE v_available_points INT DEFAULT 0;
    DECLARE v_error_msg VARCHAR(255);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1
            v_error_msg = MESSAGE_TEXT;
        SET p_result = CONCAT('ERROR: ', v_error_msg);
    END;
    
    START TRANSACTION;
    
    -- Calcular puntos disponibles
    SELECT COALESCE(SUM(points), 0) INTO v_available_points
    FROM points
    WHERE client_id = p_client_id 
    AND company_id = p_company_id
    AND (expires_at IS NULL OR expires_at > NOW())
    AND is_expired = FALSE;
    
    -- Verificar puntos suficientes
    IF v_available_points < p_points_to_redeem THEN
        SET v_error_msg = CONCAT('Puntos insuficientes. Disponibles: ', v_available_points, ', Solicitados: ', p_points_to_redeem);
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_error_msg;
    END IF;
    
    -- Registrar redención
    INSERT INTO points (
        id, client_id, company_id, points, type, reason, reference
    ) VALUES (
        UUID(), p_client_id, p_company_id, -p_points_to_redeem,
        'redeemed', 'Redención de puntos', p_reference
    );
    
    COMMIT;
    SET p_result = 'SUCCESS';
END //

-- ===================================
-- SP: EXPIRAR PUNTOS
-- ===================================

CREATE PROCEDURE sp_expire_points(
    IN p_company_id CHAR(36),
    OUT p_expired_count INT,
    OUT p_result VARCHAR(255)
)
BEGIN
    DECLARE v_error_msg VARCHAR(255);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1
            v_error_msg = MESSAGE_TEXT;
        SET p_result = CONCAT('ERROR: ', v_error_msg);
        SET p_expired_count = 0;
    END;
    
    START TRANSACTION;
    
    -- Marcar puntos como expirados
    UPDATE points 
    SET is_expired = TRUE
    WHERE company_id = p_company_id
    AND expires_at <= NOW()
    AND is_expired = FALSE
    AND type = 'earned';
    
    SET p_expired_count = ROW_COUNT();
    
    -- Crear registros de expiración
    INSERT INTO points (id, client_id, company_id, points, type, reason, reference)
    SELECT 
        UUID(),
        client_id,
        company_id,
        -points,
        'expired',
        'Expiración automática',
        CONCAT('Exp-', DATE_FORMAT(NOW(), '%Y%m%d'))
    FROM points
    WHERE company_id = p_company_id
    AND expires_at <= NOW()
    AND is_expired = TRUE
    AND type = 'earned'
    AND points > 0;
    
    COMMIT;
    SET p_result = 'SUCCESS';
END //

-- ===================================
-- SP: CALCULAR BALANCE DE PUNTOS
-- ===================================

CREATE PROCEDURE sp_calculate_points_balance(
    IN p_client_id CHAR(36),
    IN p_company_id CHAR(36),
    OUT p_total_points INT,
    OUT p_available_points INT,
    OUT p_expiring_soon INT
)
BEGIN
    -- Total de puntos (histórico)
    SELECT COALESCE(SUM(points), 0) INTO p_total_points
    FROM points
    WHERE client_id = p_client_id 
    AND company_id = p_company_id;
    
    -- Puntos disponibles (no expirados)
    SELECT COALESCE(SUM(points), 0) INTO p_available_points
    FROM points
    WHERE client_id = p_client_id 
    AND company_id = p_company_id
    AND (expires_at IS NULL OR expires_at > NOW())
    AND is_expired = FALSE;
    
    -- Puntos que expiran en los próximos 30 días
    SELECT COALESCE(SUM(points), 0) INTO p_expiring_soon
    FROM points
    WHERE client_id = p_client_id 
    AND company_id = p_company_id
    AND expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)
    AND is_expired = FALSE
    AND type = 'earned'
    AND points > 0;
END //

-- ===================================
-- SP: ESTADÍSTICAS DE VENTAS
-- ===================================

CREATE PROCEDURE sp_sales_stats(
    IN p_company_id CHAR(36),
    IN p_date_from DATE,
    IN p_date_to DATE,
    OUT p_total_sales INT,
    OUT p_total_amount DECIMAL(12,2),
    OUT p_avg_sale DECIMAL(10,2),
    OUT p_total_items INT
)
BEGIN
    SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total), 0) as total_amount,
        COALESCE(AVG(total), 0) as avg_sale
    INTO p_total_sales, p_total_amount, p_avg_sale
    FROM sales
    WHERE company_id = p_company_id
    AND status = 'completed'
    AND DATE(created_at) BETWEEN p_date_from AND p_date_to;
    
    SELECT COALESCE(SUM(si.quantity), 0) INTO p_total_items
    FROM sale_items si
    INNER JOIN sales s ON si.sale_id = s.id
    WHERE s.company_id = p_company_id
    AND s.status = 'completed'
    AND DATE(s.created_at) BETWEEN p_date_from AND p_date_to;
END //

-- Restaurar delimiter
DELIMITER ;