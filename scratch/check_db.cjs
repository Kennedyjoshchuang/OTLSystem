require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function check() {
  try {
    const { data, error } = await supabase.from('employee_accounts').select('*').limit(1);
    if (error) {
      console.error('Error fetching employee_accounts:', error);
    } else {
      console.log('Record from employee_accounts:', data);
    }
  } catch (err) {
    console.error('Caught error:', err);
  }
}

check();
