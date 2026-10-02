#!/bin/bash
#
# Starts a long lived contacts stack for manual or agent driven exploratory QA, under its own
# compose project, until stop.sh is called.
#
#   scripts/qa-environment/build.sh    # once, and whenever the code under test changes
#   scripts/qa-environment/start.sh
#   QA_USERS="alice bob" scripts/qa-environment/start.sh
#
# Accounts are <uid>@open-paas.org, password "secret".
#
set -euo pipefail

source "$(dirname "$0")/common.sh"

QA_USERS="${QA_USERS:-alice bob}"
IMAGES=(twake-contacts-web-qa tcalendar-e2e ldap-e2e tcalendar-dex-e2e tcalendar-proxy-e2e sabre-e2e)
# Everything but the calendar `public` SPA, which contacts has no use for
SERVICES=(frontend proxy sso twake-calendar-side-service mock-smtp)

# runs curl from inside the stack network, where every service answers to its own name
curl_in_network() {
  docker run --rm --network "$NETWORK" curlimages/curl -s "$@"
}

missing_image() {
  for image in "${IMAGES[@]}"; do
    docker image inspect "$image" >/dev/null 2>&1 || { echo "    missing image: $image" >&2; return 0; }
  done
  return 1
}

if missing_image; then
  echo "Some images are missing, build them first: scripts/qa-environment/build.sh" >&2
  exit 1
fi

echo "==> Starting the stack as compose project '$QA_PROJECT'"
compose up -d "${SERVICES[@]}"

echo "==> Waiting for the side service"
for _ in $(seq 1 120); do
  if compose logs twake-calendar-side-service 2>/dev/null | grep -q "StartUpChecks all succeeded"; then
    ready=true
    break
  fi
  sleep 5
done
if [ "${ready:-false}" != "true" ]; then
  echo "The side service did not start within 10 minutes, see: docker compose -p $QA_PROJECT logs" >&2
  exit 1
fi

echo "==> Creating the QA accounts"
for uid in $QA_USERS; do
  email="$uid@open-paas.org"
  printf 'dn: uid=%s,ou=users,dc=open-paas.org,dc=lng\nobjectClass: inetOrgPerson\nuid: %s\ncn: %s\nsn: %s\ngivenName: %s\nmail: %s\nuserPassword: secret\n' \
      "$uid" "$uid" "$uid" "$uid" "$uid" "$email" \
    | compose exec -T ldap ldapadd -x -H ldap://localhost:389 \
        -D cn=admin,dc=open-paas.org,dc=lng -w admin >/dev/null 2>&1 \
    || echo "    $uid already exists in the directory"
  id="$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  status="$(curl_in_network -o /dev/null -w '%{http_code}' -X POST \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"firstname\":\"$uid\",\"lastname\":\"$uid\",\"id\":\"$id\"}" \
    http://twake-calendar-side-service:8000/registeredUsers)"
  case "$status" in
    201) echo "    $email / secret" ;;
    409) echo "    $email / secret (already registered)" ;;
    *) echo "The side service refused to register $email: HTTP $status" >&2; exit 1 ;;
  esac
done

ip() {
  docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \
    "$(compose ps -q "$1")"
}

# The stack publishes no port, and container IPs are routable from a Linux host.
RULES="MAP localhost:8099 $(ip frontend):80,MAP api $(ip proxy):80,MAP dav $(ip proxy):80,MAP sso $(ip sso):5554"

cat <<INFO

==> The QA environment is up

From a browser on this host (Linux):
  chromium --user-data-dir=\$(mktemp -d) --ignore-certificate-errors \\
    --host-resolver-rules="$RULES" \\
    http://localhost:8099

From a container (e.g. Playwright), join the network '$NETWORK' and use:
  --host-resolver-rules="MAP localhost:8099 frontend:80,MAP api proxy:80,MAP dav proxy:80,MAP sso sso:5554"

Stop it with: scripts/qa-environment/stop.sh
INFO
