#!/bin/bash
set -Eeuo pipefail
umask 077

# Observe only the current MUVS artist-site release. Never restart processes,
# repurpose the legacy8080 monitor, or send data to an external destination.
CURRENT_LINK=/var/www/muvs-current
exec 9>/run/lock/muvs-site-health.lock
flock -n 9 || exit 0
release="$(readlink -f -- "$CURRENT_LINK")"
[[ "$release" =~ ^/var/www/muvs-releases/[a-f0-9]{12}$ && -f "$release/server/ops-healthcheck.cjs" ]] || {
  logger -p daemon.err -t muvs-site-health -- 'MUVS release/helper is missing; operator attention required'
  exit 1
}
if node "$release/server/ops-healthcheck.cjs" "$release"; then
  printf '%s MUVS API and origin healthy\n' "$(date -u +%FT%TZ)"
else
  logger -p daemon.err -t muvs-site-health -- 'MUVS API/origin health check failed; inspect local health log and PM2'
  exit 1
fi
