#!/usr/bin/env bash
# Καθημερινό backup της Postgres (Neon) βάσης -> Google Drive, μέσω rclone.
# Προϋποθέτει: postgresql-client (pg_dump) και rclone εγκατεστημένα, και ένα
# ήδη ρυθμισμένο rclone remote (βλ. CLAUDE.md -> "Backup στρατηγική").
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/frontistirio}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive-backup:frontistirio-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
HEALTHCHECK_URL="${BACKUP_HEALTHCHECK_URL:-}"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILENAME="frontistirio-${TIMESTAMP}.dump"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

fail() {
  echo "ERROR: $1" >&2
  if [ -n "$HEALTHCHECK_URL" ]; then
    curl -fsS -m 10 "${HEALTHCHECK_URL}/fail" -d "$1" >/dev/null || true
  fi
  exit 1
}

mkdir -p "$BACKUP_DIR"

if [ ! -f "${APP_DIR}/.env" ]; then
  fail ".env δεν βρέθηκε στο ${APP_DIR}"
fi

set -a
# shellcheck disable=SC1091
source "${APP_DIR}/.env"
set +a

if [ -z "${DATABASE_URL_SITE:-}" ]; then
  fail "DATABASE_URL_SITE δεν είναι ορισμένο στο .env"
fi

echo "[$(date -Is)] Δημιουργία dump: $FILEPATH"
if ! pg_dump "$DATABASE_URL_SITE" -Fc -f "$FILEPATH"; then
  fail "pg_dump απέτυχε"
fi

echo "[$(date -Is)] Ανέβασμα στο Google Drive ($RCLONE_REMOTE)..."
if ! rclone copy "$FILEPATH" "$RCLONE_REMOTE" --quiet; then
  fail "rclone upload απέτυχε (το τοπικό αντίγραφο παραμένει στο $FILEPATH)"
fi

echo "[$(date -Is)] Καθαρισμός τοπικών backups παλαιότερων από ${RETENTION_DAYS} μέρες..."
find "$BACKUP_DIR" -name "frontistirio-*.dump" -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date -Is)] Backup ολοκληρώθηκε: $FILENAME"

if [ -n "$HEALTHCHECK_URL" ]; then
  curl -fsS -m 10 "$HEALTHCHECK_URL" >/dev/null || true
fi
