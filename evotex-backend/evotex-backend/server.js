require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const electionRoutes = require('./routes/electionRoutes');
const voteRoutes = require('./routes/voteRoutes');
const resultRoutes = require('./routes/resultRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const supportRoutes = require('./routes/supportRoutes');
const webauthnRoutes = require('./routes/webauthnRoutes');
const userRoutes = require('./routes/userRoutes');
const biometricRoutes = require('./routes/biometricRoutes');

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://evotex.bintysafdar.com')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

app.get('/', (req, res) => res.json({ message: 'E-Votex API Running ✅' }));

app.use('/auth', authRoutes);
app.use('/auth/webauthn', webauthnRoutes);
app.use('/elections', electionRoutes);
app.use('/votes', voteRoutes);
app.use('/results', resultRoutes);
app.use('/notifications', notificationRoutes);
app.use('/admin', adminRoutes);
app.use('/support', supportRoutes);
app.use('/user', userRoutes);
app.use('/biometric', biometricRoutes);
app.use('/api/biometric', biometricRoutes);

const PORT = process.env.PORT || 5000;

// Serve HTTPS when cert + key are present (needed so an HTTPS frontend can call
// the API without mixed-content blocking). Otherwise fall back to HTTP.
function resolveTls() {
  const keyPath = process.env.SSL_KEY_PATH;
  const certPath = process.env.SSL_CERT_PATH;
  if (!keyPath || !certPath) return null;
  const key = path.resolve(__dirname, keyPath);
  const cert = path.resolve(__dirname, certPath);
  if (!fs.existsSync(key) || !fs.existsSync(cert)) return null;
  return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
}

// Log the effective WebAuthn config so it's easy to confirm it matches the
// host the phone is using (passkeys are bound to this RP ID at enrollment).
console.log('[WebAuthn] RP_ID  =', process.env.WEBAUTHN_RP_ID || 'localhost');
console.log('[WebAuthn] ORIGIN =', process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173');

const tls = resolveTls();
const server = tls
  ? https.createServer(tls, app).listen(PORT, '0.0.0.0', () =>
      console.log(`E-Votex backend running on HTTPS port ${PORT}`))
  : app.listen(PORT, '0.0.0.0', () =>
      console.log(`E-Votex backend running on HTTP port ${PORT}`));

process.on('uncaughtException', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('Port in use, retrying...');
    setTimeout(() => { server.listen(PORT, '0.0.0.0'); }, 1000);
  }
});
