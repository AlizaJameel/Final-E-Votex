CREATE DATABASE IF NOT EXISTS evotex_db;
USE evotex_db;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('voter', 'admin') DEFAULT 'voter',
  cnic VARCHAR(20) DEFAULT '',
  phone VARCHAR(20) DEFAULT '',
  status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  biometric BOOLEAN DEFAULT FALSE,
  votes_cast INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE elections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  status ENUM('upcoming', 'active', 'ended') DEFAULT 'upcoming',
  vote_count INT DEFAULT 0,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  party VARCHAR(150) DEFAULT '',
  party_code VARCHAR(20) DEFAULT '',
  photo_url VARCHAR(500) DEFAULT '',
  symbol VARCHAR(100) DEFAULT '',
  vote_count INT DEFAULT 0,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
);

CREATE TABLE votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  voter_id INT NOT NULL,
  election_id INT NOT NULL,
  candidate_id INT NOT NULL,
  cnic VARCHAR(20) NOT NULL,
  cast_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY one_vote_per_election (voter_id, election_id),
  FOREIGN KEY (voter_id) REFERENCES users(id),
  FOREIGN KEY (election_id) REFERENCES elections(id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  type ENUM('election', 'vote', 'result', 'reminder', 'system') DEFAULT 'system',
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE admin_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('info', 'warning', 'success', 'danger') DEFAULT 'info',
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webauthn_credentials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  credential_id VARCHAR(500) NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  device_type VARCHAR(100) DEFAULT '',
  backed_up BOOLEAN DEFAULT FALSE,
  transports TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE webauthn_challenges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  challenge VARCHAR(500) NOT NULL,
  type ENUM('registration', 'authentication') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
