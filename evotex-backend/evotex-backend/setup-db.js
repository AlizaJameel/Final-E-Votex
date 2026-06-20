require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'evotex';

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_NAME, table, column]
  );
  return rows[0].c > 0;
}

async function addColumn(conn, table, column, definition) {
  if (!(await columnExists(conn, table, column))) {
    await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`  + ${table}.${column}`);
  }
}

async function tableExists(conn, table) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [DB_NAME, table]
  );
  return rows[0].c > 0;
}

async function ensureSchema(conn) {
  console.log('Ensuring schema...');

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS voters (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      cnic VARCHAR(20) DEFAULT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL DEFAULT 'Admin',
      email VARCHAR(180) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS elections (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(220) NOT NULL,
      description TEXT,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      status ENUM('draft','upcoming','active','ended') NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      election_id INT UNSIGNED NOT NULL,
      name VARCHAR(220) NOT NULL,
      party VARCHAR(120) DEFAULT NULL,
      photo_url VARCHAR(500) DEFAULT NULL,
      symbol VARCHAR(120) DEFAULT NULL,
      vote_count INT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS votes (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      voter_id INT UNSIGNED NOT NULL,
      election_id INT UNSIGNED NOT NULL,
      candidate_id INT UNSIGNED NOT NULL,
      cnic VARCHAR(20) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_voter_election (voter_id, election_id)
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      recipient_role ENUM('voter','admin') NOT NULL DEFAULT 'voter',
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      category VARCHAR(80) DEFAULT NULL,
      read_flag TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS admin_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('info','warning','success','danger') DEFAULT 'info',
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      read_status TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      key_name VARCHAR(120) NOT NULL UNIQUE,
      value TEXT NOT NULL
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      action VARCHAR(200) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      subject VARCHAR(200),
      message TEXT NOT NULL,
      status ENUM('open','closed') DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      voter_id INT UNSIGNED NOT NULL,
      credential_id VARCHAR(500) NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter BIGINT DEFAULT 0,
      transports TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (!(await tableExists(conn, 'webauthn_challenges'))) {
    await conn.execute(`
      CREATE TABLE webauthn_challenges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        challenge VARCHAR(500) NOT NULL,
        type ENUM('registration','authentication') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  + created webauthn_challenges');
  } else if (
    (await columnExists(conn, 'webauthn_challenges', 'voter_id')) &&
    !(await columnExists(conn, 'webauthn_challenges', 'user_id'))
  ) {
    await conn.execute(
      'ALTER TABLE webauthn_challenges CHANGE voter_id user_id INT NOT NULL'
    );
    console.log('  ~ webauthn_challenges.voter_id renamed to user_id');
  }

  await addColumn(conn, 'voters', 'phone', "VARCHAR(20) DEFAULT ''");
  await addColumn(conn, 'voters', 'biometric', 'TINYINT(1) DEFAULT 0');
  await addColumn(conn, 'voters', 'votes_cast', 'INT UNSIGNED DEFAULT 0');
  await addColumn(conn, 'voters', 'cnic_verified', 'TINYINT(1) NOT NULL DEFAULT 0');

  await addColumn(conn, 'webauthn_credentials', 'device_type', "VARCHAR(50) NOT NULL DEFAULT ''");
  await addColumn(conn, 'webauthn_credentials', 'face_d_hash', 'VARCHAR(64) DEFAULT NULL');
  await addColumn(conn, 'webauthn_challenges', 'purpose', 'VARCHAR(50) DEFAULT NULL');

  // Enforce one CNIC per voter (best-effort; skip if duplicates already exist).
  try {
    const [idx] = await conn.execute(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voters' AND INDEX_NAME = 'unique_voter_cnic'`,
      [DB_NAME]
    );
    if (idx[0].c === 0) {
      await conn.execute('ALTER TABLE voters ADD UNIQUE KEY unique_voter_cnic (cnic)');
      console.log('  + voters.unique_voter_cnic');
    }
  } catch (e) {
    console.log('  ! skipped unique CNIC index (duplicate CNICs exist):', e.message);
  }

  // Normalize voters.status to the canonical value set used app-wide:
  // 'pending' | 'approved' | 'rejected'. (Legacy installs used 'verified'.)
  await conn.execute(
    "ALTER TABLE voters MODIFY status VARCHAR(20) NOT NULL DEFAULT 'pending'"
  );
  await conn.execute("UPDATE voters SET status = 'approved' WHERE status = 'verified'");

  // Migrate legacy username-based admins table to email-based auth.
  if (await columnExists(conn, 'admins', 'username')) {
    await addColumn(conn, 'admins', 'name', "VARCHAR(120) NOT NULL DEFAULT 'Admin'");
    await addColumn(conn, 'admins', 'email', 'VARCHAR(180) DEFAULT NULL');
    await conn.execute('ALTER TABLE admins MODIFY username VARCHAR(80) NULL');
  }

  await addColumn(conn, 'elections', 'vote_count', 'INT UNSIGNED DEFAULT 0');
  await addColumn(conn, 'elections', 'created_by', 'INT UNSIGNED DEFAULT NULL');

  await addColumn(conn, 'candidates', 'party_code', "VARCHAR(20) DEFAULT ''");

  await addColumn(conn, 'notifications', 'voter_id', 'INT UNSIGNED DEFAULT NULL');
  await addColumn(conn, 'notifications', 'type', "VARCHAR(50) DEFAULT 'system'");
  await addColumn(conn, 'notifications', 'read_status', 'TINYINT(1) DEFAULT 0');

  console.log('Schema ready.');
}

async function seedData(conn) {
  console.log('Seeding data...');

  const adminHash = await bcrypt.hash('admin123', 12);
  const ADMIN_EMAIL = 'admin@evotex.com';
  const hasUsername = await columnExists(conn, 'admins', 'username');
  const [admins] = await conn.execute('SELECT id FROM admins WHERE email = ?', [ADMIN_EMAIL]);
  if (!admins.length) {
    if (hasUsername) {
      await conn.execute(
        'INSERT INTO admins (username, name, email, password_hash) VALUES (?, ?, ?, ?)',
        ['admin', 'Admin', ADMIN_EMAIL, adminHash]
      );
    } else {
      await conn.execute(
        'INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)',
        ['Admin', ADMIN_EMAIL, adminHash]
      );
    }
    console.log(`  + admin (email: ${ADMIN_EMAIL}, password: admin123)`);
  } else {
    await conn.execute('UPDATE admins SET password_hash = ? WHERE email = ?', [adminHash, ADMIN_EMAIL]);
    console.log('  ~ admin password reset to admin123');
  }

  const [elections] = await conn.execute('SELECT id FROM elections WHERE title = ?', ['General Election 2026']);
  if (!elections.length) {
    const [result] = await conn.execute(
      `INSERT INTO elections (title, description, start_date, end_date, status, vote_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'General Election 2026',
        'General election for the country with the three main party candidates.',
        '2026-06-01 00:00:00',
        '2026-12-31 23:59:59',
        'active',
        95000,
      ]
    );
    const electionId = result.insertId;

    await conn.execute(
      `INSERT INTO candidates (election_id, name, party, party_code, symbol, vote_count) VALUES
       (?, 'Imran Khan', 'Pakistan Tehreek-e-Insaf', 'PTI', 'Bat', 35000),
       (?, 'Nawaz Sharif', 'Pakistan Muslim League', 'PML', 'Lion', 32000),
       (?, 'Bilawal Bhutto', 'Pakistan Peoples Party', 'PPP', 'Arrow', 28000)`,
      [electionId, electionId, electionId]
    );
    console.log(`  + General Election 2026 (id=${electionId}) with 3 candidates`);
  } else {
    console.log('  ~ General Election 2026 already exists');
  }

  const defaultSettings = [
    ['siteName', 'E-Votex'],
    ['adminEmail', 'admin@evotex.com'],
    ['emailNotifications', 'true'],
    ['voteConfirmationAlerts', 'true'],
    ['notifyOnVote', 'true'],
    ['notifyOnResult', 'true'],
    ['allowBiometric', 'true'],
  ];

  for (const [key, value] of defaultSettings) {
    await conn.execute(
      'INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = value',
      [key, value]
    );
  }
  console.log('  ~ default settings ensured');

  console.log('Seed complete.');
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: DB_NAME,
    multipleStatements: true,
  });

  try {
    await ensureSchema(conn);
    await seedData(conn);
    console.log('\nDatabase setup finished successfully.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
