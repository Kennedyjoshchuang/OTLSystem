const Database = require('better-sqlite3');
const path = require('path');
const db = new Database('server/omega_trust.db');

try {
  const tableInfo = db.prepare("PRAGMA table_info(system_config)").all();
  console.log("Table system_config:", tableInfo);
  const row = db.prepare('SELECT * FROM system_config WHERE id = "global_config"').get();
  console.log("Current config:", row);
} catch (err) {
  console.error("Error checking table:", err);
}
