import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
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
const key = envVars['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(url, key);

async function fullAudit() {
  console.log('==================================================');
  console.log('AUDIT LENGKAP SUPABASE BARU:', url);
  console.log('==================================================\n');

  const tables = [
    'schools',
    'gugus',
    'supervisors',
    'supervisor_credentials',
    'gugus_credentials',
    'categories',
    'app_settings',
    'school_facilities',
    'school_achievements'
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.log(`❌ Tabel ${table}: ERROR (${error.message})`);
    } else {
      console.log(`✅ Tabel '${table}': ${data.length} BARIS DATA TERIMPORT`);
    }
  }

  console.log('\n--- SAMPEL CEK NAMA OPERATOR SEKOLAH DI SUPABASE BARU ---');
  const { data: schools } = await supabase.from('schools').select('npsn, name, operator_name, principal_name').in('npsn', ['20202659', '20202645', '20202662', '20202655']);
  console.log(schools);

  console.log('\n--- SAMPEL CEK KOORDINATOR GUGUS DI SUPABASE BARU ---');
  const { data: gugus } = await supabase.from('gugus').select('id, name, koordinator');
  console.log(gugus);
}

fullAudit();
