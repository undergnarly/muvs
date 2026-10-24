#!/bin/bash
set -Eeuo pipefail
umask 077

DATA_DIR=/var/www/muvs-data
BACKUP_DIR=/var/backups/muvs-site
CURRENT_LINK=/var/www/muvs-current
KEEP_BACKUPS=7

[[ "$(realpath -e -- "$DATA_DIR")" == "$DATA_DIR" && ! -L "$DATA_DIR" ]] || exit 1
[[ -f "$DATA_DIR/db.json" ]] || exit 1
if [[ -d "$DATA_DIR/dubplates" ]]; then
  [[ -f "$DATA_DIR/dubplates/catalog.json" && -f "$DATA_DIR/dubplates/analytics.json" && -d "$DATA_DIR/dubplates/assets" ]] || exit 1
fi
mkdir -p -m 0700 -- "$BACKUP_DIR"
[[ "$(realpath -e -- "$BACKUP_DIR")" == "$BACKUP_DIR" && ! -L "$BACKUP_DIR" ]] || exit 1
[[ "$(stat -c %U -- "$BACKUP_DIR")" == root && "$(stat -c %a -- "$BACKUP_DIR")" == 700 ]] || exit 1

# A deploy/restart must not run asset cleanup halfway through the archive.
exec 9>/run/lock/muvs-deploy.lock
flock -w 60 9 || { printf 'MUVS backup deferred: deployment busy\n' >&2; exit 1; }

source_kb="$(du -sk -- "$DATA_DIR" | awk '{print $1}')"
free_kb="$(df -Pk -- "$BACKUP_DIR" | awk 'NR==2 {print $4}')"
(( free_kb > source_kb + 1048576 )) || { printf 'Not enough free space for a verified backup\n' >&2; exit 1; }

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$BACKUP_DIR/muvs-site-$stamp.tar.gz"
[[ ! -e "$archive" ]] || exit 1
temporary="$(mktemp "$BACKUP_DIR/.building-muvs-site-$stamp-XXXXXX.tar.gz")"
cleanup() {
  [[ -n "${temporary:-}" && "$(dirname -- "$temporary")" == "$BACKUP_DIR" && "$(basename -- "$temporary")" == .building-muvs-site-*.tar.gz ]] || return 0
  rm -f -- "$temporary"
}
trap cleanup EXIT
items=(db.json)
for item in uploads dubplates/catalog.json dubplates/analytics.json dubplates/assets meditation-progress.json; do
  if [[ -e "$DATA_DIR/$item" ]]; then items+=("$item"); fi
done
tar -C "$DATA_DIR" -czf "$temporary" -- "${items[@]}"
tar -tzf "$temporary" >/dev/null
mv -- "$temporary" "$archive"
temporary=""
sha256sum -- "$archive" > "$archive.sha256"
chmod 0600 -- "$archive" "$archive.sha256"
node "$CURRENT_LINK/server/ops-files.cjs" prune-backups "$BACKUP_DIR" "$KEEP_BACKUPS"
printf 'Verified MUVS backup created: %s\n' "$(basename -- "$archive")"
