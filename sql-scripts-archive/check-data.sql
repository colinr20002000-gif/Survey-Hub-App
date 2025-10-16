-- Check equipment categories
SELECT * FROM equipment_categories WHERE name = 'Surveying Equipment';

-- Check total station equipment and their categories
SELECT id, name, category FROM equipment WHERE LOWER(name) LIKE '%total%' OR LOWER(name) LIKE '%station%';

-- Check all equipment to see what categories they have
SELECT DISTINCT category FROM equipment ORDER BY category;
