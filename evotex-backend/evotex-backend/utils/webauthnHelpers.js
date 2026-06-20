const {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { isoBase64URL } = require('@simplewebauthn/server/helpers');
const db = require('../config/db');

const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';

function normalizeCredentialId(id) {
  if (!id) return '';
  try {
    return isoBase64URL.fromBuffer(isoBase64URL.toBuffer(id));
  } catch {
    return String(id);
  }
}

/** Camera-enrolled face rows are not WebAuthn passkeys — exclude from ceremonies. */
function isWebAuthnCredential(credential) {
  if (!credential) return false;
  if (credential.public_key === 'camera') return false;
  if (credential.face_d_hash) return false;
  if (String(credential.credential_id || '').startsWith('face-cam:')) return false;
  return true;
}

async function getCredentialsForVoter(voterId) {
  const [rows] = await db.execute(
    'SELECT * FROM webauthn_credentials WHERE voter_id = ?',
    [voterId]
  );
  return rows;
}

async function getCredentialByLabel(voterId, label) {
  const [rows] = await db.execute(
    'SELECT * FROM webauthn_credentials WHERE voter_id = ? AND label = ?',
    [voterId, label]
  );
  return rows[0] ?? null;
}

async function findCredentialByAssertionId(voterId, assertionId) {
  const normalized = normalizeCredentialId(assertionId);
  const credentials = await getCredentialsForVoter(voterId);
  return (
    credentials.find((c) => normalizeCredentialId(c.credential_id) === normalized) ?? null
  );
}

// Mobile platform authenticators often expose a single passkey even when two
// labels were enrolled. Offer every stored credential id to the browser.
async function buildAssertionOptionsForVoter(voterId) {
  const credentials = (await getCredentialsForVoter(voterId)).filter(isWebAuthnCredential);
  if (!credentials.length) {
    throw new Error('No WebAuthn credentials registered');
  }

  const uniqueIds = [...new Set(credentials.map((c) => c.credential_id))];

  return generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    allowCredentials: uniqueIds.map((id) => ({ id })),
  });
}

async function verifyAssertionAgainst(credential, assertion, expectedChallenge) {
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: credential.credential_id,
        publicKey: Buffer.from(credential.public_key, 'base64'),
        counter: credential.counter,
        transports: credential.transports ? JSON.parse(credential.transports) : [],
      },
      requireUserVerification: true,
    });
  } catch (err) {
    console.error('[webauthn] verifyAuthenticationResponse threw:', err.message);
    console.error('[webauthn]   expectedOrigin =', ORIGIN, '| expectedRPID =', RP_ID);
    return false;
  }

  if (verification.verified) {
    await db.execute(
      'UPDATE webauthn_credentials SET counter = ? WHERE credential_id = ?',
      [verification.authenticationInfo.newCounter, credential.credential_id]
    );
  }

  return verification.verified;
}

module.exports = {
  RP_ID,
  ORIGIN,
  normalizeCredentialId,
  isWebAuthnCredential,
  getCredentialByLabel,
  findCredentialByAssertionId,
  buildAssertionOptionsForVoter,
  verifyAssertionAgainst,
};
