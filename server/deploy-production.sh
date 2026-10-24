#!/bin/bash
set -Eeuo pipefail
umask 022

exec 9>/run/lock/muvs-deploy.lock
flock -n 9 || exit 0

REPOSITORY_URL="https://github.com/undergnarly/muvs.git"
MIRROR_DIR="/var/www/muvs-release.git"
RELEASES_DIR="/var/www/muvs-releases"
CURRENT_LINK="/var/www/muvs-current"
ENV_FILE="/root/.config/muvs.env"
KEEP_RELEASES=5
TEMP_DIR=""
PREVIOUS_RELEASE=""
ROLLBACK_REQUIRED=0

cleanup_staging() {
  [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" && ! -L "$TEMP_DIR" ]] || return 0
  local target
  target="$(realpath -e -- "$TEMP_DIR")"
  [[ "$(dirname -- "$target")" == "$RELEASES_DIR" && "$(basename -- "$target")" == .building-"$SHORT_SHA"-* ]] || return 1
  rm -rf -- "$target"
}

switch_link() {
  ln -sfn -- "$1" "${CURRENT_LINK}.new"
  mv -Tf -- "${CURRENT_LINK}.new" "$CURRENT_LINK"
}

start_runtime() {
  # PM2 restart/startOrReload preserves an existing process's absolute script
  # path. Replace only this named API so a new release cannot run old code.
  if pm2 describe muvs-api >/dev/null 2>&1; then pm2 delete muvs-api >/dev/null; fi
  MUVS_RELEASE_DIR="$1" pm2 startOrReload "$RELEASE_DIR/server/ecosystem.production.config.cjs" --only muvs-api --update-env >/dev/null
}

finish() {
  local status=$?
  trap - EXIT
  if [[ "$ROLLBACK_REQUIRED" == 1 && "$status" != 0 ]]; then
    printf 'MUVS deployment failed; restoring previous validated release\n' >&2
    if [[ -n "$PREVIOUS_RELEASE" ]]; then
      if switch_link "$PREVIOUS_RELEASE" && start_runtime "$PREVIOUS_RELEASE" \
        && node "$RELEASE_DIR/server/ops-healthcheck.cjs" "$PREVIOUS_RELEASE"; then
        pm2 save >/dev/null || true
        printf 'MUVS rollback healthy\n' >&2
      else
        printf 'MUVS rollback requires operator attention\n' >&2
      fi
    else
      printf 'No previous release exists; operator attention required\n' >&2
    fi
  fi
  cleanup_staging || printf 'Staging cleanup refused an unvalidated target\n' >&2
  exit "$status"
}
trap finish EXIT

mkdir -p "$RELEASES_DIR"

if [[ ! -d "$MIRROR_DIR" ]]; then
  git clone --mirror "$REPOSITORY_URL" "$MIRROR_DIR"
fi

git --git-dir="$MIRROR_DIR" fetch --prune origin main
SHA="$(git --git-dir="$MIRROR_DIR" rev-parse FETCH_HEAD)"
SHORT_SHA="${SHA:0:12}"
[[ "$SHA" =~ ^[a-f0-9]{40}$ && "$SHORT_SHA" =~ ^[a-f0-9]{12}$ ]] || exit 1
RELEASE_DIR="$RELEASES_DIR/$SHORT_SHA"
[[ "$(realpath -e -- "$RELEASES_DIR")" == "$RELEASES_DIR" ]] || exit 1
if [[ -e "$CURRENT_LINK" && ! -L "$CURRENT_LINK" ]]; then
  printf 'Current release pointer must be a symlink\n' >&2
  exit 1
fi
if [[ -L "$CURRENT_LINK" ]]; then PREVIOUS_RELEASE="$(readlink -f -- "$CURRENT_LINK")"; fi

if [[ -L "$CURRENT_LINK" && "$(readlink -f "$CURRENT_LINK")" == "$RELEASE_DIR" ]]; then
  exit 0
fi

if [[ ! -d "$RELEASE_DIR" ]]; then
  TEMP_DIR="$(mktemp -d "$RELEASES_DIR/.building-${SHORT_SHA}-XXXX")"
  git --git-dir="$MIRROR_DIR" archive "$SHA" | tar -x -C "$TEMP_DIR"

  npm --prefix "$TEMP_DIR" ci --legacy-peer-deps
  npm --prefix "$TEMP_DIR" run build
  npm --prefix "$TEMP_DIR/server" ci --omit=dev
  chmod -R a+rX "$TEMP_DIR"

  mv "$TEMP_DIR" "$RELEASE_DIR"
  TEMP_DIR=""
fi

[[ ! -L "$RELEASE_DIR" && -f "$RELEASE_DIR/dist/index.html" && -f "$RELEASE_DIR/server/index.js" \
  && -f "$RELEASE_DIR/server/ecosystem.production.config.cjs" ]] || exit 1
node "$RELEASE_DIR/server/ops-files.cjs" validate-release "$RELEASES_DIR" "$RELEASE_DIR" >/dev/null
if [[ -n "$PREVIOUS_RELEASE" ]]; then
  node "$RELEASE_DIR/server/ops-files.cjs" validate-release "$RELEASES_DIR" "$PREVIOUS_RELEASE" >/dev/null
fi

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }
[[ "$(stat -c %U -- "$ENV_FILE")" == root && "$(stat -c %a -- "$ENV_FILE")" == 600 ]] || { printf 'Environment file must be root-owned mode0600\n' >&2; exit 1; }
set -a
source "$ENV_FILE"
set +a

# Code-only releases need no global nginx reload. Validate config before the
# switch; the existing server follows the atomic symlink for static documents.
nginx -t
ROLLBACK_REQUIRED=1
switch_link "$RELEASE_DIR"
start_runtime "$RELEASE_DIR"
node "$RELEASE_DIR/server/ops-healthcheck.cjs" "$RELEASE_DIR"
pm2 save >/dev/null
ROLLBACK_REQUIRED=0

# Keep current + previous even when their mtimes are older. Only validated
# direct twelve-hex release directories are candidates; never follow symlinks.
node "$RELEASE_DIR/server/ops-files.cjs" prune-releases "$RELEASES_DIR" "$RELEASE_DIR" "$PREVIOUS_RELEASE" "$KEEP_RELEASES" \
  || printf 'Release retention skipped; inspect manually\n' >&2

echo "$(date --iso-8601=seconds) deployed $SHORT_SHA"
