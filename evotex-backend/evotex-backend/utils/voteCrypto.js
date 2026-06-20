const crypto = require('crypto');

// AES-256-GCM encryption for the vote's candidate_id.
// Storage layout in `votes`:
//   - candidate_id BINARY(64): ciphertext (PT_WIDTH bytes) || auth tag (16 bytes)
//   - iv BINARY(12): the random GCM initialization vector
//
// The plaintext candidate id is left-padded to a FIXED width before encryption.
// GCM ciphertext length equals plaintext length, so a fixed width lets us read
// the ciphertext/tag back at fixed offsets even though MySQL right-pads BINARY
// columns with 0x00 (and ciphertext/tag bytes may themselves contain 0x00).

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const PT_WIDTH = 10; // supports candidate ids up to 9,999,999,999

function getKey() {
  const raw = process.env.VOTE_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('VOTE_ENCRYPTION_KEY is not set');
  }

  let key;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex'); // 64 hex chars = 32 bytes
  } else if (Buffer.from(raw, 'base64').length === 32) {
    key = Buffer.from(raw, 'base64');
  } else {
    key = Buffer.from(raw, 'utf8'); // raw 32-char string
  }

  if (key.length !== 32) {
    throw new Error('VOTE_ENCRYPTION_KEY must be 32 bytes (64 hex chars, base64, or 32 raw chars)');
  }
  return key;
}

/** Returns { encrypted: Buffer(PT_WIDTH+16), iv: Buffer(12) }. */
function encryptCandidateId(candidateId) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const plaintext = String(candidateId).padStart(PT_WIDTH, '0');
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encrypted: Buffer.concat([ciphertext, tag]), iv };
}

/** Inverse of encryptCandidateId. Returns the candidate id as a number. */
function decryptCandidateId(stored, iv) {
  const buf = Buffer.isBuffer(stored) ? stored : Buffer.from(stored);
  const ivBuf = Buffer.isBuffer(iv) ? iv : Buffer.from(iv);

  const ciphertext = buf.subarray(0, PT_WIDTH);
  const tag = buf.subarray(PT_WIDTH, PT_WIDTH + TAG_LEN);

  const decipher = crypto.createDecipheriv(ALGO, getKey(), ivBuf.subarray(0, IV_LEN));
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return parseInt(plaintext, 10);
}

module.exports = { encryptCandidateId, decryptCandidateId };
