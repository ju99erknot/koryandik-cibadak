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
const key = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(url, key);

async function printAllData() {
  console.log('==================================================');
  console.log('FULL INSPECTION OF SUPABASE URL:', url);
  console.log('==================================================\n');

  console.log('--- 1. TABEL SCHOOLS ---');
  const { data: schools } = await supabase.from('schools').select('*');
  if (schools) {
    console.log(`Total Sekolah: ${schools.length}`);
    schools.forEach(s => {
      console.log(`NPSN: ${s.npsn} | Nama: ${s.name} | Operator: ${s.operator_name || '-'} | KS: ${s.principal_name || '-'}`);
    });
  }

  console.log('\n--- 2. TABEL SUPERVISORS ---');
  const { data: supervisors } = await supabase.from('supervisors').select('*');
  if (supervisors) {
    console.log(`Total Supervisors: ${supervisors.length}`);
    supervisors.forEach(sup => {
      console.log(`ID: ${sup.id} | Role: ${sup.role} | Nama: ${sup.name} | Title: ${sup.title}`);
    });
  }

  console.log('\n--- 3. TABEL GUGUS ---');
  const { data: gugus } = await supabase.from('gugus').select('*');
  if (gugus) {
    console.log(`Total Gugus: ${gugus.length}`);
    gugus.forEach(g => {
      console.log(`ID: ${g.id} | Nama: ${g.name} | Koordinator: ${g.koordinator || '-'}`);
    });
  }
}

printAllData();
