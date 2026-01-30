# E2EE Cloud Sync Architecture & Decisions (Source of Truth)

This document is the **source of truth** for Phase 4 implementation decisions: **accounts + end-to-end encrypted (E2EE) cloud sync + multi-device**.

If Phase 5 (billing/entitlements) conflicts with anything here, **Phase 4 wins** unless you explicitly revise this doc.

---

## What Phase 4 is (and is not)

Phase 4 adds an **optional** account + cloud sync feature so users can use the app across devices.

- **Local-first remains the default**: the app must work fully without an account and without sync.
- If sync is enabled, **the backend must never see plaintext**. It stores and returns **ciphertext only**.
- Billing/subscriptions are explicitly **out of scope** for Phase 4 (Phase 5).

---

## The fixed stack (do not deviate)

### Hosting
- **Vercel** hosts the app.

### Backend shape
- **Vercel serverless** API endpoints under **`/api/*` only**.
- The browser **never** talks directly to the database.

### Database
- **Supabase Postgres** as **database only**.
  - **Do not** use Supabase Auth.
  - **Do not** use the Supabase JS client in the browser.

### Auth
- **Stytch only**.
  - No Auth0.
  - No Clerk.
  - No mixing auth systems.

---

## Security posture (non-negotiable)

### E2EE requirements
- All trade/import/settings data is encrypted **client-side**.
- Sync requests/responses transmit **ciphertext** plus **minimal non-sensitive metadata** only.
- Crypto uses **Web Crypto**:
  - Key derivation: **PBKDF2** (per-user salt + strong iterations)
  - Encryption: **AES-GCM** (random IV per encryption)

### No plaintext anywhere on the backend
- The server:
  - **does not parse CSVs**
  - **does not inspect trades/imports/settings**
  - **does not** store plaintext

### Logging rules
- **Never log request bodies** (auth or sync).
- If you must log for debugging, log only:
  - endpoint name
  - status code
  - userId
  - payload byte length (not contents)

---

## “FaceID/TouchID always” unlock model

The app must not silently unlock synced/decryptable content.

- **No auto sign-in** to decryptable content even if a session exists.
- On app open / returning to the app:
  - require **WebAuthn / passkey user presence** (FaceID/TouchID flow) before showing synced/decryptable content.
  - if the user-presence check fails or is canceled:
    - redirect to the normal login screen
    - pre-fill the last-used email address (if available)

> Note: “Continue with Google/Apple” (OAuth) is not the same as passkeys. Passkeys/WebAuthn must be supported as a first-class flow.

---

## “Remember this device” (what it actually means)

“Remember this device” is allowed, but **only** with a user-presence gate.

- Never store the raw sync passphrase.
- Never store an unwrapped encryption key at rest.
- “Remember this device” means:
  - store the derived encryption key **or** a key-encryption-key **only in wrapped/encrypted form** on this device
  - unwrapping/decrypting that stored key must require a user-presence gate:
    - Prefer WebAuthn/passkey user verification to unwrap
    - If WebAuthn user verification is unavailable, do **not** silently fall back; require passphrase entry and explain why

---

## Network scope guard (critical)

Phase 4 may introduce network calls **only** for:
- auth
- sync

Anything else is forbidden.

Sync request/response bodies must contain:
- ciphertext blob
- metadata strictly required for sync: `schemaVersion`, `payloadVersion`, `timestamps`, `deviceId`, `revision`

---

## API surface (only these endpoints)

Implement **only** these endpoints (no extras):

- `GET  /api/sync/pull`
  - returns latest ciphertext blob + metadata for the user (or 404 if none)
- `POST /api/sync/push`
  - accepts ciphertext blob + metadata
  - writes only if revision/concurrency rules pass
- `POST /api/sync/reset`
  - deletes remote ciphertext for the user (explicit confirmation required in UI)
- `POST /api/account/delete`
  - deletes remote ciphertext and any account-linked server rows
  - UI must require typing **DELETE**

All endpoints must:
- authenticate the user via **Stytch session**
- set `Cache-Control: no-store`
- validate request body fields strictly (reject unknown keys)

---

## Concurrency / overwrite protection

To prevent “Device A overwrote Device B”:

- `push` must be conditional:
  - client includes `lastKnownRemoteRevision`
  - server rejects with **409 Conflict** if `lastKnownRemoteRevision != currentRemoteRevision`
  - on 409, client must `pull`, merge deterministically, then retry `push`

---

## CSRF / origin safety

If auth uses cookies:

- All `/api/*` endpoints must implement CSRF defense:
  - verify `Origin` / `Referer` is same-site, and/or
  - require a custom header (e.g., `X-App-Request: 1`) that browsers won’t send cross-site
- Cookies must be `Secure + HttpOnly + SameSite=Lax/Strict` where compatible with the auth flow

---

## Data model: what gets synced

- Sync scope is **everything** in the persisted local state (PersistedData).
- Prefer a single per-user encrypted **sync blob** (ciphertext) + small metadata.

---

## Deletion & retention

- If a user deletes their account: store nothing.
  - delete remote ciphertext immediately
  - require a typed confirmation (user must type **DELETE**)
- Local data remains unless the user explicitly resets local state.

---

## Billing firewall (important for Phase 5)

Billing must not weaken privacy.

- Billing code must never read, decrypt, or inspect trade/import data.
- Billing endpoints may store only:
  - `userId`, `stripeCustomerId`, subscription status/period dates, plan id
- Billing endpoints must not access IndexedDB contents or sync payloads (ciphertext) except to confirm `userId` and entitlement status.

---

## Operational safety

- Include an env kill-switch that can disable all auth/sync UI **and** all `/api/sync/*` network calls.
- Do not commit secrets.
- Client env values must be `VITE_*` and non-secret.
- All secrets (Stytch secrets, DB connection strings) must exist only in Vercel serverless env vars.

---

## Manual verification checklist (Phase 4)

- Passkeys work on supported devices/browsers.
- App unlock requires user presence; if it fails, login screen appears with email pre-filled.
- Sync request/response bodies contain only ciphertext + allowed metadata.
- Server logs contain no request bodies.
- Multi-device overwrite prevention works:
  - concurrent edits cause 409 → pull/merge/retry
