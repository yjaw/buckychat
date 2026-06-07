# BuckyChat

BuckyChat is a lean campus-only random video chat MVP for verified `@wisc.edu` users.

## Stack

- Frontend: React, Vite, TypeScript, Supabase JS
- Backend: Go, Fiber, Fiber WebSocket
- Auth and database: Supabase Auth + Postgres
- Video: native WebRTC with Google STUN and optional TURN
- Deployment target: Vercel frontend and a single Fly.io backend instance for MVP

## Local setup

1. Create a Supabase project and run `supabase/migrations/001_madfriends.sql`.
2. Configure the Before User Created hook as described in `docs/supabase-setup.md`.
3. Copy `.env.example` to `.env` and fill in Supabase values. The backend needs the Supabase Postgres connection string in `DATABASE_URL`; use a server-side connection string from Supabase, not the frontend anon key.
4. Start the backend:

```sh
cd videochat-server
go run ./cmd/server
```

5. Start the frontend:

```sh
cd videochat-client
npm install
npm run dev
```

## MVP constraints

- Only exact `@wisc.edu` email addresses can sign up.
- Supabase owns password auth, email confirmation, sessions, and JWT issuance.
- The Go backend validates Supabase access tokens before protected HTTP or WebSocket actions.
- Matchmaking and rooms are in memory, so production MVP must run one backend instance.
- Calls are not recorded and media is not stored.
