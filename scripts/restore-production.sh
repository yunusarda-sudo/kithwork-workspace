#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ENV_FILE="$ROOT/.env.production"
ALLOW_UNVERIFIED_LEGACY=0
if [[ "${1:-}" == "--allow-unverified-legacy" ]]; then
  ALLOW_UNVERIFIED_LEGACY=1
  shift
fi
BACKUP="${1:-}"
[[ -f "$ENV_FILE" ]] || { echo "Missing .env.production." >&2; exit 1; }
[[ -f "$BACKUP" && ! -L "$BACKUP" ]] || {
  echo "Usage: scripts/restore-production.sh [--allow-unverified-legacy] /path/to/trusted.dump" >&2
  exit 1
}
CHECKSUM_FILE="$BACKUP.sha256"
if [[ -f "$CHECKSUM_FILE" && ! -L "$CHECKSUM_FILE" ]]; then
  if command -v sha256sum >/dev/null; then
    (cd "$(dirname "$BACKUP")" && sha256sum --check --status "$(basename "$CHECKSUM_FILE")") || {
      echo "Backup SHA-256 verification failed." >&2
      exit 1
    }
  elif command -v shasum >/dev/null; then
    (cd "$(dirname "$BACKUP")" && shasum -a 256 --check --status "$(basename "$CHECKSUM_FILE")") || {
      echo "Backup SHA-256 verification failed." >&2
      exit 1
    }
  else
    echo "sha256sum or shasum is required to verify the backup." >&2
    exit 1
  fi
elif (( ALLOW_UNVERIFIED_LEGACY == 0 )); then
  echo "Backup checksum sidecar is missing; use --allow-unverified-legacy only for a separately trusted older dump." >&2
  exit 1
else
  echo "Warning: restoring a legacy backup without a checksum sidecar." >&2
fi
command -v docker >/dev/null || { echo "Docker Engine and Compose are required." >&2; exit 1; }
docker compose version >/dev/null

TARGET="agent_collab_hub_restore_$(date -u +%Y%m%d%H%M%S)_$(openssl rand -hex 3)"
docker compose --env-file "$ENV_FILE" -f compose.production.yaml exec -i -T db sh -ec \
  'pg_restore --file=/dev/null' < "$BACKUP"
cleanup_restore_target() {
  local status="${1:-$?}"
  trap - ERR INT TERM
  if (( status != 0 )); then
    echo "Restore failed; removing only the generated target database: $TARGET" >&2
    if ! docker compose --env-file "$ENV_FILE" -f compose.production.yaml exec -T db sh -ec \
      'PGPASSWORD="$POSTGRES_PASSWORD" dropdb --if-exists --username=agent_hub_bootstrap "$1"' restore "$TARGET"; then
      echo "Could not remove $TARGET automatically. Inspect that database before retrying." >&2
    fi
  fi
  exit "$status"
}
trap 'cleanup_restore_target "$?"' ERR
trap 'cleanup_restore_target 130' INT
trap 'cleanup_restore_target 143' TERM

docker compose --env-file "$ENV_FILE" -f compose.production.yaml exec -i -T db sh -ec \
  'PGPASSWORD="$POSTGRES_PASSWORD" createdb --owner=agent_hub_owner --template=template0 --username=agent_hub_bootstrap "$1" && \
   PGPASSWORD="$POSTGRES_PASSWORD" psql --username=agent_hub_bootstrap --dbname="$1" --set ON_ERROR_STOP=1 \
     --command="GRANT agent_hub_owner TO agent_hub_migrator" \
     --command="GRANT CONNECT ON DATABASE \"$1\" TO agent_hub_migrator, agent_hub_runtime" \
     --command="ALTER ROLE agent_hub_migrator IN DATABASE \"$1\" SET role TO agent_hub_owner" \
     --command="GRANT USAGE, CREATE ON SCHEMA public TO agent_hub_owner" \
     --command="GRANT USAGE ON SCHEMA public TO agent_hub_runtime" \
     --command="ALTER DEFAULT PRIVILEGES FOR ROLE agent_hub_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agent_hub_runtime" \
     --command="ALTER DEFAULT PRIVILEGES FOR ROLE agent_hub_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO agent_hub_runtime" && \
   PGPASSWORD="$POSTGRES_PASSWORD" pg_restore --exit-on-error --single-transaction --no-owner --no-acl --role=agent_hub_owner --username=agent_hub_bootstrap --dbname="$1"' \
   restore "$TARGET" < "$BACKUP"
trap - ERR INT TERM
echo "Restored into a separate database named $TARGET. The active database was not replaced."
echo "To inspect it, stop web/migration services and set APP_DB_NAME=$TARGET in .env.production, then restart the web service. Keep a copy of the previous database name for rollback."
