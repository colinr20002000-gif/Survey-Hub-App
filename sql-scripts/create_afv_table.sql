-- Create AFV (Anticipated Final Value) table
-- This table stores project financial forecasting and work order data

CREATE TABLE IF NOT EXISTS afv (
    id BIGSERIAL PRIMARY KEY,

    -- Project Information
    project_number TEXT,
    project_name TEXT,
    client TEXT,
    probability NUMERIC(5,2), -- Stored as decimal (e.g., 1.00 = 100%)
    business TEXT,
    discipline TEXT,
    business_code INTEGER,
    discipline_code INTEGER,
    next_sequence_number INTEGER,

    -- Work Order Information
    work_order_name TEXT,
    work_order_type TEXT,
    internal_external TEXT,
    original_scope_change TEXT,
    start_date DATE,
    end_date DATE,

    -- Revenue Information
    inoengineering_afv_revenue NUMERIC(12,2),
    inosurveying_afv_revenue NUMERIC(12,2),

    -- Project Details
    project_key TEXT,
    work_order_title TEXT,

    -- Financial Values
    initial_value NUMERIC(12,2),
    order_value NUMERIC(12,2),
    cumulative_value NUMERIC(12,2),
    value_to_complete NUMERIC(12,2),
    cost_to_date NUMERIC(12,2),
    manual_cost_adjustment NUMERIC(12,2),
    anticipated_final_cost_ev NUMERIC(12,2),
    forecast_profit NUMERIC(12,2),
    profit_margin NUMERIC(10,8), -- Stored as decimal (e.g., 0.15 = 15%, can handle negative values)

    -- Additional Information
    link TEXT,
    comments TEXT,
    po_number TEXT,
    "invoicing_%_complete" NUMERIC(5,2),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for commonly filtered fields
CREATE INDEX IF NOT EXISTS idx_afv_project_number ON afv(project_number);
CREATE INDEX IF NOT EXISTS idx_afv_client ON afv(client);
CREATE INDEX IF NOT EXISTS idx_afv_discipline ON afv(discipline);
CREATE INDEX IF NOT EXISTS idx_afv_start_date ON afv(start_date);
CREATE INDEX IF NOT EXISTS idx_afv_end_date ON afv(end_date);
CREATE INDEX IF NOT EXISTS idx_afv_work_order_title ON afv(work_order_title);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_afv_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_afv_updated_at ON afv;
CREATE TRIGGER trigger_update_afv_updated_at
    BEFORE UPDATE ON afv
    FOR EACH ROW
    EXECUTE FUNCTION update_afv_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE afv ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all records
CREATE POLICY "Allow authenticated users to read AFV data"
    ON afv
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy to allow authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert AFV data"
    ON afv
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create policy to allow authenticated users to update records
CREATE POLICY "Allow authenticated users to update AFV data"
    ON afv
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create policy to allow authenticated users to delete records
CREATE POLICY "Allow authenticated users to delete AFV data"
    ON afv
    FOR DELETE
    TO authenticated
    USING (true);

-- Add comment to table
COMMENT ON TABLE afv IS 'Stores Anticipated Final Value (AFV) project financial forecasting and work order data';
