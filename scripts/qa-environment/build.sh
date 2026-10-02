#!/bin/bash
#
# Builds the docker images start.sh runs: the SPA bundle, the production frontend image layered
# with the QA runtime configuration, and the backend images of the twake-calendar e2e stack.
#
#   scripts/qa-environment/build.sh                      # rebuilds the SPA bundle from the working tree
#   FORCE_FRONTEND_BUILD=false scripts/qa-environment/build.sh   # reuses apps/private/dist if present
#   scripts/qa-environment/build.sh <sabre image>        # tests against a candidate esn-sabre build
#   CALENDAR_REPO=/path/to/twake-calendar-frontend scripts/qa-environment/build.sh
#
set -euo pipefail

source "$(dirname "$0")/common.sh"

# QA is about the code in the working tree: never reuse a stale bundle unless asked to.
FORCE_FRONTEND_BUILD="${FORCE_FRONTEND_BUILD:-true}"

# npm records the installed tree in node_modules/.package-lock.json: a lockfile newer than it
# means node_modules no longer matches what the branch asks for.
NEEDS_INSTALL='[ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]'

echo "==> Building the SPA bundle"
if [ "$FORCE_FRONTEND_BUILD" = "true" ] || [ ! -d "$REPO_DIR/apps/private/dist" ]; then
  NODE_MAJOR="$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/')"
  if [ -n "$NODE_MAJOR" ] && [ "$NODE_MAJOR" -ge 24 ]; then
    (cd "$REPO_DIR" && { ! eval "$NEEDS_INSTALL" || npm ci; } && npm run build:private)
  else
    # The repo needs Node 24+. Fall back to a container so that a developer running an
    # older Node -- or none at all -- can still build it.
    echo "Local Node is ${NODE_MAJOR:-absent}, building the bundle with node:24 in docker"
    docker run --rm \
      --user "$(id -u):$(id -g)" \
      -e HOME=/tmp \
      -e npm_config_cache=/tmp/.npm \
      -v "$REPO_DIR:/app" -w /app \
      node:24 sh -c "if $NEEDS_INSTALL; then npm ci; fi && npm run build:private"
  fi
else
  echo "Reusing existing apps/private/dist, built $(find "$REPO_DIR/apps/private/dist" -name 'index.html' -printf '%TY-%Tm-%Td %TH:%TM\n' 2>/dev/null || echo 'at an unknown time')"
fi

echo "==> Building the production frontend image"
docker build --quiet -f "$REPO_DIR/apps/private/Dockerfile" \
  --build-arg BUILD_VERSION=qa \
  -t twake-contacts-web-qa-base "$REPO_DIR"

echo "==> Layering the QA runtime configuration on top of it"
docker build --quiet -f "$SCRIPT_DIR/Dockerfile.frontend" -t twake-contacts-web-qa "$SCRIPT_DIR"

echo "==> Building the backend images from $CALENDAR_E2E_DIR"
docker build --quiet --pull -f "$CALENDAR_E2E_DIR/docker/Dockerfile.tcalendar" -t tcalendar-e2e "$CALENDAR_E2E_DIR"
docker build --quiet --pull -f "$CALENDAR_E2E_DIR/docker/Dockerfile.ldap" -t ldap-e2e "$CALENDAR_E2E_DIR"
docker build --quiet --pull -f "$CALENDAR_E2E_DIR/docker/Dockerfile.dex" -t tcalendar-dex-e2e "$CALENDAR_E2E_DIR"
docker build --quiet --pull -f "$CALENDAR_E2E_DIR/docker/Dockerfile.proxy" -t tcalendar-proxy-e2e "$CALENDAR_E2E_DIR"

# $1: Sabre image to test against, e.g. a candidate esn-sabre build
if [ -n "${1:-}" ]; then
  echo "==> Building the sabre image from $1"
  docker build --quiet --build-arg SABRE_IMAGE="$1" -t sabre-e2e -f "$CALENDAR_E2E_DIR/docker/Dockerfile.sabre" "$CALENDAR_E2E_DIR"
else
  docker build --quiet --pull -t sabre-e2e -f "$CALENDAR_E2E_DIR/docker/Dockerfile.sabre" "$CALENDAR_E2E_DIR"
fi

echo "==> All QA images built"
