#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ENV_FILE="$ROOT/.env.production"
[[ -f "$ENV_FILE" ]] || { echo "Missing .env.production." >&2; exit 1; }
command -v docker >/dev/null || { echo "Docker Engine and Compose are required." >&2; exit 1; }
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
[[ "$RETENTION_DAYS" =~ ^[0-9]{1,4}$ ]] && (( RETENTION_DAYS >= 1 && RETENTION_DAYS <= 3650 )) || {
  echo "BACKUP_RETENTION_DAYS must be an integer from 1 to 3650." >&2
  exit 1
}
DB_NAME="$(sed -n 's/^APP_DB_NAME=//p' "$ENV_FILE" | head -n 1)"
DB_NAME="${DB_NAME:-agent_collab_hub}"
[[ "$DB_NAME" =~ ^[A-Za-z_][A-Za-z0-9_]{0,62}$ ]] || {
  echo "APP_DB_NAME must be a PostgreSQL identifier using letters, digits or underscores." >&2
  exit 1
}

OUT_DIR="${BACKUP_OUTPUT_DIR:-$ROOT/backups/production}"
[[ "$OUT_DIR" == /* ]] || { echo "BACKUP_OUTPUT_DIR must be an absolute path." >&2; exit 1; }
[[ ! -L "$OUT_DIR" ]] || { echo "Backup destination must not be a symlink." >&2; exit 1; }
umask 077
mkdir -p "$OUT_DIR"
[[ -d "$OUT_DIR" && ! -L "$OUT_DIR" ]] || { echo "Backup destination must be a real directory, not a symlink." >&2; exit 1; }
if [[ -z "${BACKUP_OUTPUT_DIR:-}" ]]; then
  chmod 700 "$ROOT/backups"
fi
chmod 700 "$OUT_DIR"
command -v flock >/dev/null || { echo "flock is required to prevent concurrent backups." >&2; exit 1; }
exec 9>"$OUT_DIR/.backup.lock"
chmod 600 "$OUT_DIR/.backup.lock"
flock -n 9 || { echo "Another production backup is already running." >&2; exit 1; }
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT="$OUT_DIR/agent-collab-hub-$STAMP-$$.dump"
CHECKSUM_FILE="$OUTPUT.sha256"
METADATA_FILE="$OUTPUT.json"
OUTPUT_PARTIAL="$OUTPUT.partial"
CHECKSUM_PARTIAL="$CHECKSUM_FILE.partial"
METADATA_PARTIAL="$METADATA_FILE.partial"
[[ ! -e "$OUTPUT" && ! -e "$CHECKSUM_FILE" && ! -e "$METADATA_FILE" ]] || {
  echo "Backup artifact already exists: $OUTPUT" >&2
  exit 1
}
FINALIZED=0
cleanup_backup() {
  local status="$1"
  trap - ERR INT TERM
  if (( status != 0 && FINALIZED == 0 )); then
    rm -f -- "$OUTPUT_PARTIAL" "$CHECKSUM_PARTIAL" "$METADATA_PARTIAL" "$OUTPUT" "$CHECKSUM_FILE" "$METADATA_FILE"
  fi
  exit "$status"
}
trap 'cleanup_backup "$?"' ERR
trap 'cleanup_backup 130' INT
trap 'cleanup_backup 143' TERM
docker compose --env-file "$ENV_FILE" -f compose.production.yaml exec -T --env "BACKUP_DB_NAME=$DB_NAME" db sh -ec \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump --format=custom --no-owner --no-acl --username=agent_hub_bootstrap --dbname="$BACKUP_DB_NAME"' > "$OUTPUT_PARTIAL"
docker compose --env-file "$ENV_FILE" -f compose.production.yaml exec -i -T db sh -ec \
  'pg_restore --file=/dev/null' < "$OUTPUT_PARTIAL"
if command -v sha256sum >/dev/null; then
  SHA256="$(sha256sum "$OUTPUT_PARTIAL" | awk '{print $1}')"
elif command -v shasum >/dev/null; then
  SHA256="$(shasum -a 256 "$OUTPUT_PARTIAL" | awk '{print $1}')"
else
  echo "sha256sum or shasum is required to verify production backups." >&2
  exit 1
fi
[[ "$SHA256" =~ ^[0-9a-f]{64}$ ]] || { echo "Could not calculate a valid backup SHA-256." >&2; exit 1; }
printf '%s  %s\n' "$SHA256" "$(basename "$OUTPUT")" > "$CHECKSUM_PARTIAL"
printf '{"created_at":"%s","database":"%s","format":"pg_dump_custom","sha256":"%s"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$DB_NAME" "$SHA256" > "$METADATA_PARTIAL"
chmod 600 "$OUTPUT_PARTIAL" "$CHECKSUM_PARTIAL" "$METADATA_PARTIAL"
mv -- "$CHECKSUM_PARTIAL" "$CHECKSUM_FILE"
mv -- "$METADATA_PARTIAL" "$METADATA_FILE"
mv -- "$OUTPUT_PARTIAL" "$OUTPUT"
FINALIZED=1
trap - ERR INT TERM
find "$OUT_DIR" -maxdepth 1 -type f -name 'agent-collab-hub-*.dump' \
  -mtime "+$RETENTION_DAYS" ! -path "$OUTPUT" \
  -exec sh -ec 'for dump do rm -f -- "$dump" "$dump.sha256" "$dump.json"; done' sh {} +
echo "Created private backup: $OUTPUT"
echo "SHA-256: $SHA256"
echo "Metadata: $METADATA_FILE"
echo "Removed matching local dumps older than $RETENTION_DAYS days."
