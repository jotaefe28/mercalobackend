-- Script Principal de Instalación
-- Sistema POS Multitenant
-- Creado: 2025-10-21

-- ===================================
-- INSTRUCCIONES DE USO
-- ===================================
/*
Este script configura completamente la base de datos del sistema POS multitenant.

Para ejecutar:
1. Crear una nueva base de datos MySQL
2. Ejecutar este script completo
3. Opcional: Ejecutar 06_test_data.sql para datos de prueba

Requerimientos:
- MySQL 8.0 o superior
- Permisos de administrador de base de datos
*/

-- ===================================
-- CONFIGURACIÓN INICIAL
-- ===================================

-- Configurar zona horaria y variables de sesión
SET time_zone = '+00:00';
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- ===================================
-- EJECUTAR SCRIPTS EN ORDEN
-- ===================================

-- Esquema principal
SOURCE 01_schema.sql;

-- Stored procedures
SOURCE 02_stored_procedures.sql;

-- Triggers
SOURCE 03_triggers.sql;

-- Vistas
SOURCE 04_views.sql;

-- Índices adicionales
SOURCE 05_indexes.sql;

-- ===================================
-- VERIFICACIÓN DE INSTALACIÓN
-- ===================================

-- Verificar que todas las tablas fueron creadas
SELECT 
    'Verificación de instalación' AS status,
    COUNT(*) AS total_tables
FROM information_schema.tables 
WHERE table_schema = 'mercalo_pos';

-- Listar todas las tablas creadas
SELECT 
    table_name AS tabla,
    table_rows AS filas_estimadas,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS tamaño_mb
FROM information_schema.tables 
WHERE table_schema = 'mercalo_pos'
ORDER BY table_name;

-- Verificar stored procedures
SELECT 
    routine_name AS procedimiento,
    routine_type AS tipo
FROM information_schema.routines 
WHERE routine_schema = 'mercalo_pos'
ORDER BY routine_name;

-- Verificar triggers
SELECT 
    trigger_name AS trigger_nombre,
    event_manipulation AS evento,
    event_object_table AS tabla
FROM information_schema.triggers 
WHERE trigger_schema = 'mercalo_pos'
ORDER BY event_object_table, trigger_name;

-- Verificar vistas
SELECT 
    table_name AS vista
FROM information_schema.views 
WHERE table_schema = 'mercalo_pos'
ORDER BY table_name;

-- Verificar índices
SELECT 
    table_name AS tabla,
    index_name AS indice,
    column_name AS columna,
    seq_in_index AS posicion
FROM information_schema.statistics 
WHERE table_schema = 'mercalo_pos'
AND index_name != 'PRIMARY'
ORDER BY table_name, index_name, seq_in_index;

-- ===================================
-- RESUMEN FINAL
-- ===================================

SELECT 
    '✅ Instalación completada exitosamente' AS mensaje,
    NOW() AS fecha_instalacion,
    USER() AS usuario_instalacion,
    DATABASE() AS base_datos;

-- ===================================
-- INFORMACIÓN IMPORTANTE
-- ===================================

SELECT 
    'INFORMACIÓN IMPORTANTE' AS titulo,
    '1. Configurar variables de entorno en la aplicación' AS paso_1,
    '2. Instalar dependencias: npm install' AS paso_2,
    '3. Ejecutar migraciones si es necesario' AS paso_3,
    '4. Opcional: Cargar datos de prueba con 06_test_data.sql' AS paso_4;

-- ===================================
-- CONFIGURACIÓN RECOMENDADA
-- ===================================

-- Configuraciones recomendadas para producción
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
SET GLOBAL max_connections = 200;
SET GLOBAL query_cache_size = 67108864; -- 64MB
SET GLOBAL slow_query_log = 1;
SET GLOBAL long_query_time = 2;

SELECT 
    'Configuración aplicada' AS status,
    @@innodb_buffer_pool_size / 1024 / 1024 AS buffer_pool_mb,
    @@max_connections AS max_conexiones,
    @@query_cache_size / 1024 / 1024 AS query_cache_mb;