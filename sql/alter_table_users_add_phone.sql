-- ===================================
-- COMANDO ALTER TABLE DIRECTO
-- Agregar columna phone a tabla users
-- ===================================

-- Ejecutar este comando en tu base de datos:

ALTER TABLE users 
ADD COLUMN phone VARCHAR(20) NULL 
COMMENT 'Número de teléfono del usuario'
AFTER email;

-- Opcional: Agregar índice para búsquedas por teléfono
CREATE INDEX idx_users_phone ON users(phone);