const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jlkmrmdfvfobvneqgjya.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'sb_secret_CJ1q9Hdv4_k6aK8VdtReWA_zElr42NH';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Helper to send supabase errors
const handleError = (res, error, context = '') => {
  console.error(`Error ${context}:`, error.message);
  res.status(500).json({ error: error.message });
};

// --- CUSTOMERS ---
app.get('/api/customers', async (req, res) => {
  const { data, error } = await supabase.from('customers').select('*');
  if (error) return handleError(res, error, 'GET customers');
  res.json(data);
});

app.post('/api/customers', async (req, res) => {
  const { id, name, phone, email, address } = req.body;
  const { error } = await supabase.from('customers').insert({ id, name, phone, email, address });
  if (error) return handleError(res, error, 'POST customers');
  res.status(201).json({ id });
});

app.delete('/api/customers/:id', async (req, res) => {
  const { error } = await supabase.from('customers').delete().eq('id', req.params.id);
  if (error) return handleError(res, error, 'DELETE customers');
  res.sendStatus(204);
});

// --- PROSPECTS ---
app.get('/api/prospects', async (req, res) => {
  const { data, error } = await supabase.from('prospects').select('*');
  if (error) return handleError(res, error, 'GET prospects');
  res.json(data);
});

app.post('/api/prospects', async (req, res) => {
  const { id, name, phone, email, address, pic, notes, description, marketingName, marketingPhone, marketingEmail, companyAddress, date, status } = req.body;
  const { error } = await supabase.from('prospects').insert({
    id, name, phone, email, address, pic, notes, description,
    marketingName, marketingPhone, marketingEmail, companyAddress, date, status
  });
  if (error) return handleError(res, error, 'POST prospects');
  res.status(201).json({ id });
});

app.put('/api/prospects/:id', async (req, res) => {
  const updates = req.body;
  const { error } = await supabase.from('prospects').update(updates).eq('id', req.params.id);
  if (error) return handleError(res, error, 'PUT prospects');
  res.sendStatus(200);
});

app.delete('/api/prospects/:id', async (req, res) => {
  const { error } = await supabase.from('prospects').delete().eq('id', req.params.id);
  if (error) return handleError(res, error, 'DELETE prospects');
  res.sendStatus(204);
});

// --- QUOTATIONS ---
app.get('/api/quotations', async (req, res) => {
  const { data, error } = await supabase.from('quotations').select('*');
  if (error) return handleError(res, error, 'GET quotations');
  res.json(data);
});

app.post('/api/quotations', async (req, res) => {
  try {
    const { id, customerId, customerName, pic, generalNotes, date, status, items, total, marketingName, marketingPhone, marketingEmail, validFrom, validTo, companyAddress } = req.body;
    const { error } = await supabase.from('quotations').insert({
      id, customerId, customerName, pic, generalNotes, date, status,
      items: items || [], total, marketingName, marketingPhone, marketingEmail,
      validFrom, validTo, companyAddress
    });
    if (error) return handleError(res, error, 'POST quotations');
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create Quotation Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/quotations/:id/approve', async (req, res) => {
  const { error } = await supabase.from('quotations').update({ status: 'approved' }).eq('id', req.params.id);
  if (error) return handleError(res, error, 'approve quotation');
  res.sendStatus(200);
});

app.put('/api/quotations/:id/unapprove', async (req, res) => {
  const { error } = await supabase.from('quotations').update({ status: 'pending' }).eq('id', req.params.id);
  if (error) return handleError(res, error, 'unapprove quotation');
  res.sendStatus(200);
});

app.delete('/api/quotations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Get related job orders
    const { data: jos } = await supabase.from('job_orders').select('id').eq('quotationId', id);
    for (const jo of (jos || [])) {
      // Get invoices for this JO
      const { data: invs } = await supabase.from('invoices').select('id').eq('joId', jo.id);
      for (const inv of (invs || [])) {
        await supabase.from('receivables').delete().eq('invoiceId', inv.id);
        await supabase.from('invoices').delete().eq('id', inv.id);
      }
      await supabase.from('purchase_orders').delete().eq('joId', jo.id);
      await supabase.from('job_orders').delete().eq('id', jo.id);
    }
    await supabase.from('prospect_drafts').delete().eq('prospectId', id);
    const { error } = await supabase.from('quotations').delete().eq('id', id);
    if (error) return handleError(res, error, 'DELETE quotation');
    res.sendStatus(204);
  } catch (error) {
    console.error('Failed to delete quotation cascade:', error);
    res.status(500).json({ error: 'Failed to delete quotation and its related data', message: error.message });
  }
});

// --- JOB ORDERS ---
app.get('/api/job-orders', async (req, res) => {
  const { data, error } = await supabase.from('job_orders').select('*');
  if (error) return handleError(res, error, 'GET job_orders');
  res.json(data);
});

app.post('/api/job-orders', async (req, res) => {
  try {
    const { quotationId, customerName, jobDescription, phone, email, rate, quantity, quoteValidity } = req.body;
    const id = 'JO-' + Date.now();
    const date = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('job_orders').insert({
      id, quotationId, customerName, instruction: jobDescription,
      status: 'pending', quantity, issueQuantity: 0,
      phone, email, rate, quoteValidity, date,
      photos: [], costs: []
    });
    if (error) return handleError(res, error, 'POST job_orders');
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create JO Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/job-orders/:id', async (req, res) => {
  const updates = req.body;
  const { error } = await supabase.from('job_orders').update(updates).eq('id', req.params.id);
  if (error) return handleError(res, error, 'PUT job_orders');
  res.sendStatus(200);
});

app.delete('/api/job-orders/:id', async (req, res) => {
  const { error } = await supabase.from('job_orders').delete().eq('id', req.params.id);
  if (error) return handleError(res, error, 'DELETE job_orders');
  res.sendStatus(204);
});

// --- INVOICES ---
app.get('/api/invoices', async (req, res) => {
  const { data, error } = await supabase.from('invoices').select('*');
  if (error) return handleError(res, error, 'GET invoices');
  res.json(data);
});

app.post('/api/invoices', async (req, res) => {
  const { id, joId, customerName, amount, subtotal, tax, extra_charges, date, status } = req.body;
  const { error: invErr } = await supabase.from('invoices').insert({
    id, joId, customerName, amount, subtotal, tax,
    extra_charges: extra_charges || [], date, status
  });
  if (invErr) return handleError(res, invErr, 'POST invoices');

  // Also create receivable
  const { error: recErr } = await supabase.from('receivables').insert({
    id, invoiceId: id, customerName, amount, subtotal, tax,
    extra_charges: extra_charges || [], balance: amount, status: 'unpaid'
  });
  if (recErr) console.error('Failed to create receivable:', recErr.message);

  res.status(201).json({ id });
});

app.put('/api/invoices/:id', async (req, res) => {
  const updates = req.body;
  const { error } = await supabase.from('invoices').update(updates).eq('id', req.params.id);
  if (error) return handleError(res, error, 'PUT invoices');

  // Sync receivables
  const { amount, ...recUpdates } = updates;
  await supabase.from('receivables').update({ ...recUpdates, balance: amount || 0 }).eq('id', req.params.id);
  res.sendStatus(200);
});

app.put('/api/invoices/:id/settle', async (req, res) => {
  await supabase.from('invoices').update({ status: 'paid' }).eq('id', req.params.id);
  await supabase.from('receivables').delete().eq('invoiceId', req.params.id);
  res.sendStatus(200);
});

app.delete('/api/invoices/:id', async (req, res) => {
  await supabase.from('receivables').delete().eq('invoiceId', req.params.id);
  const { error } = await supabase.from('invoices').delete().eq('id', req.params.id);
  if (error) return handleError(res, error, 'DELETE invoices');
  res.sendStatus(204);
});

// --- RECEIVABLES ---
app.get('/api/receivables', async (req, res) => {
  const { data, error } = await supabase.from('receivables').select('*');
  if (error) return handleError(res, error, 'GET receivables');
  res.json(data);
});

// --- VENDORS ---
app.get('/api/vendors', async (req, res) => {
  const { data, error } = await supabase.from('vendors').select('*');
  if (error) return handleError(res, error, 'GET vendors');
  res.json(data);
});

app.post('/api/vendors', async (req, res) => {
  const { id, name, phone, email, address, bankName, bankAccount, services, assets, date } = req.body;
  const { error } = await supabase.from('vendors').insert({
    id, name, phone, email, address, bankName, bankAccount,
    services: services || [], assets: assets || [], date
  });
  if (error) return handleError(res, error, 'POST vendors');
  res.status(201).json({ id });
});

app.put('/api/vendors/:id', async (req, res) => {
  const { name, phone, email, address, bankName, bankAccount, services, assets } = req.body;
  const { error } = await supabase.from('vendors').update({
    name, phone, email, address, bankName, bankAccount,
    services: services || [], assets: assets || []
  }).eq('id', req.params.id);
  if (error) return handleError(res, error, 'PUT vendors');
  res.sendStatus(200);
});

app.delete('/api/vendors/:id', async (req, res) => {
  const { error } = await supabase.from('vendors').delete().eq('id', req.params.id);
  if (error) return handleError(res, error, 'DELETE vendors');
  res.sendStatus(204);
});

// --- PURCHASE ORDERS ---
app.get('/api/purchase-orders', async (req, res) => {
  const { data, error } = await supabase.from('purchase_orders').select('*').order('date', { ascending: false });
  if (error) return handleError(res, error, 'GET purchase_orders');
  res.json(data);
});

app.post('/api/purchase-orders', async (req, res) => {
  try {
    const { joId, customerName, jobInstruction, vendorId, vendorName, items, grandTotal, status, validFrom, validTo, quoteValidity, notes } = req.body;
    const id = 'PO-' + Date.now();
    const date = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('purchase_orders').insert({
      id, joId, customerName, jobInstruction, vendorId, vendorName,
      items: items || [], grandTotal, status: status || 'draft',
      validFrom, validTo, quoteValidity, date, notes,
      vendorInvoicePhoto: [], paymentProofPhoto: []
    });
    if (error) return handleError(res, error, 'POST purchase_orders');
    const fullPO = { id, joId, customerName, jobInstruction, vendorId, vendorName, items, grandTotal, status: status || 'draft', validFrom, validTo, quoteValidity, date, notes };
    res.status(201).json(fullPO);
  } catch (err) {
    console.error('Create PO Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/purchase-orders/:id/issue', async (req, res) => {
  const { error } = await supabase.from('purchase_orders').update({ status: 'issued' }).eq('id', req.params.id);
  if (error) return handleError(res, error, 'issue purchase_order');
  res.sendStatus(200);
});

app.put('/api/purchase-orders/:id', async (req, res) => {
  try {
    const updates = req.body;
    const { error } = await supabase.from('purchase_orders').update(updates).eq('id', req.params.id);
    if (error) return handleError(res, error, 'PUT purchase_orders');
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/purchase-orders/:id', async (req, res) => {
  const { error } = await supabase.from('purchase_orders').delete().eq('id', req.params.id);
  if (error) return handleError(res, error, 'DELETE purchase_orders');
  res.sendStatus(204);
});

// --- SALARIES ---
app.get('/api/salaries', async (req, res) => {
  const { data, error } = await supabase.from('salaries').select('*');
  if (error) return handleError(res, error, 'GET salaries');
  res.json(data);
});

app.post('/api/salaries', async (req, res) => {
  const { id, name, position, bankAccount, bankName, baseSalary, period, nik, npwp, taxes, proofPhoto, expenseDate, totalToPay, date } = req.body;
  const { error } = await supabase.from('salaries').insert({
    id, name, position, bankAccount, bankName, baseSalary, period,
    nik, npwp, taxes: taxes || [], proofPhoto, expenseDate, totalToPay, date
  });
  if (error) return handleError(res, error, 'POST salaries');
  res.status(201).json({ id });
});

app.delete('/api/salaries/:id', async (req, res) => {
  const { error } = await supabase.from('salaries').delete().eq('id', req.params.id);
  if (error) return handleError(res, error, 'DELETE salaries');
  res.sendStatus(204);
});

// --- OTHER EXPENSES ---
app.get('/api/other-expenses', async (req, res) => {
  const { data, error } = await supabase.from('other_expenses').select('*');
  if (error) return handleError(res, error, 'GET other_expenses');
  res.json(data);
});

app.post('/api/other-expenses', async (req, res) => {
  const { id, employeeName, position, bankAccount, bankName, amount, description, taxes, proofPhoto, expenseDate, totalAfterTax, date } = req.body;
  const { error } = await supabase.from('other_expenses').insert({
    id, employeeName, position, bankAccount, bankName, amount,
    description, taxes: taxes || [], proofPhoto, expenseDate, totalAfterTax, date
  });
  if (error) return handleError(res, error, 'POST other_expenses');
  res.status(201).json({ id });
});

app.delete('/api/other-expenses/:id', async (req, res) => {
  const { error } = await supabase.from('other_expenses').delete().eq('id', req.params.id);
  if (error) return handleError(res, error, 'DELETE other_expenses');
  res.sendStatus(204);
});

// --- SYSTEM CONFIG ---
app.get('/api/system/config', async (req, res) => {
  try {
    const { data, error } = await supabase.from('system_config').select('*').eq('id', 'global_config').single();
    if (error && error.code !== 'PGRST116') return handleError(res, error, 'GET system_config');
    res.json(data || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/system/config', async (req, res) => {
  const { otpKey, otpUpdatedAt } = req.body;
  const { error } = await supabase.from('system_config').upsert({ id: 'global_config', otpKey, otpUpdatedAt });
  if (error) return handleError(res, error, 'POST system_config');
  res.sendStatus(200);
});

app.post('/api/system/clear', async (req, res) => {
  await supabase.from('receivables').delete().neq('id', '');
  await supabase.from('invoices').delete().neq('id', '');
  await supabase.from('purchase_orders').delete().neq('id', '');
  await supabase.from('job_orders').delete().neq('id', '');
  await supabase.from('prospect_drafts').delete().neq('id', '');
  await supabase.from('quotations').delete().neq('id', '');
  await supabase.from('prospects').delete().neq('id', '');
  await supabase.from('customers').delete().neq('id', '');
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} (Supabase backend)`);
});
