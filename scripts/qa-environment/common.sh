# Shared by build.sh, start.sh and stop.sh. Not meant to be run on its own.
#
# This repository has no backend stack of its own: it borrows the e2e one of
# twake-calendar-frontend (same side service, same Sabre, same Dex), with the contacts SPA in
# place of the calendar one.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

CALENDAR_REPO="${CALENDAR_REPO:-$REPO_DIR/../twake-calendar-frontend}"
if [ ! -f "$CALENDAR_REPO/e2e/src/test/resources/docker-twake-calendar-e2e.yml" ]; then
  echo "No twake-calendar-frontend checkout at $CALENDAR_REPO" >&2
  echo "    clone https://github.com/linagora/twake-calendar-frontend there, or set CALENDAR_REPO" >&2
  exit 1
fi
CALENDAR_REPO="$(cd "$CALENDAR_REPO" && pwd)"
CALENDAR_E2E_DIR="$CALENDAR_REPO/e2e"

QA_PROJECT="${QA_PROJECT:-twake-contacts-qa}"
NETWORK="${QA_PROJECT}_tcalendar-e2e"

compose() {
  docker compose -p "$QA_PROJECT" \
    -f "$CALENDAR_E2E_DIR/src/test/resources/docker-twake-calendar-e2e.yml" \
    -f "$SCRIPT_DIR/docker-compose.contacts.yml" "$@"
}
