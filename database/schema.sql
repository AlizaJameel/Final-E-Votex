-- E-Votex - Secure Online Voting System
-- MySQL schema (mysql2). Run with: mysql -u root -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS evotex;
USE evotex;

-- Legacy table from an older design. Dropped so `voters` is the single source
-- of truth. (FK-dependent tables are recreated below.)
DROP TABLE IF EXISTS users;

-- Voters / users of the system. The `status` column serves as BOTH the
-- verification state and the role: 'pending' | 'approved' | 'rejected' | 'admin'.
CREATE TABLE IF NOT EXISTS voters (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Elections created/managed by an admin.
CREATE TABLE IF NOT EXISTS elections (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  start_date  DATETIME NOT NULL,
  end_date    DATETIME NOT NULL,
  status      ENUM('upcoming', 'active', 'ended') DEFAULT 'upcoming',
  created_by  INT,
  vote_count INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES voters(id) ON DELETE SET NULL
);

-- Candidates belonging to an election.
CREATE TABLE IF NOT EXISTS candidates (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  name        VARCHAR(100) NOT NULL,
  party       VARCHAR(150) DEFAULT '',
  symbol      VARCHAR(100) DEFAULT '',
  photo_url   VARCHAR(500) DEFAULT '',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
);

-- Votes. One vote per voter per election is enforced by a unique key.
CREATE TABLE IF NOT EXISTS votes (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  voter_id     INT NOT NULL,
  election_id  INT NOT NULL,
  candidate_id INT NOT NULL,
  cast_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY one_vote_per_election (voter_id, election_id),
  FOREIGN KEY (voter_id)     REFERENCES voters(id)     ON DELETE CASCADE,
  FOREIGN KEY (election_id)  REFERENCES elections(id)  ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- Helpful indexes for result aggregation and lookups.
CREATE INDEX idx_votes_election   ON votes (election_id);
CREATE INDEX idx_votes_candidate  ON votes (candidate_id);
CREATE INDEX idx_voters_status    ON voters (status);
CREATE INDEX idx_elections_status ON elections (status);

-- Default admin account.
-- NOTE: `password_hash` below is a PLACEHOLDER literal. Replace it with a real
-- bcrypt hash (e.g. bcrypt of 'admin123') before using in any real environment.
INSERT INTO voters (name, email, password_hash, status)
VALUES ('Admin', 'admin@evotex.com', 'hashed_admin123', 'admin');
