-- Update equipment table with the URL of the latest calibration certificate
UPDATE equipment e
SET calibration_certificate_url = subquery.file_url
FROM (
    SELECT DISTINCT ON (equipment_id) equipment_id, file_url
    FROM calibration_certificates
    ORDER BY equipment_id, expiry_date DESC, created_at DESC
) AS subquery
WHERE e.id = subquery.equipment_id;
