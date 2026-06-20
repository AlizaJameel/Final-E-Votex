const jwt = require('jsonwebtoken');
const db = require('../config/db');
const {
  getCredentialByLabel,
  findCredentialByAssertionId,
  buildAssertionOptionsForVoter,
  verifyAssertionAgainst,
} = require('../utils/webauthnHelpers');

const STEP_TTL = '2m';
const FINGERPRINT = 'FINGERPRINT';
const FACE = 'FACE RECOGNITION';

// Short-lived chained tokens. Each step issues a signed token proving the
// previous step(s) succeeded; the final `session_token` authorizes the vote.
function signStep(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: STEP_TTL });
}

function verifyStep(token, expectedStep, voterId) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.stepup !== expectedStep || Number(decoded.id) !== Number(voterId)) {
    throw new Error('Invalid step token');
  }
  return decoded;
}

/** GET /auth/webauthn/stepup/status — which labeled credentials are enrolled */
exports.stepupStatus = async (req, res) => {
  try {
    const voterId = req.user.id;
    const [rows] = await db.execute(
      'SELECT label FROM webauthn_credentials WHERE voter_id = ?',
      [voterId]
    );
    const labels = rows.map((r) => r.label);
    const fingerprint = labels.includes(FINGERPRINT);
    const [faceDeviceRows] = await db.execute(
      `SELECT 1 FROM webauthn_credentials
       WHERE voter_id = ? AND device_type = 'face' LIMIT 1`,
      [voterId]
    );
    const face = faceDeviceRows.length > 0 || labels.includes(FACE);

    const [voterRows] = await db.execute(
      'SELECT cnic FROM voters WHERE id = ?',
      [voterId]
    );
    const cnicVerified = Boolean(voterRows[0]?.cnic);

    res.json({
      registered: labels,
      fingerprint,
      face,
      cnic_verified: cnicVerified,
      ready: cnicVerified && fingerprint && face,
    });
  } catch (err) {
    console.error('stepupStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** POST /auth/vote/verify-cnic — Step 1 */
exports.verifyCnic = async (req, res) => {
  try {
    const voterId = req.user.id;
    const { cnic } = req.body;
    if (!cnic) {
      return res.status(400).json({ success: false, message: 'CNIC is required' });
    }

    const [rows] = await db.execute('SELECT cnic FROM voters WHERE id = ?', [voterId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Voter not found' });
    }

    const registeredCnic = rows[0].cnic;
    if (!registeredCnic) {
      return res.status(403).json({ success: false, message: 'Please register CNIC first in profile' });
    }
    if (registeredCnic !== cnic) {
      return res.status(403).json({ success: false, message: 'CNIC does not match registered CNIC' });
    }

    // Prepare the FINGERPRINT challenge for Step 2.
    const fingerprint = await getCredentialByLabel(voterId, FINGERPRINT);
    if (!fingerprint) {
      return res.status(400).json({
        success: false,
        message: 'No FINGERPRINT credential registered. Please enroll your biometrics first.',
      });
    }

    const options = await buildAssertionOptionsForVoter(voterId);
    const cnic_token = signStep({ id: voterId, stepup: 'cnic', challenge: options.challenge });

    res.json({ verified: true, cnic_token, options });
  } catch (err) {
    console.error('verifyCnic error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** POST /auth/webauthn/stepup/verify-fingerprint — Step 2 */
exports.verifyFingerprint = async (req, res) => {
  try {
    const voterId = req.user.id;
    const { cnic_token, assertion } = req.body;
    if (!cnic_token || !assertion) {
      return res.status(400).json({ success: false, message: 'cnic_token and assertion are required' });
    }

    let decoded;
    try {
      decoded = verifyStep(cnic_token, 'cnic', voterId);
    } catch {
      return res.status(403).json({ success: false, message: 'CNIC verification expired. Please restart.' });
    }

    const fingerprint = await getCredentialByLabel(voterId, FINGERPRINT);
    if (!fingerprint) {
      return res.status(400).json({
        success: false,
        message: 'No FINGERPRINT credential registered. Please enroll your biometrics first.',
      });
    }

    const matched = await findCredentialByAssertionId(voterId, assertion.id);
    if (!matched) {
      console.error('[stepup] FINGERPRINT assertion id not recognized:', assertion?.id);
      return res.status(400).json({ success: false, message: 'FINGERPRINT credential not found' });
    }

    const ok = await verifyAssertionAgainst(matched, assertion, decoded.challenge);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'FINGERPRINT verification failed' });
    }

    // Prepare the FACE RECOGNITION challenge for Step 3.
    const face = await getCredentialByLabel(voterId, FACE);
    if (!face) {
      return res.status(400).json({
        success: false,
        message: 'No FACE RECOGNITION credential registered. Please enroll your biometrics first.',
      });
    }

    const options = await buildAssertionOptionsForVoter(voterId);
    const fingerprint_token = signStep({ id: voterId, stepup: 'fingerprint', challenge: options.challenge });

    res.json({ verified: true, fingerprint_token, options });
  } catch (err) {
    console.error('verifyFingerprint error:', err);
    res.status(500).json({ success: false, message: 'Server error during FINGERPRINT verification' });
  }
};

/** POST /auth/webauthn/stepup/verify-face — Step 3 */
exports.verifyFace = async (req, res) => {
  try {
    const voterId = req.user.id;
    const { fingerprint_token, assertion } = req.body;
    if (!fingerprint_token || !assertion) {
      return res.status(400).json({ success: false, message: 'fingerprint_token and assertion are required' });
    }

    let decoded;
    try {
      decoded = verifyStep(fingerprint_token, 'fingerprint', voterId);
    } catch {
      return res.status(403).json({ success: false, message: 'FINGERPRINT verification expired. Please restart.' });
    }

    const face = await getCredentialByLabel(voterId, FACE);
    if (!face) {
      return res.status(400).json({
        success: false,
        message: 'No FACE RECOGNITION credential registered. Please enroll your biometrics first.',
      });
    }

    const matched = await findCredentialByAssertionId(voterId, assertion.id);
    if (!matched) {
      return res.status(400).json({ success: false, message: 'FACE RECOGNITION credential not found' });
    }

    const ok = await verifyAssertionAgainst(matched, assertion, decoded.challenge);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'FACE RECOGNITION verification failed' });
    }

    // All three steps complete — issue the vote session token.
    // Hardening: carry an explicit voter_id + issue timestamp. (A future step
    // can also bind election_id here to scope the token to a specific vote.)
    const session_token = signStep({
      id: voterId,
      voter_id: voterId,
      stepup: 'session',
      issued_at: Date.now(),
    });

    res.json({ verified: true, session_token });
  } catch (err) {
    console.error('verifyFace error:', err);
    res.status(500).json({ success: false, message: 'Server error during FACE RECOGNITION verification' });
  }
};

/** POST /auth/webauthn/stepup/refresh-fingerprint-options — fresh challenge for Step 2 retry */
exports.refreshFingerprintOptions = async (req, res) => {
  try {
    const voterId = req.user.id;
    const { cnic_token } = req.body;
    if (!cnic_token) {
      return res.status(400).json({ success: false, message: 'cnic_token is required' });
    }

    try {
      verifyStep(cnic_token, 'cnic', voterId);
    } catch {
      return res.status(403).json({ success: false, message: 'CNIC verification expired. Please restart.' });
    }

    const options = await buildAssertionOptionsForVoter(voterId);
    const newCnicToken = signStep({ id: voterId, stepup: 'cnic', challenge: options.challenge });
    res.json({ cnic_token: newCnicToken, options });
  } catch (err) {
    console.error('refreshFingerprintOptions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** POST /auth/webauthn/stepup/refresh-face-options — fresh challenge for Step 3 retry */
exports.refreshFaceOptions = async (req, res) => {
  try {
    const voterId = req.user.id;
    const { fingerprint_token } = req.body;
    if (!fingerprint_token) {
      return res.status(400).json({ success: false, message: 'fingerprint_token is required' });
    }

    try {
      verifyStep(fingerprint_token, 'fingerprint', voterId);
    } catch {
      return res.status(403).json({ success: false, message: 'FINGERPRINT verification expired. Please restart.' });
    }

    const options = await buildAssertionOptionsForVoter(voterId);
    const newFingerprintToken = signStep({
      id: voterId,
      stepup: 'fingerprint',
      challenge: options.challenge,
    });
    res.json({ fingerprint_token: newFingerprintToken, options });
  } catch (err) {
    console.error('refreshFaceOptions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
