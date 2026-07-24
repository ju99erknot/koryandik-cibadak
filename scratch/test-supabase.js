const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
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

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

console.log('Testing connection to Supabase...');
console.log('URL:', supabaseUrl);

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('\n--- Checking app_settings table ---');
    const { data, error } = await supabase.from('app_settings').select('*');
    if (error) {
      console.error('Supabase Error while querying app_settings:', error);
      if (error.code === 'P0001' || error.message.includes('relation "app_settings" does not exist')) {
        console.log('❌ TABLE DOES NOT EXIST IN DATABASE! Please run the SQL migration.');
      }
    } else {
      console.log('✅ TABLE EXISTS!');
      console.log(`Found ${data.length} records.`);
      console.log('Data keys:', data.map(r => r.key));
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
