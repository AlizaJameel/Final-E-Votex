-- Migration 007: Camera-based face reference hash for mobile face verification.

USE evotex;

ALTER TABLE webauthn_credentials
  ADD COLUMN face_d_hash VARCHAR(64) DEFAULT NULL AFTER device_type;
