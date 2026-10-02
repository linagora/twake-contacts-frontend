#!/bin/bash
#
# Stops the QA environment started by start.sh and drops its data.
#
#   scripts/qa-environment/stop.sh
#   KEEP_DATA=true scripts/qa-environment/stop.sh   # keeps the volumes for the next start
#
set -euo pipefail

source "$(dirname "$0")/common.sh"

KEEP_DATA="${KEEP_DATA:-false}"

if [ "$KEEP_DATA" = "true" ]; then
  compose down
else
  compose down --volumes
fi
echo "==> QA environment '$QA_PROJECT' stopped"
