# ebike-dashboard

Lachlan's exercise tracker. Points-based weekly goal system with Strava integration, ride privilege tracking, and role-based access for Ben (admin), Anna (parent), and Lachlan (athlete).

---

## Stack

- **Backend:** Node.js / Express, PostgreSQL
- **Frontend:** React + Vite, served via nginx
- **Auth:** JWT, bcrypt
- **Strava:** OAuth2 via Ben's account (follows Lachlan)
- **Scheduler:** node-cron, hourly sync
- **Hosting:** Docker Compose on hamelab1.supervarelas.com
- **Reverse proxy:** Caddy (existing), ebike.supervarelas.com

---

## First-Time Setup

### 1. Clone and configure

```bash
git clone https://github.com/<your-username>/ebike-dashboard.git
cd ebike-dashboard
cp .env.example .env
```

Edit `.env` and fill in all values (see comments in the file).

---

### 2. Create a Strava API App

1. Go to https://www.strava.com/settings/api
2. Create an app. Set the callback domain to `localhost`
3. Copy the **Client ID** and **Client Secret** into `.env`

---

### 3. Get Ben's Strava Refresh Token

This authorizes the dashboard to read activities from your account (which follows Lachlan).

```bash
cd backend
npm install
STRAVA_CLIENT_ID=xxx STRAVA_CLIENT_SECRET=yyy node scripts/get_strava_token.js
```

Open the printed URL in your browser (logged in as Ben on Strava). After authorizing, your terminal will print the `STRAVA_REFRESH_TOKEN` and instructions for finding Lachlan's athlete ID.

Add both to `.env`:
```
STRAVA_REFRESH_TOKEN=...
LACHLAN_STRAVA_ID=...
```

**Finding Lachlan's Strava ID:** Visit his profile on strava.com while logged in as Ben. The URL will be `https://www.strava.com/athletes/XXXXXXX` — that number is his ID.

---

### 4. Start the containers

```bash
docker compose up -d --build
```

Verify everything is running:
```bash
docker compose ps
docker compose logs backend -f
```

---

### 5. Create the admin account (Ben)

Run once after the containers are up:

```bash
curl -X POST http://localhost:3001/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "setup_key": "YOUR_ADMIN_SETUP_KEY_FROM_ENV",
    "username": "ben",
    "password": "your-strong-password",
    "display_name": "Ben"
  }'
```

---

### 6. Log in and create Anna and Lachlan's accounts

1. Go to http://localhost:3000 (or https://ebike.supervarelas.com once proxied)
2. Log in as Ben
3. Go to **Admin → Users → Create User**
4. Create Anna: role `parent`, display name `Anna`
5. Create Lachlan: role `athlete`, display name `Lachlan`

---

### 7. Caddy reverse proxy

Add the block from `caddy-snippet.txt` to your existing Caddyfile on hamelab1, then reload:

```bash
caddy reload
```

---

## Default Activity Types and Points

| Activity | Strava Type | Points | Unit | Minimum |
|---|---|---|---|---|
| Run | Run | 10 pts/mile | mile | 1 mile |
| Walk | Walk | 5 pts/mile | mile | 1 mile |
| Ride | Ride | 8 pts/mile | mile | 2 miles |
| Weight Training | WeightTraining | 15 pts/min | minute | 30 min |
| Soccer | Soccer | 12 pts/min | minute | 45 min |
| Hike | Hike | 8 pts/mile | mile | 1 mile |
| Manual Credit | (manual only) | 10 pts/min | minute | 1 min |

All configurable in Admin → Activity Config. Changes are forward-only.

---

## Weekly Goal Logic

- Goal: **100 points** (configurable in Admin → Weekly Goal)
- Week: **Monday 00:00 UTC through Sunday 23:59 UTC**
- Miss the goal: ride suspended the **following** week
- **At Risk** threshold: 25+ points/day needed to hit goal by Sunday
- Suspension can be lifted in Admin → Weeks (not visible to Lachlan)
- Tracking starts: **April 14, 2025**
- Ride privileges start: **April 21, 2025** (first full week evaluated)

---

## Development

```bash
# Backend (from /backend)
npm install
npm run dev

# Frontend (from /frontend)
npm install
npm run dev
```

Frontend dev server proxies `/api` to `localhost:3001`.

---

## Updating

```bash
git pull
docker compose up -d --build
```

Database migrations run automatically on backend startup.
