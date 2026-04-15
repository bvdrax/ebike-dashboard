# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Lachlan's exercise tracker. Points-based weekly goal system with Strava integration, ride privilege tracking, and role-based access for Ben (admin), Anna (parent), and Lachlan (athlete).

## Development Commands

```bash
# Backend (from /backend)
npm install
npm run dev

# Frontend (from /frontend)
npm install
npm run dev
```

Frontend dev server proxies `/api` to `localhost:3001`.

```bash
# Production
docker compose up -d --build
docker compose logs backend -f

# Update
git pull && docker compose up -d --build
```

## Architecture

**Monorepo layout** — `./backend` and `./frontend` are separate subdirectories, each with their own `package.json` and Docker build context.

### Backend (`./backend`)

- Entry point: `index.js` — Express app setup, middleware, route mounting, cron scheduler
- Routes: `/api/auth`, `/api/dashboard`, `/api/config`
- `services/strava.js` — Strava OAuth2 sync (reads Lachlan's activities via Ben's account which follows him); runs on startup + hourly cron
- `migrations/run.js` — PostgreSQL migrations run automatically on startup; schema changes go here
- Rate limiting: 200 req/15 min
- CORS: allows `localhost:3000`/`localhost:5173` in dev, `ebike.supervarelas.com` in production

### Frontend (`./frontend`)

- React + Vite, served via nginx in production
- Pages: `src/pages/DashboardPage.jsx`, `src/pages/AdminPage.jsx`
- Shared: `src/lib/api.js` (API client), `src/lib/auth.js` (auth hook)
- Components: `src/components/PointsRing.jsx`, `src/components/ActivityRow.jsx`
- Uses CSS custom properties for theming (`--surface-3`, `--border`, `--green`, `--red`, `--amber`, `--font-display`, `--font-mono`, `--radius`, etc.)

### Database

PostgreSQL 16. Schema managed via migrations in `backend/migrations/`. Key tables implied by the API: `users`, `activity_types`, `activities`, `weeks`, `weekly_config`.

## Domain Logic

**Roles:** `admin` (Ben), `parent` (Anna), `athlete` (Lachlan). Admin account created via one-time `POST /api/auth/setup` with `ADMIN_SETUP_KEY`.

**Weekly goal:** 100 points (configurable), Monday 00:00 UTC – Sunday 23:59 UTC. Missing the goal suspends riding the *following* week. Suspensions can be lifted by admin.

**At Risk:** triggered when 25+ pts/day are needed to reach the goal by Sunday.

**Activity points config:** stored in `activity_types` table; changes apply forward-only. Default types: Run (10 pts/mile), Walk (5 pts/mile), Ride (8 pts/mile), Weight Training (15 pts/min), Soccer (12 pts/min), Hike (8 pts/mile), Manual Credit (10 pts/min).

**Strava sync:** activities are fetched for `LACHLAN_STRAVA_ID` using Ben's OAuth token. Manual credits (`/api/config`) bypass Strava.

## Environment Variables

All secrets live in `.env` (copy from `.env.example`):

| Variable | Purpose |
| --- | --- |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | JWT signing key |
| `SESSION_SECRET` | Session secret |
| `STRAVA_CLIENT_ID` | Strava API app client ID |
| `STRAVA_CLIENT_SECRET` | Strava API app client secret |
| `STRAVA_REFRESH_TOKEN` | Ben's Strava refresh token (from `scripts/get_strava_token.js`) |
| `LACHLAN_STRAVA_ID` | Lachlan's numeric Strava athlete ID |
| `ADMIN_SETUP_KEY` | One-time key for admin account creation |

## Deployment

Hosted on `homelab1` (`10.0.0.31`, Ubuntu), accessible at `https://ebike.supervarelas.com`.

**Reverse proxy:** Traefik v2.11 running in Docker on homelab1. SSL via Let's Encrypt wildcard cert (`*.supervarelas.com`) using Cloudflare DNS-01 challenge (cert resolver named `cloudflare`). Local DNS is managed via UniFi pointing subdomains at `10.0.0.31` — these are internal-only, not public Cloudflare DNS entries.

To expose the app through Traefik, containers must join the `proxy` Docker network and use these labels (replace `ebike` and the internal port as needed):

```yaml
networks:
  - proxy

labels:
  - "traefik.enable=true"
  - "traefik.http.routers.ebike.rule=Host(`ebike.supervarelas.com`)"
  - "traefik.http.routers.ebike.entrypoints=websecure"
  - "traefik.http.routers.ebike.tls.certresolver=cloudflare"
  - "traefik.http.routers.ebike.tls.domains[0].main=supervarelas.com"
  - "traefik.http.routers.ebike.tls.domains[0].sans=*.supervarelas.com"
  - "traefik.http.services.ebike.loadbalancer.server.port=80"
```

Traefik config lives at `/home/bvdrax/traefik/` on homelab1: `traefik.yml` (static config), `routes.yml` (non-Docker services, auto-reloaded), `acme.json` (cert storage). Dashboard at `https://traefik.supervarelas.com`.
