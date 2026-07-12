#!/usr/bin/env bash
set -Eeuo pipefail

exec 9>/run/lock/muvs-deploy.lock
flock -n 9 || exit 0

REPOSITORY_URL="https://github.com/undergnarly/muvs.git"
MIRROR_DIR="/var/www/muvs-release.git"
RELEASES_DIR="/var/www/muvs-releases"
CURRENT_LINK="/var/www/muvs-current"
ENV_FILE="/root/.config/muvs.env"
KEEP_RELEASES=5

mkdir -p "$RELEASES_DIR"

if [[ ! -d "$MIRROR_DIR" ]]; then
  git clone --mirror "$REPOSITORY_URL" "$MIRROR_DIR"
fi

git --git-dir="$MIRROR_DIR" fetch --prune origin main
SHA="$(git --git-dir="$MIRROR_DIR" rev-parse FETCH_HEAD)"
SHORT_SHA="${SHA:0:12}"
RELEASE_DIR="$RELEASES_DIR/$SHORT_SHA"

if [[ -L "$CURRENT_LINK" && "$(readlink -f "$CURRENT_LINK")" == "$RELEASE_DIR" ]]; then
  exit 0
fi

if [[ ! -d "$RELEASE_DIR" ]]; then
  TEMP_DIR="$(mktemp -d "$RELEASES_DIR/.building-${SHORT_SHA}-XXXX")"
  trap 'rm -rf "${TEMP_DIR:-}"' EXIT
  git --git-dir="$MIRROR_DIR" archive "$SHA" | tar -x -C "$TEMP_DIR"

  npm --prefix "$TEMP_DIR" ci --legacy-peer-deps
  npm --prefix "$TEMP_DIR" run build
  npm --prefix "$TEMP_DIR/server" ci --omit=dev
  chmod -R a+rX "$TEMP_DIR"

  mv "$TEMP_DIR" "$RELEASE_DIR"
  TEMP_DIR=""
  trap - EXIT
fi

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }
set -a
source "$ENV_FILE"
set +a

ln -sfn "$RELEASE_DIR" "${CURRENT_LINK}.new"
mv -Tf "${CURRENT_LINK}.new" "$CURRENT_LINK"

if pm2 describe muvs-api >/dev/null 2>&1; then
  pm2 delete muvs-api >/dev/null
fi
(
  cd "$CURRENT_LINK/server"
  pm2 start index.js --name muvs-api >/dev/null
)
pm2 save >/dev/null

nginx -t
systemctl reload nginx

find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
  | sort -nr \
  | tail -n "+$((KEEP_RELEASES + 1))" \
  | cut -d' ' -f2- \
  | xargs -r rm -rf

echo "$(date --iso-8601=seconds) deployed $SHORT_SHA"
