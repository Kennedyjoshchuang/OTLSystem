const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'server', 'omega_trust.db'));

console.log("--- JOB ORDERS ---");
const jos = db.prepare("SELECT id, customerName, instruction FROM job_orders").all();
jos.forEach(jo => {
    if (!jo.id || !jo.customerName) {
        console.log("NULL FOUND in JO:", jo);
    }
});
console.log(`Checked ${jos.length} JOs`);

console.log("\n--- INVOICES ---");
const invs = db.prepare("SELECT id, customerName FROM invoices").all();
invs.forEach(inv => {
    if (!inv.id || !inv.customerName) {
        console.log("NULL FOUND in Invoice:", inv);
    }
});
console.log(`Checked ${invs.length} Invoices`);

db.close();
