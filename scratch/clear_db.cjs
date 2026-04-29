const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'omega_trust.db');
const db = new Database(dbPath);

const tables = [
  'customers',
  'prospects',
  'prospect_drafts',
  'quotations',
  'job_orders',
  'invoices',
  'receivables',
  'vendors',
  'purchase_orders',
  'salaries',
  'other_expenses'
];

db.exec('PRAGMA foreign_keys = OFF;');
db.transaction(() => {
  for (const table of tables) {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
      console.log(`Cleared table: ${table}`);
    } catch (err) {
      console.error(`Error clearing table ${table}:`, err.message);
    }
  }
})();
db.exec('PRAGMA foreign_keys = ON;');

console.log('Database data cleared successfully (except system_config).');
db.close();
