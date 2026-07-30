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

async function inspect() {
  console.log('--- INSPECTING CURRENT SUPABASE DATABASE ---');
  console.log('URL:', url);

  const { data: schools } = await supabase.from('schools').select('npsn, name, operator_name, principal_name').limit(5);
  console.log('\n[Sample Schools in Supabase]:');
  console.log(schools);

  const { data: supervisors } = await supabase.from('supervisors').select('*');
  console.log('\n[Supervisors in Supabase]:');
  console.log(supervisors);

  const { data: settings } = await supabase.from('app_settings').select('key');
  console.log('\n[App Settings Keys]:', settings ? settings.map(s => s.key) : []);
}

inspect();
