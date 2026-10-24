#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
if [[ "$EUID" -ne 0 ]]; then
  echo "Run this on the Linux host as root: sudo $ROOT/scripts/install-backup-timer.sh" >&2
  exit 1
fi
if ! command -v systemctl >/dev/null || ! command -v systemd-analyze >/dev/null || \
  ! systemctl list-unit-files --no-pager --no-legend docker.service 2>/dev/null | grep -q '^docker\.service'; then
  echo "This installer requires systemd, systemd-analyze, and the rootful Docker Engine service." >&2
  exit 1
fi
command -v docker >/dev/null || { echo "Docker CLI is required." >&2; exit 1; }
docker compose version >/dev/null || {
  echo "Docker Compose is required." >&2
  exit 1
}
docker info >/dev/null 2>&1 || {
  echo "The rootful Docker daemon must be available before installing the backup timer." >&2
  exit 1
}
if [[ ! "$ROOT" =~ ^[A-Za-z0-9._/-]+$ ]]; then
  echo "Move the checkout to a path containing only letters, digits, dot, underscore, slash or hyphen, then retry." >&2
  exit 1
fi
case "$ROOT" in
  /opt/*|/srv/*|/var/opt/*|/var/srv/*) ;;
  *) echo "For a root-run system service, place the checkout under a root-controlled /opt or /srv directory." >&2; exit 1 ;;
esac
check_trusted_directory() {
  local trusted_dir="$1" trusted_mode
  [[ "$(stat -c %u -- "$trusted_dir")" == 0 ]] || {
    echo "The directory $trusted_dir must be owned by root before installing a root-run timer." >&2
    exit 1
  }
  trusted_mode="$(stat -c %a -- "$trusted_dir")"
  (( (8#$trusted_mode & 8#022) == 0 )) || {
    echo "The directory $trusted_dir must not be group- or world-writable." >&2
    exit 1
  }
}

trusted_dir="$ROOT"
while :; do
  check_trusted_directory "$trusted_dir"
  [[ "$trusted_dir" == / ]] && break
  trusted_dir="$(dirname "$trusted_dir")"
done
check_trusted_directory "$ROOT/scripts"
if find "$ROOT" -xdev \( ! -user 0 -o -perm /022 \) -print -quit | grep -q .; then
  echo "Every file and directory in the checkout must be root-owned and not group/world-writable." >&2
  exit 1
fi
for trusted_file in "$ROOT/compose.production.yaml" "$ROOT/scripts/backup-production.sh" "$ROOT/.env.production"; do
  [[ -f "$trusted_file" && "$(stat -c %u -- "$trusted_file")" == 0 ]] || {
    echo "The file $trusted_file must exist and be owned by root." >&2
    exit 1
  }
  trusted_mode="$(stat -c %a -- "$trusted_file")"
  (( (8#$trusted_mode & 8#022) == 0 )) || {
    echo "The file $trusted_file must not be group- or world-writable." >&2
    exit 1
  }
done
env_mode="$(stat -c %a -- "$ROOT/.env.production")"
(( (8#$env_mode & 8#077) == 0 )) || {
  echo ".env.production must be private (mode 0600 or stricter)." >&2
  exit 1
}

SERVICE_FILE=/etc/systemd/system/agent-collab-hub-backup.service
TIMER_FILE=/etc/systemd/system/agent-collab-hub-backup.timer
check_managed_unit() {
  local unit_file="$1" unit_mode
  if [[ -e "$unit_file" || -L "$unit_file" ]]; then
    [[ -f "$unit_file" && ! -L "$unit_file" && "$(stat -c %u -- "$unit_file")" == 0 ]] || {
      echo "Refusing to replace an unsafe unit file: $unit_file" >&2
      exit 1
    }
    unit_mode="$(stat -c %a -- "$unit_file")"
    (( (8#$unit_mode & 8#022) == 0 )) || {
      echo "Refusing to replace a group- or world-writable unit file: $unit_file" >&2
      exit 1
    }
    grep -Fqx '# Managed by the Kithwork backup timer installer.' "$unit_file" || {
      echo "Refusing to replace a unit not managed by this installer: $unit_file" >&2
      exit 1
    }
  fi
}
check_managed_unit "$SERVICE_FILE"
check_managed_unit "$TIMER_FILE"

UNIT_TMP_DIR="$(mktemp -d /run/agent-collab-hub-backup.XXXXXX)"
SERVICE_STAGE=""
TIMER_STAGE=""
cleanup_installer() {
  local status=$?
  trap - EXIT
  [[ -z "$SERVICE_STAGE" ]] || rm -f -- "$SERVICE_STAGE"
  [[ -z "$TIMER_STAGE" ]] || rm -f -- "$TIMER_STAGE"
  rm -f -- "$UNIT_TMP_DIR/agent-collab-hub-backup.service" "$UNIT_TMP_DIR/agent-collab-hub-backup.timer"
  rmdir -- "$UNIT_TMP_DIR"
  exit "$status"
}
trap cleanup_installer EXIT
sed "s|@APP_ROOT@|$ROOT|g" "$ROOT/infra/systemd/agent-collab-hub-backup.service.in" \
  > "$UNIT_TMP_DIR/agent-collab-hub-backup.service"
sed "s|@APP_ROOT@|$ROOT|g" "$ROOT/infra/systemd/agent-collab-hub-backup.timer.in" \
  > "$UNIT_TMP_DIR/agent-collab-hub-backup.timer"
systemd-analyze verify --recursive-errors=yes \
  "$UNIT_TMP_DIR/agent-collab-hub-backup.service" "$UNIT_TMP_DIR/agent-collab-hub-backup.timer"
grep -Fqx 'User=root' "$UNIT_TMP_DIR/agent-collab-hub-backup.service"
grep -Fqx 'ProtectSystem=strict' "$UNIT_TMP_DIR/agent-collab-hub-backup.service"
grep -Fqx 'StateDirectory=agent-collab-hub-backup' "$UNIT_TMP_DIR/agent-collab-hub-backup.service"
grep -Fqx "ExecStart=/usr/bin/bash $ROOT/scripts/backup-production.sh" "$UNIT_TMP_DIR/agent-collab-hub-backup.service"

SERVICE_STAGE="$(mktemp "$SERVICE_FILE.tmp.XXXXXX")"
TIMER_STAGE="$(mktemp "$TIMER_FILE.tmp.XXXXXX")"
install -o root -g root -m 0644 "$UNIT_TMP_DIR/agent-collab-hub-backup.service" "$SERVICE_STAGE"
install -o root -g root -m 0644 "$UNIT_TMP_DIR/agent-collab-hub-backup.timer" "$TIMER_STAGE"
mv -f -- "$TIMER_STAGE" "$TIMER_FILE"
TIMER_STAGE=""
mv -f -- "$SERVICE_STAGE" "$SERVICE_FILE"
SERVICE_STAGE=""
systemctl daemon-reload
EFFECTIVE_USER="$(systemctl show --property=User --value agent-collab-hub-backup.service)"
EFFECTIVE_EXEC="$(systemctl show --property=ExecStart --value agent-collab-hub-backup.service)"
EFFECTIVE_STATE="$(systemctl show --property=StateDirectory --value agent-collab-hub-backup.service)"
EFFECTIVE_PROTECT="$(systemctl show --property=ProtectSystem --value agent-collab-hub-backup.service)"
EFFECTIVE_NNP="$(systemctl show --property=NoNewPrivileges --value agent-collab-hub-backup.service)"
[[ "$EFFECTIVE_USER" == root && "$EFFECTIVE_EXEC" == *"$ROOT/scripts/backup-production.sh"* && \
  "$EFFECTIVE_STATE" == *agent-collab-hub-backup* && "$EFFECTIVE_PROTECT" == strict && "$EFFECTIVE_NNP" == yes ]] || {
  echo "Effective systemd unit settings did not match the verified backup configuration; timer was not enabled." >&2
  exit 1
}
systemctl enable --now agent-collab-hub-backup.timer
systemctl is-active --quiet agent-collab-hub-backup.timer || {
  echo "The backup timer could not be activated." >&2
  exit 1
}
echo "Enabled daily backups with 30-day local retention. Inspect with: systemctl list-timers agent-collab-hub-backup.timer"
