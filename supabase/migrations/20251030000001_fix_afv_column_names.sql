-- Fix AFV column names to match CSV import conversion
-- This aligns the database column names with how the CSV headers are converted

-- Rename revenue columns
ALTER TABLE afv RENAME COLUMN ino_engineering_afv_revenue TO inoengineering_afv_revenue;
ALTER TABLE afv RENAME COLUMN ino_surveying_afv_revenue TO inosurveying_afv_revenue;

-- Rename invoicing column and handle the % character
ALTER TABLE afv RENAME COLUMN invoicing_percent_complete TO "invoicing_%_complete";
