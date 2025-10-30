-- Fix profit_margin column to handle larger decimal values
-- Original NUMERIC(5,4) only allowed -9.9999 to 9.9999
-- CSV has values like -5.209150427983711 which need more precision

ALTER TABLE afv ALTER COLUMN profit_margin TYPE NUMERIC(10,8);

-- This allows values from -99.99999999 to 99.99999999
-- which covers all profit margin scenarios (including losses)
