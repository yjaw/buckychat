# BuckyChat — Development Plan

A campus-exclusive random video chat platform built with React + Vite (frontend) and Go + Fiber (backend).

---

## Phase 1 — Project Scaffold + Auth System
**Estimated time:** 2–3 days

Goals:
- Set up the monorepo (already done)
- Implement wisc.edu email registration and login
- Issue JWT tokens for authenticated requests

Tasks:
- [ ] Configure Supabase project and `users` table
- [ ] Restrict registration to the exact `@wisc.edu` email domain
- [ ] `POST /api/auth/register` — create account via Supabase Auth
- [ ] `POST /api/auth/login` — verify credentials, return JWT
- [ ] Go middleware to validate JWT on protected routes
- [ ] React login page UI (email + password form)
- [ ] Store JWT in memory and attach to API requests

---

## Phase 2 — Matching System (WebSocket)
**Estimated time:** 2–3 days

Goals:
- Connect authenticated users to the Go WebSocket server
- Randomly pair two users from the waiting queue

Tasks:
- [ ] Protect `/ws/match` endpoint with JWT verification
- [ ] React `useWebSocket` custom hook (connect, send, receive)
- [ ] Handle states: `waiting`, `matched`, `partner_left`
- [ ] Waiting page UI with animated indicator and online count
- [ ] Redirect to call page on `matched` event

---

## Phase 3 — WebRTC Video Call
**Estimated time:** 3–4 days

Goals:
- Establish a peer-to-peer video connection between matched users
- Use the Go server only for signaling, not media relay

Tasks:
- [ ] Go server forwards `offer`, `answer`, `ice-candidate` messages
- [ ] React `useWebRTC` hook: create `RTCPeerConnection`, handle SDP exchange
- [ ] Request camera and microphone permissions
- [ ] Configure ICE servers: Google STUN (free) + Cloudflare TURN (free tier)
- [ ] Call page UI: large remote video, small local preview
- [ ] Controls: mute, camera toggle, skip to next person

---

## Phase 4 — Safety Features + Deployment
**Estimated time:** 2–3 days

Goals:
- Make the platform safe for campus use
- Deploy to production

Tasks:
- [ ] Report button during a call (stores report in Supabase)
- [ ] Admin endpoint to ban accounts
- [ ] Deploy Go backend to Fly.io (with WebSocket support)
- [ ] Deploy React frontend to Vercel
- [ ] Set production environment variables
- [ ] Smoke test the full flow on production

---

## Phase 5 — Enhancements (optional)
**Estimated time:** open-ended

Goals:
- Improve the experience after core features are stable

Tasks:
- [ ] In-call text chat via WebRTC `DataChannel` (no server needed)
- [ ] Matching filters: department, year
- [ ] Admin dashboard: online count, match count, pending reports
- [ ] Rate limiting to prevent abuse

---

## Tech Stack Reference

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React, Vite, React Router         |
| Backend  | Go, Fiber, Gorilla WebSocket      |
| Database | Supabase (Postgres + Auth)        |
| WebRTC   | Native API, Google STUN, Cloudflare TURN |
| Deploy   | Vercel (frontend), Fly.io (backend) |

## WebSocket Message Types

| Type             | Direction        | Description                        |
|------------------|------------------|------------------------------------|
| `connected`      | server → client  | Your assigned client ID            |
| `waiting`        | server → client  | Queued, waiting for a partner      |
| `matched`        | server → client  | Paired, includes partner ID        |
| `partner_left`   | server → client  | Partner disconnected               |
| `offer`          | client → client* | WebRTC SDP offer (via server relay)|
| `answer`         | client → client* | WebRTC SDP answer                  |
| `ice-candidate`  | client → client* | ICE candidate                      |

*relayed by the Go signaling server
