# E-Votex Backend

Node.js + Express + MySQL API for the E-Votex secure online voting application.

## Tech Stack

- Node.js, Express.js
- MySQL (mysql2)
- JWT + bcryptjs authentication
- Nodemailer (Gmail SMTP)
- @simplewebauthn/server (FIDO2/WebAuthn biometrics)

## First-time Setup

### 1. Install dependencies

```bash
cd evotex-backend
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and set your MySQL credentials and Gmail app password:

```bash
cp .env.example .env
```

### 3. Create database and tables

```bash
mysql -u root -p < config/schema.sql
```

### 4. Seed admin, demo voter, and election data

```bash
node scripts/seed.js
```

Or create admin manually:

```bash
node -e "
  const b = require('bcryptjs');
  const mysql = require('mysql2/promise');
  require('dotenv').config();
  async function createAdmin() {
    const hash = await b.hash('admin123', 12);
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    await conn.execute(
      'INSERT INTO users (name, email, password, role, status) VALUES (?,?,?,?,?)',
      ['Admin', 'admin@evotex.com', hash, 'admin', 'verified']
    );
    console.log('Admin created: admin@evotex.com / admin123');
    conn.end();
  }
  createAdmin();
"
```

### 5. Start the server

```bash
npm run dev
```

API runs at `http://localhost:5000`.

## Default Credentials


| Role  | Username/Email     | Password      |
| ----- | ------------------ | ------------- |
| Admin | `admin`            | `admin123`    |
| Voter | `ahmed@evotex.com` | `password123` |


## API Endpoints


| Method  | Endpoint                          | Description                    |
| ------- | --------------------------------- | ------------------------------ |
| POST    | `/auth/register`                  | Register voter                 |
| POST    | `/auth/login`                     | Voter login                    |
| POST    | `/auth/admin/login`               | Admin login (`username` field) |
| GET     | `/auth/me`                        | Current user profile           |
| PUT     | `/auth/profile`                   | Update name/CNIC               |
| GET     | `/elections`                      | List elections                 |
| GET     | `/elections/:id`                  | Election with candidates       |
| GET     | `/elections/:id/results`          | Live results                   |
| POST    | `/votes`                          | Cast vote                      |
| GET     | `/notifications`                  | Voter notifications            |
| GET     | `/admin/elections`                | Admin election list            |
| POST    | `/admin/elections`                | Create election                |
| PUT     | `/admin/elections/:id`            | Update election                |
| DELETE  | `/admin/elections/:id`            | Delete election                |
| GET     | `/admin/voters`                   | List voters                    |
| PUT     | `/admin/voters/:id/status`        | Verify/reject voter            |
| GET     | `/admin/notifications`            | Admin notifications            |
| GET/PUT | `/admin/settings`                 | Site settings                  |
| GET     | `/auth/webauthn/register/options` | WebAuthn registration          |
| POST    | `/auth/webauthn/register/verify`  | Verify biometric registration  |
| GET     | `/auth/webauthn/login/options`    | WebAuthn authentication        |
| POST    | `/auth/webauthn/login/verify`     | Verify biometric login         |


## Frontend Connection

When ready to connect the React frontend, replace the mock in `src/api.ts` with axios pointing to `http://localhost:5000`. Install `@simplewebauthn/browser` on the frontend for real biometric verification in VotingPage.

## WebAuthn Notes

- `RP_ID` is `localhost` (change for production)
- `ORIGIN` is `http://localhost:5173` (Vite dev server)
- Fingerprint and face recognition use the device's built-in biometric via WebAuthn

