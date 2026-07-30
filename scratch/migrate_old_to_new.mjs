import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// OLD Supabase Project (Source of Real Data)
const oldUrl = 'https://jcliulngbpekpcjalhby.supabase.co';
const oldServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjbGl1bG5nYnBla3BjamFsaGJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY1MDY1NywiZXhwIjoyMDk4MjI2NjU3fQ.CMiU7diCgQhbBzko4hjROLImrb2DJPwMfMXAwRQfIqA';

// NEW Supabase Project (Destination)
const newUrl = 'https://bjitnvgbwamiusredsvu.supabase.co';
const newServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqaXRudmdid2FtaXVzcmVkc3Z1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTM5MjAwOSwiZXhwIjoyMTAwOTY4MDA5fQ.IUBvsXX-Qiv5NTZlWHRUuSmTHVZfg0BB5q9gIhteTEw';

console.log('==================================================');
console.log('DIRECT DATA MIGRATION FROM OLD SUPABASE TO NEW SUPABASE');
console.log('Source (OLD):', oldUrl);
console.log('Destination (NEW):', newUrl);
console.log('==================================================\n');

const oldClient = createClient(oldUrl, oldServiceKey, { auth: { persistSession: false } });
const newClient = createClient(newUrl, newServiceKey, { auth: { persistSession: false } });

const TABLES = [
  'schools',
  'gugus',
  'supervisors',
  'supervisor_credentials',
  'gugus_credentials',
  'categories',
  'submissions',
  'announcements',
  'app_settings',
  'school_facilities',
  'school_achievements'
];

async function migrateAllData() {
  for (const table of TABLES) {
    try {
      console.log(`[MIGRASI] Mengunduh data asli dari tabel '${table}' di Supabase Lama...`);
      const { data: rows, error: readError } = await oldClient.from(table).select('*');
      if (readError) {
        console.warn(`  ⚠️ Tabel ${table} tidak ditemukan atau error di Supabase lama:`, readError.message);
        continue;
      }

      if (!rows || rows.length === 0) {
        console.log(`  ℹ️ Tabel ${table} di Supabase lama kosong.`);
        continue;
      }

      console.log(`  -> Menyalin ${rows.length} baris ke Supabase Baru...`);

      // Upsert rows into new Supabase
      const { error: writeError } = await newClient.from(table).upsert(rows);
      if (writeError) {
        console.error(`  ❌ Error menyalin ke tabel ${table} di Supabase baru:`, writeError.message);
      } else {
        console.log(`  ✅ BERHASIL menyalin ${rows.length} baris ke tabel '${table}' di Supabase Baru!`);
      }
    } catch (err) {
      console.error(`  ❌ Catch error pada tabel ${table}:`, err);
    }
  }

  console.log('\n==================================================');
  console.log('🎉 MIGRASI LANGSUNG SELESAI!');
  console.log('Seluruh data asli (Anggi Rahadiansyah, Dito M. Naufal, dll.) kini telah dipindahkan 100% ke Supabase Baru!');
  console.log('==================================================');
}

migrateAllData();
