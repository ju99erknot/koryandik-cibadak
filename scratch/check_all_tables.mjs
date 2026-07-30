import { createClient } from '@supabase/supabase-js';

const oldUrl = 'https://jcliulngbpekpcjalhby.supabase.co';
const oldServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjbGl1bG5nYnBla3BjamFsaGJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY1MDY1NywiZXhwIjoyMDk4MjI2NjU3fQ.CMiU7diCgQhbBzko4hjROLImrb2DJPwMfMXAwRQfIqA';

const newUrl = 'https://bjitnvgbwamiusredsvu.supabase.co';
const newServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqaXRudmdid2FtaXVzcmVkc3Z1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTM5MjAwOSwiZXhwIjoyMTAwOTY4MDA5fQ.IUBvsXX-Qiv5NTZlWHRUuSmTHVZfg0BB5q9gIhteTEw';

const oldClient = createClient(oldUrl, oldServiceKey);
const newClient = createClient(newUrl, newServiceKey);

const ALL_POSSIBLE_TABLES = [
  'schools',
  'gugus',
  'supervisors',
  'supervisor_credentials',
  'gugus_credentials',
  'categories',
  'submissions',
  'audit_logs',
  'app_settings',
  'announcements',
  'notifications',
  'supervision_notes',
  'lk_bosp_submissions',
  'lk_bosp_breakdown',
  'school_facilities',
  'school_achievements'
];

async function compareTables() {
  console.log('===========================================================');
  console.log('PERBANDINGAN 100% SEMUA TABEL: SUPABASE LAMA VS SUPABASE BARU');
  console.log('===========================================================\n');

  console.log(
    'TABEL'.padEnd(25) +
    'JUMLAH (LAMA)'.padEnd(20) +
    'JUMLAH (BARU)'.padEnd(20) +
    'STATUS'
  );
  console.log('-'.repeat(75));

  let totalOldRows = 0;
  let totalNewRows = 0;

  for (const table of ALL_POSSIBLE_TABLES) {
    let oldCount = 0;
    let newCount = 0;

    try {
      const { data: oldData } = await oldClient.from(table).select('*');
      if (oldData) oldCount = oldData.length;
    } catch {}

    try {
      const { data: newData } = await newClient.from(table).select('*');
      if (newData) newCount = newData.length;
    } catch {}

    totalOldRows += oldCount;
    totalNewRows += newCount;

    const status = oldCount === newCount ? '✅ PERFECT MATCH' : '⚠️ MISMATCH';
    console.log(
      table.padEnd(25) +
      `${oldCount} baris`.padEnd(20) +
      `${newCount} baris`.padEnd(20) +
      status
    );
  }

  console.log('-'.repeat(75));
  console.log(`TOTAL TOTAL BARIS DATA: Lama = ${totalOldRows} | Baru = ${totalNewRows}`);
  console.log('===========================================================');
}

compareTables();
