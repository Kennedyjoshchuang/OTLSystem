const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'server', 'omega_trust.db'));
console.log(JSON.stringify(db.prepare("PRAGMA table_info(purchase_orders)").all(), null, 2));
db.close();
