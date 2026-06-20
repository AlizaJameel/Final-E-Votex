-- Migration 006: Webcam face credentials (device_type) and challenge purpose.
-- Fingerprint rows are unchanged; face webcam uses device_type = 'face'.

USE evotex;

ALTER TABLE webauthn_credentials
  ADD COLUMN device_type VARCHAR(50) NOT NULL DEFAULT '' AFTER label;

ALTER TABLE webauthn_challenges
  ADD COLUMN purpose VARCHAR(50) DEFAULT NULL AFTER type;

CREATE INDEX idx_webauthn_challenges_purpose ON webauthn_challenges (user_id, purpose, created_at);
