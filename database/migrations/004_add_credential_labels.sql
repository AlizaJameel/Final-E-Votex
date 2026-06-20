-- Migration 004: Label WebAuthn credentials as FINGERPRINT or FACE RECOGNITION.
--
-- Each voter enrolls exactly two platform credentials, one per label. The
-- step-up vote flow requires an assertion from BOTH (in order) before a vote
-- can be cast.
--
-- WARNING: `label` is NOT NULL with no default. If `webauthn_credentials`
-- already contains rows from earlier testing, this ALTER will fail. Clear them
-- first if so:  DELETE FROM webauthn_credentials;
-- The UNIQUE KEY enforces at most one FINGERPRINT and one FACE RECOGNITION per voter.

USE evotex;

ALTER TABLE webauthn_credentials
  ADD COLUMN label ENUM('FINGERPRINT','FACE RECOGNITION') NOT NULL AFTER voter_id,
  ADD UNIQUE KEY unique_voter_label (voter_id, label);
