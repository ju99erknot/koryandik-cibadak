'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function DebugSupabasePage() {
  const [logs, setLogs] = useState<string[]>([]);

  const log = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    async function runTests() {
      log('=== SUPABASE DEBUG FROM BROWSER ===');

      // 1. Check env vars
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      log(`NEXT_PUBLIC_SUPABASE_URL = "${url}"`);
      log(`NEXT_PUBLIC_SUPABASE_ANON_KEY = "${key ? key.substring(0, 20) + '...' + key.substring(key.length - 10) : 'UNDEFINED'}"`);
      log(`Key length = ${key?.length || 0}`);

      if (!url || url.includes('placeholder')) {
        log('❌ SUPABASE URL IS PLACEHOLDER OR MISSING! This is the root cause.');
        return;
      }
      if (!key || key === 'placeholder-key') {
        log('❌ SUPABASE KEY IS PLACEHOLDER OR MISSING! This is the root cause.');
        return;
      }

      log('✅ Env vars look valid');

      // 2. Test SELECT from schools
      log('--- TEST: SELECT schools (limit 3) ---');
      const { data: schools, error: schoolErr } = await supabase.from('schools').select('npsn, name').limit(3);
      if (schoolErr) {
        log(`❌ SELECT schools ERROR: ${JSON.stringify(schoolErr)}`);
      } else {
        log(`✅ SELECT schools OK: ${JSON.stringify(schools)}`);
      }

      // 3. Test SELECT from gallery
      log('--- TEST: SELECT gallery ---');
      const { data: gallery, error: galErr } = await supabase.from('gallery').select('*');
      if (galErr) {
        log(`❌ SELECT gallery ERROR: ${JSON.stringify(galErr)}`);
      } else {
        log(`✅ SELECT gallery OK: ${gallery?.length || 0} rows`);
      }

      // 4. Test INSERT into gallery
      const testId = 'browser-debug-' + Date.now();
      log(`--- TEST: INSERT gallery (id=${testId}) ---`);
      const { data: insertData, error: insertErr } = await supabase
        .from('gallery')
        .insert({
          id: testId,
          title: 'Browser Debug Test',
          image_url: 'https://example.com/debug.jpg',
          category: 'Lainnya',
          date: '2026-07-26',
          school_npsn: '20202659',
        })
        .select();

      if (insertErr) {
        log(`❌ INSERT gallery ERROR: ${JSON.stringify(insertErr)}`);
        log(`Error code: ${insertErr.code}`);
        log(`Error message: ${insertErr.message}`);
        log(`Error details: ${insertErr.details}`);
        log(`Error hint: ${insertErr.hint}`);
      } else {
        log(`✅ INSERT gallery OK: ${JSON.stringify(insertData)}`);
        // Cleanup
        log('--- CLEANUP: deleting test row ---');
        const { error: delErr } = await supabase.from('gallery').delete().eq('id', testId);
        if (delErr) {
          log(`⚠️ DELETE cleanup error: ${JSON.stringify(delErr)}`);
        } else {
          log('✅ DELETE cleanup OK');
        }
      }

      log('=== DEBUG COMPLETE ===');
    }

    runTests();
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', background: '#0a0a0a', color: '#22c55e', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '20px', color: '#f59e0b' }}>🔍 Supabase Browser Debug</h1>
      <div style={{ background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #333' }}>
        {logs.length === 0 && <p style={{ color: '#666' }}>Running tests...</p>}
        {logs.map((line, i) => (
          <div key={i} style={{
            padding: '4px 0',
            color: line.includes('❌') ? '#ef4444' : line.includes('✅') ? '#22c55e' : line.includes('⚠️') ? '#f59e0b' : '#a3a3a3',
            fontSize: '13px',
            lineHeight: 1.6,
            borderBottom: '1px solid #1a1a1a',
            wordBreak: 'break-all' as const,
          }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
