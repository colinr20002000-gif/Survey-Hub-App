-- Check what departments are in the dropdown_items table
SELECT 
    di.display_text as department,
    di.is_active,
    di.sort_order,
    dc.name as category_name
FROM dropdown_items di
JOIN dropdown_categories dc ON di.category_id = dc.id
WHERE dc.name = 'department' OR dc.name = 'Department'
ORDER BY di.sort_order;
