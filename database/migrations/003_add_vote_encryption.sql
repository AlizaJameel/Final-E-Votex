-- Migration 003: Vote encryption support (AES-256-GCM)
--
-- READY TO APPLY: the encryption code is now in place
--   - utils/voteCrypto.js (encrypt/decrypt candidate_id)
--   - voteController.castVote writes encrypted candidate_id + iv
--   - electionController.getElectionResults reads candidates.vote_count
--   - .env has VOTE_ENCRYPTION_KEY (32 bytes)
--
-- After this runs, `votes.candidate_id` stores AES-256-GCM ciphertext + 16-byte
-- auth tag, with the 12-byte IV in the new `iv` column.
--
-- IMPORTANT: any EXISTING rows in `votes` hold a plaintext integer candidate_id
-- that will become undecryptable after the MODIFY. Clear them first:
--     TRUNCATE votes;
--
-- NOTE: If your `votes` table has a FOREIGN KEY on candidate_id (as defined in
-- database/schema.sql), drop that constraint BEFORE the MODIFY below. The
-- setup-db.js-generated schema has no such FK, so no drop is needed there.

USE evotex;

-- 12-byte initialization vector for AES-256-GCM, one per encrypted vote.
ALTER TABLE votes
  ADD COLUMN iv BINARY(12) AFTER candidate_id;

-- Store ciphertext + auth tag instead of the plaintext candidate id.
ALTER TABLE votes
  MODIFY candidate_id BINARY(64);
