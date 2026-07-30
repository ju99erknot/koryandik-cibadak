import fs from 'fs';
import path from 'path';

const root = process.cwd();
const schemaFile = path.join(root, 'supabase_schema.sql');
const dataDumpFile = path.join(root, 'backup_supabase_koryandik_2026-07-30_14-21.sql');
const outputFile = path.join(root, 'ONE_CLICK_MIGRATE_TO_NEW_SUPABASE.sql');

let schemaContent = fs.readFileSync(schemaFile, 'utf8');
let dataContent = fs.readFileSync(dataDumpFile, 'utf8');

// Additional tables & column patches schema
const extraSchemas = `
-- ========== SKEMA ALTER TABEL & KOLOM UPDATED_AT ==========
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE gugus ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ========== TABEL TAMBAHAN (Supervision Notes, LK BOSP, Facilities, Achievements, Credentials) ==========

CREATE TABLE IF NOT EXISTS supervisor_credentials (
  supervisor_id TEXT PRIMARY KEY REFERENCES supervisors(id) ON DELETE CASCADE,
  passcode_hash TEXT NOT NULL,
  nip TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gugus_credentials (
  gugus_id TEXT PRIMARY KEY REFERENCES gugus(id) ON DELETE CASCADE,
  passcode_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supervision_notes (
  id TEXT PRIMARY KEY,
  school_npsn TEXT REFERENCES schools(npsn) ON DELETE CASCADE,
  supervisor_id TEXT,
  supervisor_name TEXT,
  visit_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lk_bosp_submissions (
  id TEXT PRIMARY KEY,
  school_npsn TEXT REFERENCES schools(npsn) ON DELETE CASCADE,
  period TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  bank_balance NUMERIC DEFAULT 0,
  cash_balance NUMERIC DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lk_bosp_breakdown (
  id TEXT PRIMARY KEY,
  submission_id TEXT REFERENCES lk_bosp_submissions(id) ON DELETE CASCADE,
  item_name TEXT,
  amount NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS school_facilities (
  id TEXT PRIMARY KEY,
  school_npsn TEXT REFERENCES schools(npsn) ON DELETE CASCADE,
  name TEXT NOT NULL,
  condition TEXT DEFAULT 'Baik',
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_achievements (
  id TEXT PRIMARY KEY,
  school_npsn TEXT REFERENCES schools(npsn) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Akademik',
  year INTEGER,
  level TEXT DEFAULT 'Kecamatan',
  rank TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for extra tables
ALTER TABLE supervisor_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE gugus_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lk_bosp_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lk_bosp_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_achievements ENABLE ROW LEVEL SECURITY;

-- Allow anon & authenticated policy for all tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for anon" ON %I;', t);
    EXECUTE format('CREATE POLICY "Allow all for anon" ON %I FOR ALL USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;

`;

let combined = `-- ============================================================\n`;
combined += `-- KORYANDIK CIBADAK — ONE-CLICK MASTER MIGRATION & DATA RESTORE\n`;
combined += `-- Dibuat otomatis untuk migrasi ke Akun/Project Supabase Baru\n`;
combined += `-- Waktu Pembuatan: ${new Date().toISOString()}\n`;
combined += `-- ============================================================\n\n`;

combined += `-- BAGIAN 1: STRUKTUR SKEMA TABEL & KEAMANAN\n`;
combined += schemaContent + `\n\n`;
combined += extraSchemas + `\n\n`;

combined += `-- BAGIAN 2: DATA LENGKAP SEKOLAH, GUGUS, PENGAWAS, DLL.\n`;
combined += dataContent;

fs.writeFileSync(outputFile, combined, 'utf8');
console.log('✅ File MIGRASI 1-CLICK BERHASIL DIBUAT:', outputFile);
console.log(`Ukuran File: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);
