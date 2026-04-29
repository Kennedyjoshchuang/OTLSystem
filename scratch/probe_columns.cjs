const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jlkmrmdfvfobvneqgjya.supabase.co',
  'sb_secret_CJ1q9Hdv4_k6aK8VdtReWA_zElr42NH'
);

async function probe() {
  // Insert and immediately delete to see if columns are accepted
  const tests = [
    {
      table: 'invoices',
      row: { id: '__test__', joId: 'x', customerName: 'x', amount: 0, subtotal: 0, tax: 0, extra_charges: [], date: '2024-01-01', status: 'test' }
    },
    {
      table: 'job_orders',
      row: { id: '__test__', quotationId: 'x', customerName: 'x', instruction: 'x', status: 'test', quantity: 1, issueQuantity: 0, driverName: null, photos: [], costs: [], date: '2024-01-01' }
    },
    {
      table: 'quotations',
      row: { id: '__test__', customerId: 'x', customerName: 'x', date: '2024-01-01', status: 'test', items: [], total: 0 }
    },
    {
      table: 'vendors',
      row: { id: '__test__', name: 'test', phone: null, email: null, address: null, bankName: null, bankAccount: null, services: [], assets: [], date: '2024-01-01' }
    },
    {
      table: 'receivables',
      row: { id: '__test__', invoiceId: 'x', customerName: 'x', amount: 0, subtotal: 0, tax: 0, extra_charges: [], balance: 0, status: 'test' }
    }
  ];

  for (const { table, row } of tests) {
    const { error: insertErr } = await supabase.from(table).insert(row);
    if (insertErr) {
      console.log(`❌ ${table}: ${insertErr.message}`);
    } else {
      console.log(`✅ ${table}: columns OK`);
      await supabase.from(table).delete().eq('id', '__test__');
    }
  }
}

probe();
