#!/usr/bin/env bash
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REMOTE_USER="bvdrax"
REMOTE_HOST="10.0.0.31"
REMOTE_DIR="/home/bvdrax/apps/ebike"
SSH_TARGET="${REMOTE_USER}@${REMOTE_HOST}"

# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo "[deploy] $*"; }
success() { echo "[deploy] ✓ $*"; }
warn()    { echo "[deploy] ⚠  $*"; }
die()     { echo "[deploy] ERROR: $*" >&2; exit 1; }

# ── Pre-flight ────────────────────────────────────────────────────────────────
info "Checking SSH connectivity to ${SSH_TARGET}..."
ssh -q -o BatchMode=yes -o ConnectTimeout=5 "${SSH_TARGET}" exit \
  || die "Cannot reach ${SSH_TARGET}. Check SSH keys and host availability."
success "SSH OK"

# ── Ensure remote directory exists ────────────────────────────────────────────
ssh "${SSH_TARGET}" "mkdir -p ${REMOTE_DIR}"

# ── Create .env template if missing ──────────────────────────────────────────
ENV_EXISTS=$(ssh "${SSH_TARGET}" "[ -f ${REMOTE_DIR}/.env ] && echo yes || echo no")

if [ "${ENV_EXISTS}" = "no" ]; then
  info "No .env found on server — creating template at ${REMOTE_DIR}/.env..."
  ssh "${SSH_TARGET}" "cat > ${REMOTE_DIR}/.env" <<'ENVEOF'
# Database
DB_PASSWORD=change_me

# Auth secrets — generate with: openssl rand -hex 32
JWT_SECRET=change_me
SESSION_SECRET=change_me

# Strava — https://www.strava.com/settings/api
# Run: cd backend && npm install && STRAVA_CLIENT_ID=xxx STRAVA_CLIENT_SECRET=yyy node scripts/get_strava_token.js
STRAVA_CLIENT_ID=change_me
STRAVA_CLIENT_SECRET=change_me
STRAVA_REFRESH_TOKEN=change_me

# Lachlan's Strava athlete ID — from strava.com/athletes/XXXXXXX
LACHLAN_STRAVA_ID=change_me

# One-time key for POST /api/auth/setup to create the admin account
ADMIN_SETUP_KEY=change_me
ENVEOF

  warn ".env template created at ${REMOTE_DIR}/.env on ${REMOTE_HOST}"
  warn "Fill in all values, then re-run this script to deploy."
  echo ""
  echo "  ssh ${SSH_TARGET}"
  echo "  nano ${REMOTE_DIR}/.env"
  echo ""
  exit 0
fi

# ── Sync files ────────────────────────────────────────────────────────────────
info "Syncing files to ${SSH_TARGET}:${REMOTE_DIR}..."
git archive HEAD | ssh "${SSH_TARGET}" "mkdir -p ${REMOTE_DIR} && tar -x -C ${REMOTE_DIR}"
success "Files synced"

# ── Remote deploy ─────────────────────────────────────────────────────────────
info "Deploying on ${REMOTE_HOST}..."
ssh "${SSH_TARGET}" bash <<EOF
  set -euo pipefail

  cd "${REMOTE_DIR}"

  # Ensure proxy network exists
  docker network inspect proxy >/dev/null 2>&1 \
    || { echo "Creating proxy network..."; docker network create proxy; }

  # Build and (re)start containers
  docker compose up -d --build --remove-orphans

  # Brief wait then health check
  sleep 3
  docker compose ps
EOF

success "Deploy complete — https://ebike.supervarelas.com"
