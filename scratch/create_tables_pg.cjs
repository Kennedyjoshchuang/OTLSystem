const { Pool } = require('pg');

// Supabase direct DB connection - use the connection pooler (port 6543)
// The password is the service_role secret key
const pool = new Pool({
  connectionString: 'postgresql://postgres.jlkmrmdfvfobvneqgjya:sb_secret_CJ1q9Hdv4_k6aK8VdtReWA_zElr42NH@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

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

async function run() {
  const client = await pool.connect();
  try {
    console.log('✅ Connected to Supabase PostgreSQL!');
    await client.query(sql);
    console.log('✅ All missing tables created successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();
