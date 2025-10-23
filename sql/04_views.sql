-- Vistas
-- Sistema POS Multitenant
-- Creado: 2025-10-21

USE mercalo_pos;

-- ===================================
-- VISTA: RESUMEN DE VENTAS POR DÍA
-- ===================================

CREATE VIEW v_sales_daily_summary AS
SELECT 
    s.company_id,
    DATE(s.created_at) as sale_date,
    COUNT(*) as total_sales,
    SUM(s.total) as total_amount,
    AVG(s.total) as avg_sale_amount,
    SUM(s.points_redeemed) as total_points_redeemed,
    COUNT(DISTINCT s.client_id) as unique_clients,
    SUM(CASE WHEN s.delivery_type = 'delivery' THEN 1 ELSE 0 END) as delivery_sales,
    SUM(CASE WHEN s.delivery_type = 'store' THEN 1 ELSE 0 END) as store_sales
FROM sales s
WHERE s.status = 'completed'
GROUP BY s.company_id, DATE(s.created_at);

-- ===================================
-- VISTA: PRODUCTOS MÁS VENDIDOS
-- ===================================

CREATE VIEW v_top_selling_products AS
SELECT 
    p.company_id,
    p.id as product_id,
    p.name as product_name,
    p.category,
    p.price as current_price,
    SUM(si.quantity) as total_quantity_sold,
    SUM(si.total_price) as total_revenue,
    COUNT(DISTINCT si.sale_id) as sales_count,
    AVG(si.unit_price) as avg_selling_price,
    MAX(s.created_at) as last_sale_date
FROM products p
INNER JOIN sale_items si ON p.id = si.product_id
INNER JOIN sales s ON si.sale_id = s.id
WHERE s.status = 'completed' AND p.is_active = TRUE
GROUP BY p.company_id, p.id, p.name, p.category, p.price;

-- ===================================
-- VISTA: BALANCE DE PUNTOS POR CLIENTE
-- ===================================

CREATE VIEW v_client_points_balance AS
SELECT 
    c.company_id,
    c.id as client_id,
    c.name as client_name,
    c.email as client_email,
    COALESCE(SUM(CASE WHEN p.points > 0 THEN p.points ELSE 0 END), 0) as points_earned,
    COALESCE(SUM(CASE WHEN p.points < 0 THEN ABS(p.points) ELSE 0 END), 0) as points_used,
    COALESCE(SUM(p.points), 0) as current_balance,
    COALESCE(SUM(CASE 
        WHEN p.type = 'earned' AND p.expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY) 
        AND p.is_expired = FALSE AND p.points > 0 
        THEN p.points ELSE 0 END), 0) as points_expiring_soon,
    MAX(p.created_at) as last_points_activity
FROM clients c
LEFT JOIN points p ON c.id = p.client_id AND c.company_id = p.company_id
WHERE c.is_active = TRUE
GROUP BY c.company_id, c.id, c.name, c.email;

-- ===================================
-- VISTA: ESTADÍSTICAS DE INVENTARIO
-- ===================================

CREATE VIEW v_inventory_stats AS
SELECT 
    p.company_id,
    p.id as product_id,
    p.name as product_name,
    p.sku,
    p.category,
    p.current_stock,
    p.min_stock,
    CASE 
        WHEN p.current_stock <= 0 THEN 'OUT_OF_STOCK'
        WHEN p.current_stock <= p.min_stock THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END as stock_status,
    COALESCE(in_movements.total_in, 0) as total_stock_in,
    COALESCE(out_movements.total_out, 0) as total_stock_out,
    COALESCE(sold_items.total_sold, 0) as total_sold,
    p.price * p.current_stock as inventory_value,
    DATEDIFF(NOW(), p.updated_at) as days_since_last_update
FROM products p
LEFT JOIN (
    SELECT product_id, SUM(quantity) as total_in
    FROM inventory_movements
    WHERE type = 'IN'
    GROUP BY product_id
) in_movements ON p.id = in_movements.product_id
LEFT JOIN (
    SELECT product_id, SUM(quantity) as total_out
    FROM inventory_movements
    WHERE type = 'OUT'
    GROUP BY product_id
) out_movements ON p.id = out_movements.product_id
LEFT JOIN (
    SELECT product_id, SUM(quantity) as total_sold
    FROM sale_items si
    INNER JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'completed'
    GROUP BY product_id
) sold_items ON p.id = sold_items.product_id
WHERE p.is_active = TRUE;

-- ===================================
-- VISTA: RESUMEN DE CLIENTES
-- ===================================

CREATE VIEW v_client_summary AS
SELECT 
    c.company_id,
    c.id as client_id,
    c.name as client_name,
    c.email,
    c.phone,
    c.document,
    COUNT(s.id) as total_purchases,
    COALESCE(SUM(s.total), 0) as total_spent,
    COALESCE(AVG(s.total), 0) as avg_purchase_amount,
    MAX(s.created_at) as last_purchase_date,
    MIN(s.created_at) as first_purchase_date,
    COALESCE(pb.current_balance, 0) as points_balance,
    DATEDIFF(NOW(), MAX(s.created_at)) as days_since_last_purchase,
    CASE 
        WHEN COUNT(s.id) >= 10 THEN 'VIP'
        WHEN COUNT(s.id) >= 5 THEN 'FREQUENT'
        WHEN COUNT(s.id) >= 1 THEN 'REGULAR'
        ELSE 'NEW'
    END as client_tier
FROM clients c
LEFT JOIN sales s ON c.id = s.client_id AND s.status = 'completed'
LEFT JOIN v_client_points_balance pb ON c.id = pb.client_id
WHERE c.is_active = TRUE
GROUP BY c.company_id, c.id, c.name, c.email, c.phone, c.document, pb.current_balance;

-- ===================================
-- VISTA: MÉTODOS DE PAGO MÁS USADOS
-- ===================================

CREATE VIEW v_payment_methods_usage AS
SELECT 
    pm.company_id,
    pm.id as payment_method_id,
    pm.name as payment_method_name,
    pm.type as payment_method_type,
    COUNT(sp.id) as usage_count,
    SUM(sp.amount) as total_amount,
    AVG(sp.amount) as avg_amount,
    MAX(sp.created_at) as last_used_date,
    ROUND((COUNT(sp.id) * 100.0 / total_payments.total), 2) as usage_percentage
FROM payment_methods pm
LEFT JOIN sale_payments sp ON pm.id = sp.payment_method_id
CROSS JOIN (
    SELECT pm2.company_id, COUNT(sp2.id) as total
    FROM payment_methods pm2
    LEFT JOIN sale_payments sp2 ON pm2.id = sp2.payment_method_id
    GROUP BY pm2.company_id
) total_payments ON pm.company_id = total_payments.company_id
WHERE pm.is_active = TRUE
GROUP BY pm.company_id, pm.id, pm.name, pm.type, total_payments.total;

-- ===================================
-- VISTA: USUARIOS ACTIVOS Y SUS VENTAS
-- ===================================

CREATE VIEW v_user_sales_performance AS
SELECT 
    u.company_id,
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    u.role,
    COUNT(s.id) as total_sales,
    COALESCE(SUM(s.total), 0) as total_sales_amount,
    COALESCE(AVG(s.total), 0) as avg_sale_amount,
    MAX(s.created_at) as last_sale_date,
    MIN(s.created_at) as first_sale_date,
    COUNT(DISTINCT DATE(s.created_at)) as active_days,
    u.last_login,
    DATEDIFF(NOW(), u.last_login) as days_since_last_login
FROM users u
LEFT JOIN sales s ON u.id = s.user_id AND s.status = 'completed'
WHERE u.is_active = TRUE
GROUP BY u.company_id, u.id, u.name, u.email, u.role, u.last_login;

-- ===================================
-- VISTA: PRODUCTOS CON STOCK BAJO
-- ===================================

CREATE VIEW v_low_stock_products AS
SELECT 
    p.company_id,
    p.id as product_id,
    p.name as product_name,
    p.sku,
    p.category,
    p.current_stock,
    p.min_stock,
    (p.min_stock - p.current_stock) as stock_deficit,
    p.price,
    p.cost,
    (p.price * (p.min_stock - p.current_stock)) as reorder_value,
    COALESCE(recent_sales.avg_daily_sales, 0) as avg_daily_sales,
    CASE 
        WHEN COALESCE(recent_sales.avg_daily_sales, 0) > 0 
        THEN ROUND(p.current_stock / recent_sales.avg_daily_sales, 1)
        ELSE NULL
    END as days_of_stock_remaining,
    p.updated_at as last_stock_update
FROM products p
LEFT JOIN (
    SELECT 
        si.product_id,
        AVG(daily_sales.daily_quantity) as avg_daily_sales
    FROM sale_items si
    INNER JOIN sales s ON si.sale_id = s.id
    INNER JOIN (
        SELECT 
            si2.product_id,
            DATE(s2.created_at) as sale_date,
            SUM(si2.quantity) as daily_quantity
        FROM sale_items si2
        INNER JOIN sales s2 ON si2.sale_id = s2.id
        WHERE s2.status = 'completed' 
        AND s2.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY si2.product_id, DATE(s2.created_at)
    ) daily_sales ON si.product_id = daily_sales.product_id
    WHERE s.status = 'completed' 
    AND s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY si.product_id
) recent_sales ON p.id = recent_sales.product_id
WHERE p.is_active = TRUE 
AND p.current_stock <= p.min_stock;

-- ===================================
-- VISTA: RESUMEN FINANCIERO POR EMPRESA
-- ===================================

CREATE VIEW v_company_financial_summary AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    c.plan,
    
    -- Ventas del día actual
    COALESCE(today_sales.daily_sales, 0) as today_sales_count,
    COALESCE(today_sales.daily_amount, 0) as today_sales_amount,
    
    -- Ventas del mes actual
    COALESCE(month_sales.monthly_sales, 0) as month_sales_count,
    COALESCE(month_sales.monthly_amount, 0) as month_sales_amount,
    
    -- Totales históricos
    COALESCE(total_sales.total_sales, 0) as total_sales_count,
    COALESCE(total_sales.total_amount, 0) as total_sales_amount,
    
    -- Productos y clientes
    COALESCE(product_count.active_products, 0) as active_products,
    COALESCE(client_count.active_clients, 0) as active_clients,
    COALESCE(user_count.active_users, 0) as active_users,
    
    -- Puntos
    COALESCE(points_stats.total_points_issued, 0) as total_points_issued,
    COALESCE(points_stats.total_points_redeemed, 0) as total_points_redeemed,
    
    c.created_at as company_created_at
    
FROM companies c

LEFT JOIN (
    SELECT company_id, COUNT(*) as daily_sales, SUM(total) as daily_amount
    FROM sales
    WHERE status = 'completed' AND DATE(created_at) = CURDATE()
    GROUP BY company_id
) today_sales ON c.id = today_sales.company_id

LEFT JOIN (
    SELECT company_id, COUNT(*) as monthly_sales, SUM(total) as monthly_amount
    FROM sales
    WHERE status = 'completed' 
    AND YEAR(created_at) = YEAR(NOW()) 
    AND MONTH(created_at) = MONTH(NOW())
    GROUP BY company_id
) month_sales ON c.id = month_sales.company_id

LEFT JOIN (
    SELECT company_id, COUNT(*) as total_sales, SUM(total) as total_amount
    FROM sales
    WHERE status = 'completed'
    GROUP BY company_id
) total_sales ON c.id = total_sales.company_id

LEFT JOIN (
    SELECT company_id, COUNT(*) as active_products
    FROM products
    WHERE is_active = TRUE
    GROUP BY company_id
) product_count ON c.id = product_count.company_id

LEFT JOIN (
    SELECT company_id, COUNT(*) as active_clients
    FROM clients
    WHERE is_active = TRUE
    GROUP BY company_id
) client_count ON c.id = client_count.company_id

LEFT JOIN (
    SELECT company_id, COUNT(*) as active_users
    FROM users
    WHERE is_active = TRUE
    GROUP BY company_id
) user_count ON c.id = user_count.company_id

LEFT JOIN (
    SELECT 
        company_id,
        SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as total_points_issued,
        SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) as total_points_redeemed
    FROM points
    GROUP BY company_id
) points_stats ON c.id = points_stats.company_id

WHERE c.is_active = TRUE;

-- ===================================
-- VISTA: ESTADO DE SUSCRIPCIONES
-- ===================================

CREATE VIEW v_company_subscription_status AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.plan,
    c.is_active,
    c.active_until,
    CASE 
        WHEN c.active_until IS NULL THEN 'UNLIMITED'
        WHEN c.active_until < CURDATE() THEN 'EXPIRED'
        WHEN c.active_until BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'EXPIRING_SOON'
        ELSE 'ACTIVE'
    END AS subscription_status,
    CASE 
        WHEN c.active_until IS NULL THEN NULL
        ELSE DATEDIFF(c.active_until, CURDATE())
    END AS days_remaining,
    CASE 
        WHEN c.active_until IS NULL THEN 'Sin límite de tiempo'
        WHEN c.active_until < CURDATE() THEN CONCAT('Vencido hace ', ABS(DATEDIFF(c.active_until, CURDATE())), ' días')
        ELSE CONCAT('Vence en ', DATEDIFF(c.active_until, CURDATE()), ' días')
    END AS status_description,
    c.created_at,
    c.updated_at
FROM companies c
ORDER BY 
    CASE 
        WHEN c.active_until IS NULL THEN 1
        WHEN c.active_until < CURDATE() THEN 2
        WHEN c.active_until BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 3
        ELSE 4
    END,
    c.active_until ASC;