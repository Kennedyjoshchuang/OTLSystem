const express = require('express');
const cors = require('cors');
const db = require('./db.cjs');
const app = express();
const PORT = process.env.PORT || 5000;

// --- AUTO MIGRATION (Ensure columns exist) ---
const migrateColumn = (table, col, type = "TEXT") => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type};`);
    console.log(`Migrated: ${table}.${col}`);
  } catch (e) {
    // Column likely already exists
  }
};

migrateColumn("prospects", "pic");
migrateColumn("prospects", "notes");
migrateColumn("prospects", "marketingName");
migrateColumn("prospects", "marketingPhone");
migrateColumn("prospects", "marketingEmail");
migrateColumn("prospects", "companyAddress");

migrateColumn("quotations", "pic");
migrateColumn("quotations", "generalNotes");
migrateColumn("quotations", "marketingName");
migrateColumn("quotations", "marketingPhone");
migrateColumn("quotations", "marketingEmail");
migrateColumn("quotations", "validFrom");
migrateColumn("quotations", "validTo");
migrateColumn("quotations", "companyAddress");

migrateColumn("job_orders", "costs");
migrateColumn("job_orders", "driverName");
migrateColumn("job_orders", "quoteValidity");
migrateColumn("job_orders", "phone");
migrateColumn("job_orders", "email");
migrateColumn("job_orders", "rate", "REAL");

migrateColumn("purchase_orders", "quoteValidity");
migrateColumn("purchase_orders", "vendorInvoicePhoto");
migrateColumn("purchase_orders", "paymentProofPhoto");
migrateColumn("purchase_orders", "paidDate");
migrateColumn("purchase_orders", "notes");

migrateColumn("invoices", "extra_charges");
migrateColumn("receivables", "extra_charges");
migrateColumn("vendors", "bankAccount");

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Higher limit for photos

// --- API ENDPOINTS ---

// Customers
app.get('/api/customers', (req, res) => {
  const rows = db.prepare('SELECT * FROM customers').all();
  res.json(rows);
});

app.post('/api/customers', (req, res) => {
  const { id, name, phone, email, address } = req.body;
  const stmt = db.prepare('INSERT INTO customers (id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, name, phone, email, address);
  res.status(201).json({ id });
});

app.delete('/api/customers/:id', (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

// Prospects
app.get('/api/prospects', (req, res) => {
  const rows = db.prepare('SELECT * FROM prospects').all();
  res.json(rows);
});

app.post('/api/prospects', (req, res) => {
  const { id, name, phone, email, address, pic, notes, description, marketingName, marketingPhone, marketingEmail, companyAddress, date, status } = req.body;
  const stmt = db.prepare('INSERT INTO prospects (id, name, phone, email, address, pic, notes, description, marketingName, marketingPhone, marketingEmail, companyAddress, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, name, phone, email, address, pic, notes, description, marketingName, marketingPhone, marketingEmail, companyAddress, date, status);
  res.status(201).json({ id });
});

app.put('/api/prospects/:id', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE prospects SET status = ? WHERE id = ?').run(status, req.params.id);
  res.sendStatus(200);
});

app.delete('/api/prospects/:id', (req, res) => {
  db.prepare('DELETE FROM prospects WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

// Quotations
app.get('/api/quotations', (req, res) => {
  const rows = db.prepare('SELECT * FROM quotations').all();
  res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items) })));
});

app.post('/api/quotations', (req, res) => {
  try {
    const { id, customerId, customerName, pic, generalNotes, date, status, items, total, marketingName, marketingPhone, marketingEmail, validFrom, validTo, companyAddress } = req.body;
    db.prepare('INSERT INTO quotations (id, customerId, customerName, pic, generalNotes, date, status, items, total, marketingName, marketingPhone, marketingEmail, validFrom, validTo, companyAddress) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, customerId, customerName, pic, generalNotes, date, status, JSON.stringify(items || []), total, marketingName, marketingPhone, marketingEmail, validFrom, validTo, companyAddress);
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create Quotation Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/quotations/:id/approve', (req, res) => {
  db.prepare("UPDATE quotations SET status = 'approved' WHERE id = ?").run(req.params.id);
  res.sendStatus(200);
});

app.put('/api/quotations/:id/unapprove', (req, res) => {
  db.prepare("UPDATE quotations SET status = 'pending' WHERE id = ?").run(req.params.id);
  res.sendStatus(200);
});

app.delete('/api/quotations/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.transaction(() => {
      const jos = db.prepare('SELECT id FROM job_orders WHERE quotationId = ?').all(id);
      for (const jo of jos) {
        const invoices = db.prepare('SELECT id FROM invoices WHERE joId = ?').all(jo.id);
        for (const inv of invoices) {
          db.prepare('DELETE FROM receivables WHERE invoiceId = ?').run(inv.id);
          db.prepare('DELETE FROM invoices WHERE id = ?').run(inv.id);
        }
        db.prepare('DELETE FROM job_orders WHERE id = ?').run(jo.id);
      }
      db.prepare('DELETE FROM prospect_drafts WHERE prospectId = ?').run(id);
      db.prepare('DELETE FROM quotations WHERE id = ?').run(id);
    })();
    res.sendStatus(204);
  } catch (error) {
    console.error('Failed to delete quotation cascade:', error);
    res.status(500).json({ error: 'Failed to delete quotation and its related data', message: error.message });
  }
});

// Job Orders
app.get('/api/job-orders', (req, res) => {
  const rows = db.prepare('SELECT * FROM job_orders').all();
  res.json(rows.map(r => ({ ...r, photos: JSON.parse(r.photos || '[]'), costs: JSON.parse(r.costs || '[]') })));
});

app.post('/api/job-orders', (req, res) => {
  try {
    const { quotationId, customerName, jobDescription, phone, email, rate, quantity, quoteValidity } = req.body;
    const id = 'JO-' + Date.now();
    const date = new Date().toISOString().split('T')[0];
    
    db.prepare(`
      INSERT INTO job_orders (id, quotationId, customerName, instruction, status, quantity, issueQuantity, phone, email, rate, quoteValidity, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, quotationId, customerName, jobDescription, 'pending', quantity, 0, phone, email, rate, quoteValidity, date);
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create JO Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/job-orders/:id', (req, res) => {
  const updates = req.body;
  const keys = Object.keys(updates);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (k === 'photos' || k === 'costs') ? JSON.stringify(updates[k]) : updates[k]);
  
  const stmt = db.prepare(`UPDATE job_orders SET ${sets} WHERE id = ?`);
  stmt.run(...values, req.params.id);
  res.sendStatus(200);
});

app.delete('/api/job-orders/:id', (req, res) => {
  db.prepare('DELETE FROM job_orders WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

// Invoices & Receivables
app.get('/api/invoices', (req, res) => {
  const rows = db.prepare('SELECT * FROM invoices').all();
  res.json(rows.map(r => ({ ...r, extra_charges: JSON.parse(r.extra_charges || '[]') })));
});

app.post('/api/invoices', (req, res) => {
  const { id, joId, customerName, amount, subtotal, tax, extra_charges, date, status } = req.body;
  const stmt = db.prepare('INSERT INTO invoices (id, joId, customerName, amount, subtotal, tax, extra_charges, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, joId, customerName, amount, subtotal, tax, JSON.stringify(extra_charges || []), date, status);
  
  // Also create receivable
  const recStmt = db.prepare('INSERT INTO receivables (id, invoiceId, customerName, amount, subtotal, tax, extra_charges, balance, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  recStmt.run(id, id, customerName, amount, subtotal, tax, JSON.stringify(extra_charges || []), amount, 'unpaid');
  
  res.status(201).json({ id });
});

app.put('/api/invoices/:id', (req, res) => {
  const updates = req.body;
  const keys = Object.keys(updates);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (k === 'extra_charges') ? JSON.stringify(updates[k]) : updates[k]);
  
  const stmt = db.prepare(`UPDATE invoices SET ${sets} WHERE id = ?`);
  stmt.run(...values, req.params.id);

  // Sync with receivables if exists
  try {
    const recStmt = db.prepare(`UPDATE receivables SET ${sets}, balance = ? WHERE id = ?`);
    recStmt.run(...values, updates.amount || 0, req.params.id);
  } catch (e) {}

  res.sendStatus(200);
});

app.put('/api/invoices/:id/settle', (req, res) => {
  db.prepare('UPDATE invoices SET status = "paid" WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM receivables WHERE invoiceId = ?').run(req.params.id);
  res.sendStatus(200);
});

app.get('/api/receivables', (req, res) => {
  const rows = db.prepare('SELECT * FROM receivables').all();
  res.json(rows);
});

app.delete('/api/invoices/:id', (req, res) => {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM receivables WHERE invoiceId = ?').run(req.params.id);
  res.sendStatus(204);
});

// Vendors (Procurement)
app.get('/api/vendors', (req, res) => {
  const rows = db.prepare('SELECT * FROM vendors').all();
  res.json(rows.map(r => ({ ...r, services: JSON.parse(r.services || '[]'), assets: JSON.parse(r.assets || '[]') })));
});
app.post('/api/vendors', (req, res) => {
  const { id, name, phone, email, address, bankName, bankAccount, services, assets, date } = req.body;
  db.prepare('INSERT INTO vendors (id, name, phone, email, address, bankName, bankAccount, services, assets, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, name, phone, email, address, bankName, bankAccount, JSON.stringify(services || []), JSON.stringify(assets || []), date);
  res.status(201).json({ id });
});
app.put('/api/vendors/:id', (req, res) => {
  const { name, phone, email, address, bankName, bankAccount, services, assets } = req.body;
  db.prepare('UPDATE vendors SET name=?, phone=?, email=?, address=?, bankName=?, bankAccount=?, services=?, assets=? WHERE id=?')
    .run(name, phone, email, address, bankName, bankAccount, JSON.stringify(services || []), JSON.stringify(assets || []), req.params.id);
  res.sendStatus(200);
});
app.delete('/api/vendors/:id', (req, res) => {
  db.prepare('DELETE FROM vendors WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

// Purchase Orders
app.get('/api/purchase-orders', (req, res) => {
  const rows = db.prepare('SELECT * FROM purchase_orders ORDER BY date DESC').all();
  res.json(rows.map(r => ({ 
    ...r, 
    items: JSON.parse(r.items || '[]'),
    vendorInvoicePhoto: JSON.parse(r.vendorInvoicePhoto || '[]'),
    paymentProofPhoto: JSON.parse(r.paymentProofPhoto || '[]')
  })));
});

app.post('/api/purchase-orders', (req, res) => {
  try {
    console.log('POST /api/purchase-orders body:', JSON.stringify(req.body, null, 2));
    const { 
      joId, customerName, jobInstruction, vendorId, vendorName, 
      items, grandTotal, status, validFrom, validTo, quoteValidity, notes 
    } = req.body;
    
    const id = 'PO-' + Date.now();
    const date = new Date().toISOString().split('T')[0];
    
    db.prepare(`
      INSERT INTO purchase_orders (
        id, joId, customerName, jobInstruction, vendorId, vendorName, 
        items, grandTotal, status, validFrom, validTo, quoteValidity, date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, joId, customerName, jobInstruction, vendorId, vendorName, 
      JSON.stringify(items), grandTotal, status || 'draft', validFrom, validTo, quoteValidity, date, notes
    );
    const fullPO = { 
      id, joId, customerName, jobInstruction, vendorId, vendorName, 
      items, grandTotal, status: status || 'draft', validFrom, validTo, quoteValidity, date, notes 
    };
    res.status(201).json(fullPO);
  } catch (err) {
    console.error('Create PO Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/purchase-orders/:id/issue', (req, res) => {
  try {
    db.prepare("UPDATE purchase_orders SET status = 'issued' WHERE id = ?").run(req.params.id);
    res.sendStatus(200);
  } catch (err) {
    console.error('Issue PO Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/purchase-orders/:id', (req, res) => {
  try {
    const updates = req.body;
    const keys = Object.keys(updates);
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (k === 'items' || k === 'vendorInvoicePhoto' || k === 'paymentProofPhoto') ? JSON.stringify(updates[k]) : updates[k]);
    
    const stmt = db.prepare(`UPDATE purchase_orders SET ${sets} WHERE id = ?`);
    stmt.run(...values, req.params.id);
    res.sendStatus(200);
  } catch (err) {
    console.error('Update PO Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/purchase-orders/:id', (req, res) => {
  db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

// Salaries
app.get('/api/salaries', (req, res) => {
  const rows = db.prepare('SELECT * FROM salaries').all();
  res.json(rows.map(r => ({ ...r, taxes: JSON.parse(r.taxes || '[]') })));
});

app.post('/api/salaries', (req, res) => {
  const { id, name, position, bankAccount, bankName, baseSalary, period, nik, npwp, taxes, proofPhoto, expenseDate, totalToPay, date } = req.body;
  db.prepare('INSERT INTO salaries (id, name, position, bankAccount, bankName, baseSalary, period, nik, npwp, taxes, proofPhoto, expenseDate, totalToPay, date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, name, position, bankAccount, bankName, baseSalary, period, nik, npwp, JSON.stringify(taxes || []), proofPhoto, expenseDate, totalToPay, date);
  res.status(201).json({ id });
});

app.delete('/api/salaries/:id', (req, res) => {
  db.prepare('DELETE FROM salaries WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

// Other Expenses
app.get('/api/other-expenses', (req, res) => {
  const rows = db.prepare('SELECT * FROM other_expenses').all();
  res.json(rows.map(r => ({ ...r, taxes: JSON.parse(r.taxes || '[]') })));
});

app.post('/api/other-expenses', (req, res) => {
  const { id, employeeName, position, bankAccount, bankName, amount, description, taxes, proofPhoto, expenseDate, totalAfterTax, date } = req.body;
  db.prepare('INSERT INTO other_expenses (id, employeeName, position, bankAccount, bankName, amount, description, taxes, proofPhoto, expenseDate, totalAfterTax, date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, employeeName, position, bankAccount, bankName, amount, description, JSON.stringify(taxes || []), proofPhoto, expenseDate, totalAfterTax, date);
  res.status(201).json({ id });
});

app.delete('/api/other-expenses/:id', (req, res) => {
  db.prepare('DELETE FROM other_expenses WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

// System Control
app.get('/api/system/config', (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM system_config WHERE id = 'global_config'").get();
    res.json(row || {});
  } catch (err) {
    console.error('System Config Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/system/config', (req, res) => {
  const { otpKey, otpUpdatedAt } = req.body;
  const stmt = db.prepare('INSERT OR REPLACE INTO system_config (id, otpKey, otpUpdatedAt) VALUES (?, ?, ?)');
  stmt.run('global_config', otpKey, otpUpdatedAt);
  res.sendStatus(200);
});

app.post('/api/system/clear', (req, res) => {
  db.exec('DELETE FROM customers; DELETE FROM prospects; DELETE FROM prospect_drafts; DELETE FROM quotations; DELETE FROM job_orders; DELETE FROM invoices; DELETE FROM receivables;');
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
