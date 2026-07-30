import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read env file manually
const envPath = path.join(process.cwd(), '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch {
  envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
}

const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    envVars[match[1]] = value.trim();
  }
});

const url = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const serviceKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!url || !serviceKey) {
  console.error('Supabase URL/Key tidak ditemukan di .env.local!');
  process.exit(1);
}

console.log('Mengoneksikan ke Supabase URL:', url);
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

const TABLES = [
  'schools',
  'gugus',
  'supervisors',
  'supervisor_credentials',
  'gugus_credentials',
  'categories',
  'submissions',
  'logs',
  'announcements',
  'app_settings',
  'supervision_notes',
  'lk_bosp_submissions',
  'lk_bosp_breakdown',
  'school_facilities',
  'school_achievements'
];

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

async function runBackup() {
  const backupData = {};
  let sqlDump = `-- ====================================================\n`;
  sqlDump += `-- KORYANDIK CIBADAK DATABASE BACKUP\n`;
  sqlDump += `-- Waktu Backup: ${new Date().toISOString()}\n`;
  sqlDump += `-- Supabase URL: ${url}\n`;
  sqlDump += `-- ====================================================\n\n`;

  for (const table of TABLES) {
    try {
      console.log(`Mengunduh data tabel: ${table}...`);
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.warn(`[Peringatan] Tabel ${table} mungkin tidak ada atau error:`, error.message);
        backupData[table] = [];
        continue;
      }

      backupData[table] = data || [];
      console.log(`  -> Berhasil mengunduh ${data ? data.length : 0} baris dari tabel ${table}`);

      if (data && data.length > 0) {
        sqlDump += `-- Data Tabel: ${table} (${data.length} baris)\n`;
        const columns = Object.keys(data[0]);
        const colList = columns.map(c => `"${c}"`).join(', ');

        for (const row of data) {
          const values = columns.map(col => escapeSqlValue(row[col])).join(', ');
          sqlDump += `INSERT INTO "${table}" (${colList}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
        }
        sqlDump += `\n`;
      }
    } catch (err) {
      console.error(`Error backup tabel ${table}:`, err);
    }
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;

  const jsonFilename = `backup_supabase_koryandik_${dateStr}.json`;
  const sqlFilename = `backup_supabase_koryandik_${dateStr}.sql`;

  const jsonPath = path.join(process.cwd(), jsonFilename);
  const sqlPath = path.join(process.cwd(), sqlFilename);

  fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), 'utf8');
  fs.writeFileSync(sqlPath, sqlDump, 'utf8');

  console.log('\n✅ BACKUP SELESAI!');
  console.log(`📁 File JSON Backup: ${jsonFilename} (${(fs.statSync(jsonPath).size / 1024).toFixed(2)} KB)`);
  console.log(`📁 File SQL Backup:  ${sqlFilename} (${(fs.statSync(sqlPath).size / 1024).toFixed(2)} KB)`);
}

runBackup();
