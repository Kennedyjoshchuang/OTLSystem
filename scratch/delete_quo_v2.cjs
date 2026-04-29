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
      // 2. Delete linked Purchase Orders (Hutang)
      const pos = db.prepare('SELECT id FROM purchase_orders WHERE joId = ?').all(jo.id);
      for (const po of pos) {
          db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(po.id);
          console.log(`  - Deleted PO ${po.id}`);
      }

      // 3. Get all Invoices linked to this JO
      const invoices = db.prepare('SELECT id FROM invoices WHERE joId = ?').all(jo.id);
      console.log(`- JO ${jo.id} has ${invoices.length} linked Invoices.`);
      
      for (const inv of invoices) {
        // 4. Delete related receivables
        db.prepare('DELETE FROM receivables WHERE invoiceId = ?').run(inv.id);
        // 5. Delete invoice
        db.prepare('DELETE FROM invoices WHERE id = ?').run(inv.id);
        console.log(`  - Deleted Invoice ${inv.id} and its receivables.`);
      }
      
      // 6. Delete job order
      db.prepare('DELETE FROM job_orders WHERE id = ?').run(jo.id);
      console.log(`- Deleted Job Order ${jo.id}.`);
    }
    
    // 7. Delete prospect drafts if any linked
    db.prepare('DELETE FROM prospect_drafts WHERE prospectId = ?').run(quoId);

    // 8. Finally delete the quotation
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
