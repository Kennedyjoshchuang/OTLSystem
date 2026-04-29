const Database = require('better-sqlite3');
const path = require('path');
const db = new Database('server/omega_trust.db');

const quoId = 'QUO-481559';

try {
  db.transaction(() => {
    // 1. Get all JOs linked to this quotation
    const jos = db.prepare('SELECT id FROM job_orders WHERE quotationId = ?').all(quoId);
    console.log(`Found ${jos.length} linked Job Orders.`);
    
    for (const jo of jos) {
      // 2. Get all Invoices linked to this JO
      const invoices = db.prepare('SELECT id FROM invoices WHERE joId = ?').all(jo.id);
      console.log(`- JO ${jo.id} has ${invoices.length} linked Invoices.`);
      
      for (const inv of invoices) {
        // 3. Delete related receivables
        db.prepare('DELETE FROM receivables WHERE invoiceId = ?').run(inv.id);
        // 4. Delete invoice
        db.prepare('DELETE FROM invoices WHERE id = ?').run(inv.id);
        console.log(`  - Deleted Invoice ${inv.id} and its receivables.`);
      }
      
      // 5. Delete job order
      db.prepare('DELETE FROM job_orders WHERE id = ?').run(jo.id);
      console.log(`- Deleted Job Order ${jo.id}.`);
    }
    
    // 6. Delete prospect drafts if any linked
    db.prepare('DELETE FROM prospect_drafts WHERE prospectId = ?').run(quoId);

    // 7. Finally delete the quotation
    const result = db.prepare('DELETE FROM quotations WHERE id = ?').run(quoId);
    
    if (result.changes > 0) {
      console.log(`Successfully deleted Quotation ${quoId}.`);
    } else {
      console.log(`Quotation ${quoId} not found.`);
    }
  })();
} catch (error) {
  console.error('Failed to delete quotation:', error);
}
