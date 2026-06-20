const db = require('../config/db');

async function insertAuditLog(action, executor = db) {
  await executor.execute('INSERT INTO audit_logs (action) VALUES (?)', [action]);
}

module.exports = { insertAuditLog };
