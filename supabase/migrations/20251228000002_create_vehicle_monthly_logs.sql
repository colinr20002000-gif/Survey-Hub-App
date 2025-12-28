-- Create vehicle_monthly_logs table to track status of monthly sheets
CREATE TABLE IF NOT EXISTS public.vehicle_monthly_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'submitted'
    submitted_at TIMESTAMP WITH TIME ZONE,
    submitted_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_vehicle_month_year UNIQUE (vehicle_id, month, year)
);

-- Enable RLS
ALTER TABLE public.vehicle_monthly_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "vehicle_monthly_logs_select_all" ON public.vehicle_monthly_logs FOR SELECT USING (true);

CREATE POLICY "vehicle_monthly_logs_insert" ON public.vehicle_monthly_logs FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
);

CREATE POLICY "vehicle_monthly_logs_update" ON public.vehicle_monthly_logs FOR UPDATE USING (
    auth.role() = 'authenticated'
);

CREATE POLICY "vehicle_monthly_logs_delete" ON public.vehicle_monthly_logs FOR DELETE USING (
    auth.role() = 'authenticated'
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_monthly_logs_vehicle_id ON public.vehicle_monthly_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_monthly_logs_vehicle_month_year ON public.vehicle_monthly_logs(vehicle_id, month, year);
