require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seed() {
  // Admins are seeded separately (admins table) via `node setup-db.js`.
  // This script only seeds voter + election demo data.
  const voterHash = await bcrypt.hash('password123', 12);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evotex_db',
    multipleStatements: true,
  });

  try {
    const [voters] = await conn.execute(
      "SELECT id FROM voters WHERE email = 'ahmed@evotex.com'"
    );
    if (!voters.length) {
      await conn.execute(
        'INSERT INTO voters (name, email, password_hash, status) VALUES (?,?,?,?)',
        ['Ahmed Khan', 'ahmed@evotex.com', voterHash, 'approved']
      );
      console.log('Demo voter created: ahmed@evotex.com / password123');
    }

    const [elections] = await conn.execute('SELECT id FROM elections WHERE id = 1');
    if (!elections.length) {
      await conn.execute(
        `INSERT INTO elections (id, title, description, start_date, end_date, status, vote_count)
         VALUES (?,?,?,?,?,?,?)`,
        [
          1,
          'General Election 2026',
          'General election for the country with the three main party candidates.',
          '2026-06-01 00:00:00',
          '2026-12-31 23:59:59',
          'active',
          95000,
        ]
      );

      await conn.execute(
        `INSERT INTO candidates (election_id, name, party, party_code, symbol, vote_count) VALUES
         (1, 'Imran Khan', 'Pakistan Tehreek-e-Insaf', 'PTI', 'Bat', 35000),
         (1, 'Nawaz Sharif', 'Pakistan Muslim League', 'PML', 'Lion', 32000),
         (1, 'Bilawal Bhutto', 'Pakistan Peoples Party', 'PPP', 'Arrow', 28000)`
      );
      console.log('Seed election id=1 with 3 candidates created');
    }

    console.log('Seed complete.');
  } finally {
    await conn.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
