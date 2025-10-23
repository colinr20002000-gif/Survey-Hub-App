-- Update Total Station equipment to have the Surveying Equipment category
UPDATE equipment
SET category = 'Surveying Equipment'
WHERE LOWER(name) LIKE '%total%station%'
   OR LOWER(name) LIKE '%total station%'
   OR name ILIKE '%Total Station%';

-- Also verify the color was updated
SELECT name, color FROM equipment_categories WHERE name = 'Surveying Equipment';
