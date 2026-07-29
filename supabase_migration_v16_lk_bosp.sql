-- ============================================================
-- KORYANDIK CIBADAK - MIGRATION V16: LK BOSP & REKENING KORAN
-- Execute this SQL script in your Supabase SQL Editor.
-- ============================================================

-- 1. Create table lk_bosp_submissions
CREATE TABLE IF NOT EXISTS public.lk_bosp_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npsn TEXT NOT NULL,
    school_name TEXT NOT NULL,
    gugus TEXT NOT NULL,
    period_year INTEGER NOT NULL DEFAULT 2026,
    triwulan INTEGER NOT NULL DEFAULT 1 CHECK (triwulan IN (1, 2, 3, 4)),
    excel_file_url TEXT,
    excel_file_name TEXT,
    rekening_koran_url TEXT,
    rekening_koran_name TEXT,
    saldo_awal NUMERIC(15, 2) DEFAULT 0.00,
    total_penerimaan NUMERIC(15, 2) DEFAULT 0.00,
    total_realisasi NUMERIC(15, 2) DEFAULT 0.00,
    sisa_saldo NUMERIC(15, 2) DEFAULT 0.00,
    is_balance_match BOOLEAN DEFAULT TRUE,
    breakdown JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revision')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Unique Index per School, Year, & Triwulan
CREATE UNIQUE INDEX IF NOT EXISTS idx_lk_bosp_npsn_year_tw 
ON public.lk_bosp_submissions (npsn, period_year, triwulan);

-- 3. Create Additional Performance Indexes
CREATE INDEX IF NOT EXISTS idx_lk_bosp_gugus ON public.lk_bosp_submissions (gugus);
CREATE INDEX IF NOT EXISTS idx_lk_bosp_status ON public.lk_bosp_submissions (status);
CREATE INDEX IF NOT EXISTS idx_lk_bosp_period ON public.lk_bosp_submissions (period_year, triwulan);

-- 4. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.lk_bosp_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anonymous read lk_bosp_submissions" ON public.lk_bosp_submissions;
DROP POLICY IF EXISTS "Allow anonymous insert lk_bosp_submissions" ON public.lk_bosp_submissions;
DROP POLICY IF EXISTS "Allow anonymous update lk_bosp_submissions" ON public.lk_bosp_submissions;
DROP POLICY IF EXISTS "Allow anonymous delete lk_bosp_submissions" ON public.lk_bosp_submissions;

-- Create Permissive Policies for Web Application
CREATE POLICY "Allow anonymous read lk_bosp_submissions" 
ON public.lk_bosp_submissions FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert lk_bosp_submissions" 
ON public.lk_bosp_submissions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update lk_bosp_submissions" 
ON public.lk_bosp_submissions FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete lk_bosp_submissions" 
ON public.lk_bosp_submissions FOR DELETE USING (true);

-- 5. Grant Permissions to anon & authenticated roles
GRANT ALL ON public.lk_bosp_submissions TO anon;
GRANT ALL ON public.lk_bosp_submissions TO authenticated;
GRANT ALL ON public.lk_bosp_submissions TO service_role;
