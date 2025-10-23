-- ===================================
-- MIGRACIÓN: Agregar columna phone
-- Tabla: users
-- Fecha: 2025-10-22
-- ===================================

-- Descripción:
-- Agrega la columna phone a la tabla users para almacenar
-- el número de teléfono de cada usuario

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
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'phone';

-- ===================================
-- AGREGAR LA COLUMNA
-- ===================================

-- Agregar la columna phone después de email
ALTER TABLE users 
ADD COLUMN phone VARCHAR(20) NULL 
COMMENT 'Número de teléfono del usuario'
AFTER email;

-- ===================================
-- AGREGAR ÍNDICE PARA BÚSQUEDAS
-- ===================================

-- Crear índice para búsquedas por teléfono (opcional)
CREATE INDEX idx_users_phone ON users(phone);

-- ===================================
-- VERIFICAR LA MIGRACIÓN
-- ===================================

-- Mostrar la estructura actualizada de la tabla
DESCRIBE users;

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
AND TABLE_NAME = 'users' 
ORDER BY ORDINAL_POSITION;

-- ===================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ===================================

-- Actualizar usuarios existentes con números de teléfono de ejemplo
-- DESCOMENTAR SOLO SI QUIERES ESTABLECER TELÉFONOS DE PRUEBA

/*
-- Ejemplos de números para usuarios de prueba
UPDATE users 
SET phone = '+57 300 123 4567'
WHERE email LIKE '%admin%' AND phone IS NULL;

UPDATE users 
SET phone = '+57 301 234 5678'
WHERE email LIKE '%manager%' AND phone IS NULL;

UPDATE users 
SET phone = '+57 302 345 6789'
WHERE email LIKE '%user%' AND phone IS NULL;
*/

-- ===================================
-- CONSULTAS ÚTILES PARA VERIFICAR
-- ===================================

-- Contar usuarios con y sin teléfono
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(phone) as usuarios_con_telefono,
    COUNT(*) - COUNT(phone) as usuarios_sin_telefono
FROM users;

-- Mostrar usuarios con sus teléfonos
SELECT 
    u.id,
    u.name,
    u.email,
    u.phone,
    u.role,
    c.name as company_name
FROM users u
INNER JOIN companies c ON u.company_id = c.id
ORDER BY c.name, u.name;

-- Usuarios sin teléfono (para completar información)
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    c.name as company_name
FROM users u
INNER JOIN companies c ON u.company_id = c.id
WHERE u.phone IS NULL
ORDER BY c.name, u.name;

-- ===================================
-- VALIDACIONES DE FORMATO (OPCIONAL)
-- ===================================

-- Función para validar formato de teléfono (ejemplo básico)
-- Se puede usar en triggers o en la aplicación

/*
-- Ejemplo de validación simple:
-- El teléfono debe tener entre 10 y 20 caracteres y puede contener +, espacios, paréntesis y guiones
SELECT 
    phone,
    CASE 
        WHEN phone REGEXP '^[+]?[0-9() -]{10,20}$' THEN 'VÁLIDO'
        ELSE 'INVÁLIDO'
    END as formato_valido
FROM users 
WHERE phone IS NOT NULL;
*/

-- ===================================
-- MENSAJE DE ÉXITO
-- ===================================

SELECT 
    '✅ Migración completada exitosamente' AS status,
    'Columna phone agregada a la tabla users' AS descripcion,
    NOW() AS fecha_migracion;