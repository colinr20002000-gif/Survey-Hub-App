-- Create vehicle_mileage_logs table
CREATE TABLE IF NOT EXISTS public.vehicle_mileage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    purpose TEXT NOT NULL,
    start_location TEXT,
    end_location TEXT,
    start_mileage INTEGER NOT NULL,
    end_mileage INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vehicle_mileage_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "vehicle_mileage_logs_select_all" ON public.vehicle_mileage_logs FOR SELECT USING (true);

-- Allow Viewer+ and above to insert/update/delete (matching typical permissions)
-- Using existing helper functions if available, or just checking role
CREATE POLICY "vehicle_mileage_logs_insert" ON public.vehicle_mileage_logs FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' -- Refine this later if needed
);

CREATE POLICY "vehicle_mileage_logs_update" ON public.vehicle_mileage_logs FOR UPDATE USING (
    auth.role() = 'authenticated'
);

CREATE POLICY "vehicle_mileage_logs_delete" ON public.vehicle_mileage_logs FOR DELETE USING (
    auth.role() = 'authenticated'
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_vehicle_mileage_logs_vehicle_id ON public.vehicle_mileage_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_mileage_logs_date ON public.vehicle_mileage_logs(date DESC);
