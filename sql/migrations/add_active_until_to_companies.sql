-- ===================================
-- MIGRACIÓN: Agregar columna active_until
-- Tabla: companies
-- Fecha: 2025-10-22
-- ===================================

-- Descripción:
-- Agrega la columna active_until a la tabla companies para controlar
-- la fecha de vencimiento de la suscripción de cada empresa

-- ===================================
-- VERIFICAR SI LA COLUMNA YA EXISTE
-- ===================================

-- Consulta para verificar si la columna ya existe
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'companies' 
AND COLUMN_NAME = 'active_until';

-- ===================================
-- AGREGAR LA COLUMNA
-- ===================================

-- Agregar la columna active_until después de is_active
ALTER TABLE companies 
ADD COLUMN active_until DATE NULL 
COMMENT 'Fecha hasta la cual la empresa está activa (NULL = sin límite)'
AFTER is_active;

-- ===================================
-- AGREGAR ÍNDICE PARA RENDIMIENTO
-- ===================================

-- Crear índice para consultas de empresas activas por fecha
CREATE INDEX idx_companies_active_until ON companies(active_until);

-- Crear índice compuesto para consultas de estado y fecha
CREATE INDEX idx_companies_active_status ON companies(is_active, active_until);

-- ===================================
-- VERIFICAR LA MIGRACIÓN
-- ===================================

-- Mostrar la estructura actualizada de la tabla
DESCRIBE companies;

-- Verificar que la columna se agregó correctamente
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT,
    ORDINAL_POSITION
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'companies' 
ORDER BY ORDINAL_POSITION;

-- ===================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ===================================

-- Actualizar empresas existentes con fechas de ejemplo
-- DESCOMENTAR SOLO SI QUIERES ESTABLECER FECHAS DE PRUEBA

/*
-- Establecer fecha de vencimiento para empresa con plan BASIC (30 días)
UPDATE companies 
SET active_until = DATE_ADD(CURDATE(), INTERVAL 30 DAY)
WHERE plan = 'BASIC' AND active_until IS NULL;

-- Establecer fecha de vencimiento para empresa con plan PREMIUM (90 días)
UPDATE companies 
SET active_until = DATE_ADD(CURDATE(), INTERVAL 90 DAY)
WHERE plan = 'PREMIUM' AND active_until IS NULL;

-- Establecer fecha de vencimiento para empresa con plan ENTERPRISE (365 días)
UPDATE companies 
SET active_until = DATE_ADD(CURDATE(), INTERVAL 365 DAY)
WHERE plan = 'ENTERPRISE' AND active_until IS NULL;
*/

-- ===================================
-- CONSULTAS ÚTILES PARA VERIFICAR
-- ===================================

-- Contar empresas por estado de activación
SELECT 
    is_active,
    COUNT(*) as total_empresas,
    COUNT(active_until) as empresas_con_fecha_limite
FROM companies 
GROUP BY is_active;

-- Empresas que vencen en los próximos 30 días
SELECT 
    id,
    name,
    plan,
    is_active,
    active_until,
    DATEDIFF(active_until, CURDATE()) as dias_restantes
FROM companies 
WHERE active_until IS NOT NULL 
AND active_until BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
ORDER BY active_until ASC;

-- Empresas vencidas (activas pero con fecha pasada)
SELECT 
    id,
    name,
    plan,
    is_active,
    active_until,
    DATEDIFF(CURDATE(), active_until) as dias_vencidos
FROM companies 
WHERE is_active = TRUE 
AND active_until IS NOT NULL 
AND active_until < CURDATE()
ORDER BY active_until ASC;

-- ===================================
-- MENSAJE DE ÉXITO
-- ===================================

SELECT 
    '✅ Migración completada exitosamente' AS status,
    'Columna active_until agregada a la tabla companies' AS descripcion,
    NOW() AS fecha_migracion;