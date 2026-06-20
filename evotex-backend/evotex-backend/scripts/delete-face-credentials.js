require('dotenv').config();
const db = require('../config/db');

async function main() {
  const [result] = await db.execute(
    "DELETE FROM webauthn_credentials WHERE device_type = 'face'"
  );
  console.log('Deleted face credentials:', result.affectedRows);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
