# E-Votex — Setup & Migration Notes

## Database migrations (`database/migrations/`)

Apply migrations in order against the `evotex` database.

### Before testing Step 2 (3-step biometric verification)

Migration **004** adds the credential `label` column. Because `label` is
`NOT NULL` with no default, it cannot be applied while old, unlabeled rows
exist in `webauthn_credentials`.

1. **Run migration 004**

   ```bash
   mysql -u root -p evotex < database/migrations/004_add_credential_labels.sql
   ```

2. **Clear any old credentials** that were created before this migration
   (they have no label and will block the `ALTER`):

   ```sql
   TRUNCATE webauthn_credentials;
   ```

   Run this **before** the `ALTER` if migration 004 fails with a NOT NULL /
   default error, then re-run migration 004.

3. **Voters must re-enroll both credentials** after this migration. Send each
   voter to `/voter/enroll-biometrics` to register a `FINGERPRINT` and a
   `FACE RECOGNITION` credential. Voting is blocked until both exist.

### Step 3 — Vote encryption (AES-256-GCM)

Migration **003** (`003_add_vote_encryption.sql`) is now **ready to apply** — the
encryption code is in place (`utils/voteCrypto.js`, `castVote`, results read from
`candidates.vote_count`).

1. Set `VOTE_ENCRYPTION_KEY` in `evotex-backend/evotex-backend/.env` to a 32-byte
   key (64 hex chars). A dev key is already present — **change it for production**.
   Note: if this key is lost/changed, previously stored votes can no longer be
   decrypted.

2. Clear any existing plaintext votes (they cannot be decrypted post-migration):

   ```sql
   TRUNCATE votes;
   ```

3. Run migration 003:

   ```bash
   mysql -u root -p evotex < database/migrations/003_add_vote_encryption.sql
   ```

4. Restart the backend so it picks up `VOTE_ENCRYPTION_KEY`.

## Mobile / HTTPS testing over the LAN

WebAuthn only runs in a **secure context** (HTTPS or `localhost`), so both the
frontend and backend must be reachable over HTTPS for phone testing.

### Frontend (Vite)
- `vite-plugin-mkcert` is enabled in `vite.config.ts`; the dev server runs on
  `https://0.0.0.0:5173`. The first `npm run dev` installs a local CA.
- `Evotex_Frontend_Only (2)/.env` → `VITE_API_URL` points the app at the backend.

### Backend (Express HTTPS)
1. Generate certs with mkcert (CLI) for both the LAN IP and localhost:
   ```bash
   mkcert 192.168.12.109 localhost
   ```
2. Put the generated files under `evotex-backend/evotex-backend/certs/` as
   `server-cert.pem` / `server-key.pem` (or update `SSL_CERT_PATH` /
   `SSL_KEY_PATH` in the backend `.env`). With certs present, the server starts
   on **HTTPS**; otherwise it falls back to HTTP.
3. `CLIENT_URL` (backend `.env`) must match the exact frontend origin for CORS.

### ⚠️ WebAuthn does NOT work on a bare IP address

`WEBAUTHN_RP_ID` must be a **domain name** — the spec/browsers reject IP literals
(e.g. `192.168.12.109`). Use a real HTTPS domain via the tunnel below.

### Recommended: single-origin Cloudflare tunnel (FIDO works end-to-end)

Everything is served from one HTTPS origin (the tunnel host). Vite proxies
`/api` to the local backend, so there's no mixed-content / cross-origin issue.

1. **Backend** (HTTP, behind the proxy):
   ```bash
   cd evotex-backend/evotex-backend && npm run dev   # http://localhost:5001
   ```
2. **Frontend** (`VITE_API_URL=/api`, proxy + allowedHosts already configured):
   ```bash
   cd "Evotex_Frontend_Only (2)" && npm run dev      # https://0.0.0.0:5173
   ```
3. **Tunnel** to the Vite server. Because Vite's origin cert is mkcert
   (self-signed), tell cloudflared to skip origin verification:
   ```bash
   cloudflared tunnel --no-tls-verify --url https://192.168.12.109:5173
   ```
   (Or run Vite over plain HTTP and use `--url http://192.168.12.109:5173`.)
4. Copy the printed `https://<random>.trycloudflare.com` host and set, in the
   **backend `.env`**, then restart the backend:
   ```
   CLIENT_URL=https://<random>.trycloudflare.com
   WEBAUTHN_RP_ID=<random>.trycloudflare.com
   WEBAUTHN_ORIGIN=https://<random>.trycloudflare.com
   ```
5. Open the tunnel URL on the phone and enroll/vote.

**Ephemeral URL:** quick-tunnel hosts change on every `cloudflared` restart —
re-do step 4 each time. A named Cloudflare tunnel or your own domain avoids this.

### Alternative: Chrome port-forwarding (no tunnel)
`chrome://inspect` → Port forwarding → map `5173`; browse `https://localhost:5173`
on the phone so `RP_ID` stays `localhost` (set `WEBAUTHN_RP_ID=localhost`,
`WEBAUTHN_ORIGIN=https://localhost:5173`).

## WebAuthn / environment notes

- `@simplewebauthn/server` (backend) and `@simplewebauthn/browser` (frontend)
  must both be **v13**.
- The relying-party config in the backend is `RP_ID = 'localhost'` and
  `ORIGIN = 'http://localhost:5173'`. WebAuthn requires the React app to be
  served from that exact origin in a secure context. Real device testing
  (phone fingerprint/face) needs an actual HTTPS domain — `localhost` will not
  work over a LAN.
