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

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('Testing upsert on app_settings...');
    const testKey = 'test_key_temp';
    const testValue = { hello: 'world' };
    
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({ key: testKey, value: testValue, description: 'Test RLS policy' })
      .select();
      
    if (error) {
      console.error('❌ UPSERT FAILED:', error);
      console.log('Reason:', error.message);
    } else {
      console.log('✅ UPSERT SUCCESSFUL!', data);
      
      // Clean up
      console.log('Cleaning up test key...');
      await supabase.from('app_settings').delete().eq('key', testKey);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
