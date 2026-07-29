const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function checkTable(tableName) {
  try {
    const { data, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table ${tableName}: Error - ${error.message}`);
    } else {
      console.log(`Table ${tableName}: ${data ? data.length : '0'} rows (No RLS error on select)`);
      // Since head: true doesn't return data length, we need a normal select
      const res = await supabase.from(tableName).select('*');
      console.log(`Table ${tableName}: ${res.data ? res.data.length : 0} rows found`);
    }
  } catch (err) {
    console.log(`Table ${tableName}: Exception - ${err.message}`);
  }
}

async function run() {
  console.log('Checking Supabase tables data...');
  const tables = ['schools', 'gugus', 'supervisors', 'categories', 'app_settings', 'announcements'];
  for (const t of tables) {
    await checkTable(t);
  }
}

run();
