const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://jlkmrmdfvfobvneqgjya.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_CJ1q9Hdv4_k6aK8VdtReWA_zElr42NH';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Run the full schema as individual CREATE TABLE statements
const statements = [
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS prospects (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT,
    pic TEXT, notes TEXT, description TEXT, "marketingName" TEXT, "marketingPhone" TEXT,
    "marketingEmail" TEXT, "companyAddress" TEXT, date TEXT, status TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS prospect_drafts (
    id TEXT PRIMARY KEY, "prospectId" TEXT, "customerName" TEXT,
    address TEXT, description TEXT, date TEXT, status TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY, "customerId" TEXT, "customerName" TEXT, pic TEXT,
    "generalNotes" TEXT, date TEXT, status TEXT, items JSONB DEFAULT '[]'::jsonb,
    total NUMERIC, "marketingName" TEXT, "marketingPhone" TEXT, "marketingEmail" TEXT,
    "validFrom" TEXT, "validTo" TEXT, "companyAddress" TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS job_orders (
    id TEXT PRIMARY KEY, "quotationId" TEXT, "customerName" TEXT, instruction TEXT,
    status TEXT, quantity INTEGER, "issueQuantity" INTEGER DEFAULT 0,
    "containerNo" TEXT, "vehicleNo" TEXT, "driverName" TEXT, "activityStatus" TEXT,
    photos JSONB DEFAULT '[]'::jsonb, costs JSONB DEFAULT '[]'::jsonb,
    "quoteValidity" TEXT, date TEXT, phone TEXT, email TEXT, rate NUMERIC
  )`,
  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY, "joId" TEXT, "customerName" TEXT, amount NUMERIC,
    subtotal NUMERIC, tax NUMERIC, extra_charges JSONB DEFAULT '[]'::jsonb,
    date TEXT, status TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS receivables (
    id TEXT PRIMARY KEY, "invoiceId" TEXT, "customerName" TEXT, amount NUMERIC,
    subtotal NUMERIC, tax NUMERIC, extra_charges JSONB DEFAULT '[]'::jsonb,
    balance NUMERIC, status TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT,
    "bankName" TEXT, "bankAccount" TEXT,
    services JSONB DEFAULT '[]'::jsonb, assets JSONB DEFAULT '[]'::jsonb, date TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY, "joId" TEXT, "customerName" TEXT, "jobInstruction" TEXT,
    "vendorId" TEXT, "vendorName" TEXT, items JSONB DEFAULT '[]'::jsonb,
    "grandTotal" NUMERIC, status TEXT, date TEXT, "validFrom" TEXT, "validTo" TEXT,
    "quoteValidity" TEXT, "vendorInvoicePhoto" JSONB DEFAULT '[]'::jsonb,
    "paymentProofPhoto" JSONB DEFAULT '[]'::jsonb, "paidDate" TEXT, notes TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY, "otpKey" TEXT, "otpUpdatedAt" TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS salaries (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, position TEXT, "bankAccount" TEXT,
    "bankName" TEXT, "baseSalary" NUMERIC, period TEXT, nik TEXT, npwp TEXT,
    taxes JSONB DEFAULT '[]'::jsonb, "proofPhoto" TEXT, "expenseDate" TEXT,
    "totalToPay" NUMERIC, date TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS other_expenses (
    id TEXT PRIMARY KEY, "employeeName" TEXT, position TEXT, "bankAccount" TEXT,
    "bankName" TEXT, amount NUMERIC, description TEXT,
    taxes JSONB DEFAULT '[]'::jsonb, "proofPhoto" TEXT, "expenseDate" TEXT,
    "totalAfterTax" NUMERIC, date TEXT
  )`
];

async function runSchema() {
  console.log('🔨 Running schema creation...\n');
  
  for (const sql of statements) {
    const tableName = sql.match(/TABLE IF NOT EXISTS (\w+)/)[1];
    const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: null }));
    
    // Use raw fetch to the SQL endpoint instead
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    });
    
    // Try inserting then selecting to check if table exists
    const checkResult = await supabase.from(tableName).select('id').limit(0);
    if (checkResult.error) {
      console.log(`❌ Table ${tableName} doesn't exist yet - need to create via SQL Editor`);
    } else {
      console.log(`✅ Table ${tableName} - OK`);
    }
  }
}

runSchema();
