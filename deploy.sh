#!/usr/bin/env bash
#
# Build the catalogue and upload it to your Contabo server.
#
# One-time: make this executable with  chmod +x deploy.sh
# Then run:  ./deploy.sh
#
# Edit the three values below (or pass them as environment variables):
#   SERVER_USER  - SSH user on the Contabo box (e.g. root or a sudo user)
#   SERVER_HOST  - the server's IP address or domain
#   REMOTE_DIR   - where nginx serves files from (matches `root` in nginx.conf)

set -euo pipefail

SERVER_USER="${SERVER_USER:-root}"
SERVER_HOST="${SERVER_HOST:-pivskatvrdja.hr}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/katapp}"

# --- safety checks ---------------------------------------------------------
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example to .env and set your Supabase keys first."
  echo "       (Vite bakes these into the build, so they must exist before building.)"
  exit 1
fi

if [ "$SERVER_HOST" = "your.server.ip" ]; then
  echo "ERROR: edit SERVER_HOST in deploy.sh (or export SERVER_HOST=...) before deploying."
  exit 1
fi

# --- build -----------------------------------------------------------------
echo "==> Installing dependencies"
npm install

echo "==> Building production bundle"
npm run build

# --- upload ----------------------------------------------------------------
echo "==> Ensuring remote directory exists: $REMOTE_DIR"
ssh "${SERVER_USER}@${SERVER_HOST}" "mkdir -p '${REMOTE_DIR}'"

echo "==> Uploading dist/ to ${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}"
# --delete removes files on the server that no longer exist in dist/
rsync -avz --delete dist/ "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}/"

echo "==> Done. Visit your domain to see the live site."
