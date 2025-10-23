-- ============================================================================
-- Check for Missing Indexes on Foreign Keys
-- ============================================================================
-- This query finds all foreign key columns that don't have indexes
-- Indexes on FKs are critical for JOIN performance and CASCADE deletes
-- ============================================================================

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    CASE
        WHEN i.indexname IS NULL THEN '❌ MISSING INDEX'
        ELSE '✅ Has Index: ' || i.indexname
    END as index_status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN pg_indexes i
    ON i.tablename = tc.table_name
    AND i.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY
    CASE WHEN i.indexname IS NULL THEN 0 ELSE 1 END,
    tc.table_name;
