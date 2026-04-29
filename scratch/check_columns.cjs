const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jlkmrmdfvfobvneqgjya.supabase.co',
  'sb_secret_CJ1q9Hdv4_k6aK8VdtReWA_zElr42NH'
);

async function checkColumns() {
  const tables = ['customers', 'prospects', 'quotations', 'job_orders', 'invoices', 'receivables', 'vendors', 'salaries'];
  
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`${t}: ERROR - ${error.message}`);
    } else {
      const cols = data.length > 0 ? Object.keys(data[0]) : '(empty table)';
      console.log(`${t}: ${JSON.stringify(cols)}`);
    }
  }
}
checkColumns();
