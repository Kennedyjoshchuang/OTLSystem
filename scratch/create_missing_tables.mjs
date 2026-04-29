// Creates missing Supabase tables via Management API
// Tables needed: prospect_drafts, purchase_orders, system_config, other_expenses

const SUPABASE_URL = 'https://jlkmrmdfvfobvneqgjya.supabase.co';
const SERVICE_KEY = 'sb_secret_CJ1q9Hdv4_k6aK8VdtReWA_zElr42NH';
// Project ref is the subdomain part
const PROJECT_REF = 'jlkmrmdfvfobvneqgjya';

const sql = `
CREATE TABLE IF NOT EXISTS prospect_drafts (
    id TEXT PRIMARY KEY,
    "prospectId" TEXT,
    "customerName" TEXT,
    address TEXT,
    description TEXT,
    date TEXT,
    status TEXT
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    "joId" TEXT,
    "customerName" TEXT,
    "jobInstruction" TEXT,
    "vendorId" TEXT,
    "vendorName" TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    "grandTotal" NUMERIC,
    status TEXT,
    date TEXT,
    "validFrom" TEXT,
    "validTo" TEXT,
    "quoteValidity" TEXT,
    "vendorInvoicePhoto" JSONB DEFAULT '[]'::jsonb,
    "paymentProofPhoto" JSONB DEFAULT '[]'::jsonb,
    "paidDate" TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY,
    "otpKey" TEXT,
    "otpUpdatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS other_expenses (
    id TEXT PRIMARY KEY,
    "employeeName" TEXT,
    position TEXT,
    "bankAccount" TEXT,
    "bankName" TEXT,
    amount NUMERIC,
    description TEXT,
    taxes JSONB DEFAULT '[]'::jsonb,
    "proofPhoto" TEXT,
    "expenseDate" TEXT,
    "totalAfterTax" NUMERIC,
    date TEXT
);
`;

async function createTables() {
  console.log('🔨 Creating missing tables via Supabase Management API...\n');
  
  // Try via the Management API SQL endpoint
  const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  const text = await resp.text();
  console.log('Status:', resp.status);
  console.log('Response:', text);
  
  if (resp.status === 200 || resp.status === 201) {
    console.log('\n✅ Tables created successfully!');
  } else {
    // Try PostgreSQL REST endpoint
    console.log('\nTrying alternative endpoint...');
    const resp2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    });
    console.log('Alt Status:', resp2.status);
    console.log('Alt Response:', await resp2.text());
  }
}

createTables().catch(console.error);
