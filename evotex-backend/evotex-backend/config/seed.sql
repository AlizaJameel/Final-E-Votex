-- Run after schema.sql and after generating bcrypt hashes via: npm run seed
-- Or use: node scripts/seed.js

USE evotex_db;

-- General Election 2026 (id=1 required by frontend GENERAL_ELECTION_ID)
INSERT INTO elections (id, title, description, start_date, end_date, status, vote_count)
VALUES (
  1,
  'General Election 2026',
  'General election for the country with the three main party candidates.',
  '2026-06-01 00:00:00',
  '2026-12-31 23:59:59',
  'active',
  95000
);

INSERT INTO candidates (election_id, name, party, party_code, symbol, vote_count) VALUES
(1, 'Imran Khan', 'Pakistan Tehreek-e-Insaf', 'PTI', 'Bat', 35000),
(1, 'Nawaz Sharif', 'Pakistan Muslim League', 'PML', 'Lion', 32000),
(1, 'Bilawal Bhutto', 'Pakistan Peoples Party', 'PPP', 'Arrow', 28000);
