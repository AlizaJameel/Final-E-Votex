const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { formatUser } = require('../utils/helpers');

const RP_NAME = 'E-Votex';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';

const CREDENTIAL_LABELS = ['FINGERPRINT', 'FACE RECOGNITION'];

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function voterUserId(voterId) {
  return new TextEncoder().encode(String(voterId));
}

async function saveChallenge(userId, challenge, type) {
  await db.execute(
    'DELETE FROM webauthn_challenges WHERE user_id = ? AND type = ?',
    [userId, type]
  );
  await db.execute(
    'INSERT INTO webauthn_challenges (user_id, challenge, type) VALUES (?, ?, ?)',
    [userId, challenge, type]
  );
}

async function getLatestChallenge(userId, type) {
  const [rows] = await db.execute(
    'SELECT challenge FROM webauthn_challenges WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1',
    [userId, type]
  );
  return rows[0]?.challenge ?? null;
}

async function clearChallenge(userId, type) {
  await db.execute(
    'DELETE FROM webauthn_challenges WHERE user_id = ? AND type = ?',
    [userId, type]
  );
}

async function getVoterById(voterId) {
  const [rows] = await db.execute('SELECT * FROM voters WHERE id = ?', [voterId]);
  return rows[0] ?? null;
}

async function getVoterByEmail(email) {
  const [rows] = await db.execute('SELECT * FROM voters WHERE email = ?', [email]);
  return rows[0] ?? null;
}

/** GET /auth/webauthn/register/options — logged-in voter registers a passkey */
exports.getRegistrationOptions = async (req, res) => {
  try {
    const voterId = req.user.id;
    const voter = await getVoterById(voterId);
    if (!voter) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { label } = req.body;
    const displayLabel = CREDENTIAL_LABELS.includes(label) ? label : 'Biometric';

    // A voter enrolls two credentials (FINGERPRINT + FACE RECOGNITION) on the
    // SAME platform authenticator, so we intentionally do NOT exclude existing
    // credentials here — excluding them would block the second enrollment.
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: voter.email,
      userID: voterUserId(voterId),
      userDisplayName: `${voter.name} (${displayLabel})`,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
        authenticatorAttachment: 'platform',
      },
    });

    await saveChallenge(voterId, options.challenge, 'registration');
    res.json({ options });
  } catch (err) {
    console.error('WebAuthn register options error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** POST /auth/webauthn/register/verify */
exports.verifyRegistration = async (req, res) => {
  try {
    const voterId = req.user.id;
    const { label, credential: attestationResponse } = req.body;
    if (!CREDENTIAL_LABELS.includes(label)) {
      return res.status(400).json({
        success: false,
        message: "label must be 'FINGERPRINT' or 'FACE RECOGNITION'",
      });
    }
    if (!attestationResponse) {
      return res.status(400).json({ success: false, message: 'credential is required' });
    }

    const expectedChallenge = await getLatestChallenge(voterId, 'registration');

    if (!expectedChallenge) {
      return res.status(400).json({
        success: false,
        message: 'Challenge not found or expired. Try again.',
      });
    }

    const verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({
        success: false,
        message: 'Biometric registration failed. Please try again.',
      });
    }

    const { credential } = verification.registrationInfo;

    const [existingLabel] = await db.execute(
      'SELECT id FROM webauthn_credentials WHERE voter_id = ? AND label = ?',
      [voterId, label]
    );
    if (existingLabel.length) {
      return res.status(409).json({
        success: false,
        message: `${label} is already registered.`,
      });
    }

    const [sameCredential] = await db.execute(
      'SELECT label FROM webauthn_credentials WHERE voter_id = ? AND credential_id = ?',
      [voterId, credential.id]
    );

    // Mobile phones often reuse the same platform passkey for both labels.
    if (sameCredential.length) {
      console.log(`[WebAuthn] Reusing platform passkey for ${label} (same credential_id as ${sameCredential[0].label})`);
    }

    await db.execute(
      `INSERT INTO webauthn_credentials
       (voter_id, label, credential_id, public_key, counter, transports)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        voterId,
        label,
        credential.id,
        Buffer.from(credential.publicKey).toString('base64'),
        credential.counter,
        JSON.stringify(credential.transports || attestationResponse.response?.transports || []),
      ]
    );

    await db.execute('UPDATE voters SET biometric = 1 WHERE id = ?', [voterId]);
    await clearChallenge(voterId, 'registration');

    res.json({ success: true, message: `${label} registered successfully` });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This biometric credential is already registered.',
      });
    }
    console.error('WebAuthn verify registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during biometric registration' });
  }
};

/** GET /auth/webauthn/login/options?email= — unauthenticated biometric login */
exports.getLoginOptions = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const voter = await getVoterByEmail(email);
    if (!voter) {
      return res.status(404).json({ success: false, message: 'No account found for this email' });
    }

    const [credentials] = await db.execute(
      'SELECT credential_id, transports, public_key, face_d_hash FROM webauthn_credentials WHERE voter_id = ?',
      [voter.id]
    );

    const webauthnCreds = credentials.filter(
      (c) => c.public_key !== 'camera' && !c.face_d_hash && !String(c.credential_id).startsWith('face-cam:')
    );

    if (!webauthnCreds.length) {
      return res.status(400).json({
        success: false,
        message: 'No biometric registered for this account. Please register biometric first.',
      });
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'required',
      allowCredentials: webauthnCreds.map((c) => ({
        id: c.credential_id,
        transports: c.transports ? JSON.parse(c.transports) : undefined,
      })),
    });

    await saveChallenge(voter.id, options.challenge, 'authentication');
    res.json(options);
  } catch (err) {
    console.error('WebAuthn login options error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** POST /auth/webauthn/login/verify — returns JWT on success */
exports.verifyLogin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const voter = await getVoterByEmail(email);
    if (!voter) {
      return res.status(404).json({ success: false, message: 'No account found for this email' });
    }

    const expectedChallenge = await getLatestChallenge(voter.id, 'authentication');
    if (!expectedChallenge) {
      return res.status(400).json({
        success: false,
        message: 'Challenge expired. Please try again.',
      });
    }

    const [credRows] = await db.execute(
      'SELECT * FROM webauthn_credentials WHERE credential_id = ? AND voter_id = ?',
      [req.body.id, voter.id]
    );
    if (!credRows.length) {
      return res.status(400).json({ success: false, message: 'Biometric credential not found.' });
    }
    const stored = credRows[0];

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: stored.credential_id,
        publicKey: Buffer.from(stored.public_key, 'base64'),
        counter: stored.counter,
        transports: stored.transports ? JSON.parse(stored.transports) : [],
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return res.status(401).json({ success: false, message: 'Biometric verification failed.' });
    }

    await db.execute(
      'UPDATE webauthn_credentials SET counter = ? WHERE credential_id = ?',
      [verification.authenticationInfo.newCounter, req.body.id]
    );

    await clearChallenge(voter.id, 'authentication');

    const token = signToken({ id: voter.id, email: voter.email, role: 'voter' });
    res.json({
      success: true,
      token,
      role: 'voter',
      user: formatUser(voter),
    });
  } catch (err) {
    console.error('WebAuthn verify login error:', err);
    res.status(500).json({ success: false, message: 'Server error during biometric login' });
  }
};
