-- ============================================================
-- Koryandik Cibadak — Migration: Online Presence Table
-- Jalankan di Supabase SQL Editor untuk menambah fitur tracking user online
-- ============================================================

-- Tabel untuk tracking user yang sedang online/aktif
CREATE TABLE IF NOT EXISTS online_presence (
  id TEXT PRIMARY KEY,              -- Format: role-npsn/id (e.g. "school-20201234", "pengawas-1")
  role TEXT NOT NULL,
  user_name TEXT NOT NULL,
  npsn TEXT,                        -- NPSN sekolah (null untuk non-school)
  gugus_id TEXT,                    -- Gugus ID (untuk filter)
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page TEXT DEFAULT '/dashboard',   -- Halaman yang sedang dibuka
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query cepat: siapa yang online dalam 2 menit terakhir
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON online_presence (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_presence_role ON online_presence (role);

-- Disable Row Level Security (RLS) agar client-side anonymous key bisa menulis heartbeat
ALTER TABLE online_presence DISABLE ROW LEVEL SECURITY;

