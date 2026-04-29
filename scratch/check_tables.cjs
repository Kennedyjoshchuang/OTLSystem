const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jlkmrmdfvfobvneqgjya.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_CJ1q9Hdv4_k6aK8VdtReWA_zElr42NH';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const tables = [
  'customers', 'prospects', 'prospect_drafts', 'quotations', 'job_orders',
  'invoices', 'receivables', 'vendors', 'purchase_orders', 'system_config',
  'salaries', 'other_expenses'
];

async function checkTables() {
  console.log('📋 Checking which tables exist in Supabase...\n');
  const missing = [];
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(0);
    if (error) {
      console.log(`❌ ${table} - MISSING (${error.message})`);
      missing.push(table);
    } else {
      console.log(`✅ ${table} - EXISTS`);
    }
  }
  
  if (missing.length > 0) {
    console.log(`\n⚠️  Missing tables: ${missing.join(', ')}`);
    console.log('Run the SQL schema in Supabase SQL Editor to create them.');
  } else {
    console.log('\n🎉 All tables exist!');
  }
}

checkTables();
