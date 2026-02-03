# Phase 4 Auth + Sync Runbook (Pre-Phase Setup)

## A) Architecture summary
- **DB is server-only via /api using SUPABASE_SERVICE_ROLE_KEY; client never talks directly to Supabase.**
- Client uses Stytch Public Token only for client-side auth; server uses Stytch Project ID + Secret.
- Snapshot sync reads/writes go through `/api/**` functions only (no direct client-to-DB access).

## B) Environment variables (what + where)

### Vercel (Production/Preview/Development)
Set these in **Vercel → Project → Settings → Environment Variables** for **Production**, **Preview**, and **Development**:

**Client (Vite-safe):**
- `VITE_STYTCH_PUBLIC_TOKEN` (required)
- `VITE_APP_URL` (optional but recommended)

**Server-only:**
- `STYTCH_PROJECT_ID` (required)
- `STYTCH_SECRET` (required)
- `SUPABASE_URL` (required)
- `SUPABASE_SERVICE_ROLE_KEY` (required)
- `SUPABASE_ANON_KEY` (required)

### Local development (`.env.local`)
Create a `.env.local` file at the repo root with the same variables as above.

**Safe for VITE_ (client bundle):**
- `VITE_STYTCH_PUBLIC_TOKEN`
- `VITE_APP_URL`

**Not safe for VITE_ (server-only secrets):**
- `STYTCH_PROJECT_ID`
- `STYTCH_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## C) Click-path instructions (human-proof)

### Supabase: Project URL + keys
1. Open **Supabase Dashboard**.
2. Select your project.
3. Go to **Settings → API**.
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Stytch: Project ID / Secret / Public token
1. Open **Stytch Dashboard**.
2. Select your project.
3. Go to **Project Settings → API Keys**.
4. Copy:
   - **Project ID** → `STYTCH_PROJECT_ID`
   - **Secret** → `STYTCH_SECRET`
   - **Public token** → `VITE_STYTCH_PUBLIC_TOKEN`

### Stytch: Redirect URLs
1. Open **Stytch Dashboard**.
2. Select your project.
3. Go to **Project Settings → Redirect URLs**.
4. Add allowed URLs for your environments, for example:
   - `http://localhost:5173` (local dev)
   - `https://<your-vercel-domain>` (preview/prod)

## D) SQL execution order (Supabase SQL Editor)
Run in this exact order:
1. `supabase/sql/001_cloud_snapshots.sql`
2. `supabase/sql/002_entitlements_stub.sql`
3. `supabase/sql/003_lifetime_offer_stub.sql`

## E) Do not do this (non-negotiable)
- **Never** store `SUPABASE_SERVICE_ROLE_KEY` as a `VITE_*` env var.
- **Never** commit secrets into the repo (use `.env.local` or Vercel env vars).
- **Never** add hard reload navigation for internal routes (use client-side routing).
