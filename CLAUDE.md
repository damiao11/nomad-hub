# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read Next.js 16 docs before writing code

This project uses Next.js 16.2.1, which has breaking changes vs. earlier versions. Before writing any Next.js-specific code, read the relevant guide in `frontend/node_modules/next/dist/docs/`.

## Commands

```bash
# Frontend (Next.js dev server on 0.0.0.0:3000)
cd frontend && npm run dev

# Frontend build
cd frontend && npm run build

# Frontend lint
cd frontend && npm run lint

# Backend (Express on host:port from .env, default 0.0.0.0:4000)
cd backend && node src/simple-server.js
```

## Architecture

### Monorepo structure

- `frontend/` — Next.js 16 App Router SPA with Leaflet maps
- `backend/` — Express 5 REST API + Socket.IO server (CommonJS)

### Frontend

Single-page map application. All state lives in [LeafletMap.tsx](frontend/components/map/LeafletMap.tsx) which composes four custom hooks:

| Hook | Responsibility |
|------|---------------|
| `useAuth` | Login, auto-register, localStorage persistence of userId/userName |
| `useTrip` | CRUD for saved trip markers via REST API |
| `useGroupChat` | Socket.IO chat messages, pagination, reconnection |
| `useGroupInvite` | Create/join/leave groups via Socket.IO |

No routing — everything renders through `app/page.tsx` → `LeafletMap`. Components are organized by domain under `components/<domain>/`.

Map uses Amap (高德) tiles, so coordinates go through **GCJ-02 ↔ WGS-84** conversion in `LeafletMap.tsx`. WGS-84 is stored in the database; GCJ-02 is used for display on Amap tiles.

Image upload flow: client-side JPEG compression (max 1280px, ~320KB target per image) → base64 data URL → stored directly in MySQL `Trip.photoUrl` (LONGTEXT). Max 3 images per trip, total ≤ 60MB.

### Backend

Entry: [simple-server.js](backend/src/simple-server.js). Structure:

- [app.js](backend/src/app.js) — Express app factory (CORS + JSON body parser + route registration)
- [server.js](backend/src/server.js) — HTTP server + Socket.IO bootstrap
- [config/constants.js](backend/src/config/constants.js) — Env-based config for host, port, CORS origins, DB credentials
- [db/mysql.js](backend/src/db/mysql.js) — MySQL connection factory, photo normalization, auto-migration helpers
- [routes/](backend/src/routes/) — Express route handlers (auth, search, trips)
- [socket/groupSocket.js](backend/src/socket/groupSocket.js) — All Socket.IO event handlers (groups, chat, location sharing, mute/kick)
- [utils/authRules.js](backend/src/utils/authRules.js) — Registration validation rules

Group state is **in-memory only** (a `Map<string, GroupData>` in `groupSocket.js`). Group data does not survive server restarts. Chat history is capped at 300 messages per group.

Auth has no JWT/sessions — the frontend sends userId/userName with requests.

### API endpoints

- `POST /api/register` — Create user (requires email: gmail/163/126/qq)
- `POST /api/login` — Login by username or email
- `GET /api/search/places?q=&limit=` — Geocoding: Nominatim → Photon fallback → local Chinese city list fallback
- `GET /api/trips?userId=` — List trips (optionally filtered by user)
- `POST /api/trips` — Create trip marker
- `PUT /api/trips/:id` — Update trip (userId-gated)
- `DELETE /api/trips/:id` — Delete trip

### Socket.IO events

Client emits: `create-group`, `join-group`, `leave-group`, `group-message`, `update-location`, `mute-member`, `kick-member`, `request-group-history`, `request-group-members`

Server emits: `group-joined`, `group-members`, `group-message`, `group-history`, `group-locations`, `group-error`, `kicked`

### Environment

Backend `.env` keys: `SERVER_HOST`, `PORT`, `API_ORIGINS` (comma-separated), `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`

Frontend `.env.local` key: `NEXT_PUBLIC_API_BASE_URL` (base URL for API + Socket.IO, use empty string for same-origin in production behind a reverse proxy)

### Deployment

GitHub Actions workflow at `.github/workflows/deploy.yml` builds and deploys to GitHub Pages (appears to build a static export from a `./dist` directory).
