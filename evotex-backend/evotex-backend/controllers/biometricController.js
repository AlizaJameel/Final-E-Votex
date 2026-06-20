const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { facesMatch } = require('../utils/faceCapture');

const STEP_TTL = '2m';

const RP_NAME = 'E-Votex';
const FACE_DEVICE = 'face';
const FACE_LABEL = 'FACE RECOGNITION';

function getRpId() {
  return process.env.WEBAUTHN_RP_ID || 'localhost';
}

function getOrigin() {
  return process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';
}

function isMobileRequest(req) {
  if (req.body?.mobile === true) return true;
  const ua = req.headers['user-agent'] || '';
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

/** Desktop only — webcam + cross-platform passkey. Mobile uses front-camera capture instead. */
function faceAuthenticatorSelection() {
  return {
    authenticatorAttachment: 'cross-platform',
    userVerification: 'required',
    residentKey: 'preferred',
  };
}

function cameraFaceCredentialId(voterId) {
  return `face-cam:${voterId}`;
}

async function upsertCameraFaceCredential(voterId, faceDHash) {
  const credentialId = cameraFaceCredentialId(voterId);
  const [existing] = await db.execute(
    'SELECT id FROM webauthn_credentials WHERE voter_id = ? AND device_type = ?',
    [voterId, FACE_DEVICE]
  );

  if (existing.length) {
    await db.execute(
      `UPDATE webauthn_credentials
       SET credential_id = ?, public_key = ?, counter = 0, transports = ?, label = ?, face_d_hash = ?
       WHERE voter_id = ? AND device_type = ?`,
      [credentialId, 'camera', 0, '[]', FACE_LABEL, faceDHash, voterId, FACE_DEVICE]
    );
  } else {
    await db.execute(
      `INSERT INTO webauthn_credentials
       (voter_id, label, device_type, credential_id, public_key, counter, transports, face_d_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [voterId, FACE_LABEL, FACE_DEVICE, credentialId, 'camera', 0, '[]', faceDHash]
    );
  }
}

function voterUserId(voterId) {
  return Uint8Array.from(String(voterId), (c) => c.charCodeAt(0));
}

async function getVoterById(voterId) {
  const [rows] = await db.execute('SELECT id, email, name FROM voters WHERE id = ?', [voterId]);
  return rows[0] ?? null;
}

async function purgeOldChallenges(voterId, purpose) {
  await db.execute(
    `DELETE FROM webauthn_challenges
     WHERE user_id = ? AND purpose = ?
       AND created_at < (NOW() - INTERVAL 5 MINUTE)`,
    [voterId, purpose]
  );
}

async function saveChallenge(voterId, challenge, type, purpose) {
  await db.execute(
    'DELETE FROM webauthn_challenges WHERE user_id = ? AND purpose = ?',
    [voterId, purpose]
  );
  await db.execute(
    'INSERT INTO webauthn_challenges (user_id, challenge, type, purpose) VALUES (?, ?, ?, ?)',
    [voterId, challenge, type, purpose]
  );
}

async function getLatestChallenge(voterId, purpose) {
  const [rows] = await db.execute(
    `SELECT challenge FROM webauthn_challenges
     WHERE user_id = ? AND purpose = ?
     ORDER BY created_at DESC LIMIT 1`,
    [voterId, purpose]
  );
  return rows[0]?.challenge ?? null;
}

async function clearChallenge(voterId, purpose) {
  await db.execute(
    'DELETE FROM webauthn_challenges WHERE user_id = ? AND purpose = ?',
    [voterId, purpose]
  );
}

async function getFaceCredential(voterId) {
  const [rows] = await db.execute(
    `SELECT * FROM webauthn_credentials
     WHERE voter_id = ? AND device_type = ?
     ORDER BY created_at DESC LIMIT 1`,
    [voterId, FACE_DEVICE]
  );
  return rows[0] ?? null;
}

/** POST /biometric/face/register-options */
exports.generateFaceRegistrationOptions = async (req, res) => {
  try {
    const voterId = req.user.id;
    const voter = await getVoterById(voterId);
    if (!voter) {
      return res.status(404).json({ success: false, message: 'Voter not found' });
    }

    const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';

    if (isMobileRequest(req)) {
      return res.json({ success: true, mode: 'camera', mobile: true });
    }

    await purgeOldChallenges(voterId, 'face_register');

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userName: voter.email,
      userID: voterUserId(voterId),
      userDisplayName: `${voter.name} (Face)`,
      attestationType: 'none',
      authenticatorSelection: faceAuthenticatorSelection(),
    });

    await saveChallenge(voterId, options.challenge, 'registration', 'face_register');

    res.json({ success: true, mode: 'webauthn', options, mobile: false });
  } catch (err) {
    console.error('generateFaceRegistrationOptions error:', err);
    res.status(500).json({ success: false, message: 'Server error generating face registration options' });
  }
};

/** POST /biometric/face/register-verify */
exports.verifyFaceRegistration = async (req, res) => {
  try {
    const voterId = req.user.id;

    if (isMobileRequest(req)) {
      const faceDHash = req.body?.face_d_hash;
      if (!faceDHash || typeof faceDHash !== 'string') {
        return res.status(400).json({ success: false, message: 'face_d_hash is required from camera capture' });
      }
      await upsertCameraFaceCredential(voterId, faceDHash);
      await db.execute('UPDATE voters SET biometric = 1 WHERE id = ?', [voterId]);
      return res.json({ success: true, message: 'Face registered from camera', step: 3, mode: 'camera' });
    }

    const attestationResponse = req.body?.credential ?? req.body;
    if (!attestationResponse) {
      return res.status(400).json({ success: false, message: 'credential is required' });
    }

    const expectedChallenge = await getLatestChallenge(voterId, 'face_register');
    if (!expectedChallenge) {
      return res.status(400).json({
        success: false,
        message: 'Face registration challenge not found or expired. Try again.',
      });
    }

    const verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ success: false, message: 'Face registration verification failed' });
    }

    const { credential } = verification.registrationInfo;
    const transports = JSON.stringify(
      credential.transports || attestationResponse.response?.transports || []
    );
    const publicKey = Buffer.from(credential.publicKey).toString('base64');

    const [existing] = await db.execute(
      'SELECT id FROM webauthn_credentials WHERE voter_id = ? AND device_type = ?',
      [voterId, FACE_DEVICE]
    );

    if (existing.length) {
      await db.execute(
        `UPDATE webauthn_credentials
         SET credential_id = ?, public_key = ?, counter = ?, transports = ?, label = ?
         WHERE voter_id = ? AND device_type = ?`,
        [
          credential.id,
          publicKey,
          credential.counter,
          transports,
          FACE_LABEL,
          voterId,
          FACE_DEVICE,
        ]
      );
    } else {
      await db.execute(
        `INSERT INTO webauthn_credentials
         (voter_id, label, device_type, credential_id, public_key, counter, transports)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          voterId,
          FACE_LABEL,
          FACE_DEVICE,
          credential.id,
          publicKey,
          credential.counter,
          transports,
        ]
      );
    }

    await db.execute('UPDATE voters SET biometric = 1 WHERE id = ?', [voterId]);
    await clearChallenge(voterId, 'face_register');

    res.json({ success: true, message: 'Face registered', step: 3 });
  } catch (err) {
    console.error('verifyFaceRegistration error:', err);
    res.status(500).json({ success: false, message: 'Server error during face registration' });
  }
};

/** POST /biometric/face/auth-options */
exports.generateFaceAuthOptions = async (req, res) => {
  try {
    const voterId = req.user.id;
    const faceCred = await getFaceCredential(voterId);
    if (!faceCred) {
      return res.status(400).json({
        success: false,
        message: 'No face credential registered. Please register your face first.',
      });
    }

    const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';

    if (isMobileRequest(req)) {
      if (!faceCred.face_d_hash) {
        return res.status(400).json({
          success: false,
          message: 'Face was enrolled with fingerprint. Please re-register FACE using your front camera.',
        });
      }
      return res.json({ success: true, mode: 'camera', mobile: true });
    }

    await purgeOldChallenges(voterId, 'face_auth');

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'required',
      allowCredentials: [{ id: faceCred.credential_id }],
    });

    await saveChallenge(voterId, options.challenge, 'authentication', 'face_auth');

    res.json({ success: true, mode: 'webauthn', options, mobile: false });
  } catch (err) {
    console.error('generateFaceAuthOptions error:', err);
    res.status(500).json({ success: false, message: 'Server error generating face auth options' });
  }
};

/** POST /biometric/face/auth-verify */
exports.verifyFaceAuth = async (req, res) => {
  try {
    const voterId = req.user.id;

    if (isMobileRequest(req)) {
      const liveHash = req.body?.face_d_hash;
      if (!liveHash) {
        return res.status(400).json({ success: false, message: 'face_d_hash is required from camera capture' });
      }

      const faceCred = await getFaceCredential(voterId);
      if (!faceCred?.face_d_hash) {
        return res.status(400).json({
          success: false,
          message: 'No camera face enrolled. Re-register FACE on the enrollment page.',
        });
      }

      if (!facesMatch(faceCred.face_d_hash, liveHash)) {
        return res.status(401).json({
          success: false,
          message: 'Face does not match enrolled face. Look at the camera and try again.',
        });
      }

      if (req.body.fingerprint_token) {
        try {
          const decoded = jwt.verify(req.body.fingerprint_token, process.env.JWT_SECRET);
          if (decoded.stepup !== 'fingerprint' || Number(decoded.id) !== Number(voterId)) {
            throw new Error('Invalid fingerprint step token');
          }
        } catch {
          return res.status(403).json({
            success: false,
            message: 'FINGERPRINT verification expired. Please restart.',
          });
        }

        const session_token = jwt.sign(
          { id: voterId, voter_id: voterId, stepup: 'session', issued_at: Date.now() },
          process.env.JWT_SECRET,
          { expiresIn: STEP_TTL }
        );

        return res.json({
          success: true,
          message: 'Face verified',
          session_token,
          mode: 'camera',
        });
      }

      return res.json({
        success: true,
        message: 'Face verified',
        redirect: '/candidate-page',
        mode: 'camera',
      });
    }

    const assertion = req.body?.credential ?? req.body?.assertion ?? req.body;
    if (!assertion?.id) {
      return res.status(400).json({ success: false, message: 'Authentication credential is required' });
    }

    const expectedChallenge = await getLatestChallenge(voterId, 'face_auth');
    if (!expectedChallenge) {
      return res.status(400).json({
        success: false,
        message: 'Face authentication challenge not found or expired. Try again.',
      });
    }

    const [rows] = await db.execute(
      `SELECT * FROM webauthn_credentials
       WHERE voter_id = ? AND device_type = ? AND credential_id = ?`,
      [voterId, FACE_DEVICE, assertion.id]
    );

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Face credential not found for this account',
      });
    }

    const stored = rows[0];

    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpId(),
      credential: {
        id: stored.credential_id,
        publicKey: Buffer.from(stored.public_key, 'base64'),
        counter: stored.counter,
        transports: stored.transports ? JSON.parse(stored.transports) : [],
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return res.status(401).json({ success: false, message: 'Face verification failed' });
    }

    await db.execute(
      'UPDATE webauthn_credentials SET counter = ? WHERE credential_id = ?',
      [verification.authenticationInfo.newCounter, stored.credential_id]
    );

    await clearChallenge(voterId, 'face_auth');

    // Voting flow: after fingerprint step, issue session_token for cast vote.
    if (req.body.fingerprint_token) {
      try {
        const decoded = jwt.verify(req.body.fingerprint_token, process.env.JWT_SECRET);
        if (decoded.stepup !== 'fingerprint' || Number(decoded.id) !== Number(voterId)) {
          throw new Error('Invalid fingerprint step token');
        }
      } catch {
        return res.status(403).json({
          success: false,
          message: 'FINGERPRINT verification expired. Please restart.',
        });
      }

      const session_token = jwt.sign(
        { id: voterId, voter_id: voterId, stepup: 'session', issued_at: Date.now() },
        process.env.JWT_SECRET,
        { expiresIn: STEP_TTL }
      );

      return res.json({
        success: true,
        message: 'Face verified',
        session_token,
      });
    }

    res.json({
      success: true,
      message: 'Face verified',
      redirect: '/candidate-page',
    });
  } catch (err) {
    console.error('verifyFaceAuth error:', err);
    res.status(500).json({ success: false, message: 'Server error during face verification' });
  }
};
