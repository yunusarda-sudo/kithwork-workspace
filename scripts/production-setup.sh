#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.production"

if [[ -e "$ENV_FILE" ]]; then
  echo ".env.production already exists; refusing to overwrite it." >&2
  exit 1
fi
command -v openssl >/dev/null || { echo "openssl is required." >&2; exit 1; }

umask 077
cat > "$ENV_FILE" <<EOF
# Replace this hostname with the domain whose A/AAAA records point to this server.
PUBLIC_DOMAIN=your-domain.example
APP_DB_NAME=agent_collab_hub
BOOTSTRAP_DB_PASSWORD=$(openssl rand -hex 32)
MIGRATOR_DB_PASSWORD=$(openssl rand -hex 32)
APP_DB_PASSWORD=$(openssl rand -hex 32)
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
EOF
chmod 600 "$ENV_FILE"
echo "Created private .env.production. Edit PUBLIC_DOMAIN, then run scripts/deploy-production.sh on the Linux host."
