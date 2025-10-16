-- Check department values in users table
SELECT DISTINCT department FROM users WHERE department IS NOT NULL ORDER BY department;

-- Check a few user examples
SELECT id, name, email, department FROM users LIMIT 10;

-- Check dropdown items for departments
SELECT di.display_text, dc.name as category_name
FROM dropdown_items di
JOIN dropdown_categories dc ON di.category_id = dc.id
WHERE dc.name = 'department' AND di.is_active = true
ORDER BY di.sort_order;
