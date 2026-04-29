const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jlkmrmdfvfobvneqgjya.supabase.co',
  'sb_secret_CJ1q9Hdv4_k6aK8VdtReWA_zElr42NH'
);

async function probe() {
  const tables = ['invoices', 'job_orders', 'quotations', 'vendors', 'receivables', 'prospects', 'customers', 'salaries'];
  
  for (const table of tables) {
    // Try inserting minimal row with only 'id' to get error about what's missing 
    // Actually let's try selecting with a filter to get column list
    const { data, error } = await supabase.from(table).select('*').limit(0);
    
    // Try a describe-like approach - insert with bad data to get column info
    const { error: err2 } = await supabase.from(table).insert({ id: '__probe__', nonexistentcol: 'x' });
    
    if (err2) {
      console.log(`${table} error: ${err2.message}`);
    }
    
    // Try inserting with only 'id'
    const { error: err3 } = await supabase.from(table).insert({ id: '__probe__' });
    if (!err3) {
      // Get the row back to see columns
      const { data: row } = await supabase.from(table).select('*').eq('id', '__probe__').single();
      if (row) {
        console.log(`${table} columns:`, Object.keys(row));
        await supabase.from(table).delete().eq('id', '__probe__');
      }
    } else {
      console.log(`${table} insert-only-id error:`, err3.message);
    }
  }
}

probe();
