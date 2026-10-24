#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ENV_FILE="$ROOT/.env.production"
[[ -f "$ENV_FILE" ]] || { echo "Missing .env.production; run scripts/production-setup.sh first." >&2; exit 1; }

DOMAIN="$(sed -n 's/^PUBLIC_DOMAIN=//p' "$ENV_FILE" | head -n 1)"
if [[ "$DOMAIN" == "your-domain.example" || ! "$DOMAIN" =~ ^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$ ]]; then
  echo "Set PUBLIC_DOMAIN to a real DNS hostname in .env.production before deployment." >&2
  exit 1
fi
DB_NAME="$(sed -n 's/^APP_DB_NAME=//p' "$ENV_FILE" | head -n 1)"
if [[ ! "$DB_NAME" =~ ^[A-Za-z_][A-Za-z0-9_]{0,62}$ ]]; then
  echo "APP_DB_NAME must be a PostgreSQL identifier using letters, digits or underscores." >&2
  exit 1
fi
command -v docker >/dev/null || { echo "Docker Engine and Compose are required." >&2; exit 1; }
docker compose version >/dev/null
COMPOSE=(docker compose --env-file "$ENV_FILE" -f compose.production.yaml)
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" build web
"${COMPOSE[@]}" up -d --build db
"${COMPOSE[@]}" --profile tools run --build --rm migrate
"${COMPOSE[@]}" up -d web caddy
echo "Deployment started. Check status with: docker compose --env-file .env.production -f compose.production.yaml ps"
