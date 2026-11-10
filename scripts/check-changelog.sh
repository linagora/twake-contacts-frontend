#!/bin/sh
# Fails when the changes since <base-ref> touch the app (apps/, common/, public/) without
# updating CHANGELOG.md, unless a commit message contains "[no changelog]".
#
#   scripts/check-changelog.sh origin/main
set -eu

if [ $# -ne 1 ]; then
  echo "Usage: $0 <base-ref>" >&2
  exit 2
fi
base="$1"

changed_files=$(git diff --name-only "$base...HEAD")

if ! printf '%s\n' "$changed_files" | grep -qE '^(apps|common|public)/'; then
  echo "No change under apps/, common/ or public/: CHANGELOG.md update not required."
  exit 0
fi

if printf '%s\n' "$changed_files" | grep -qx 'CHANGELOG.md'; then
  echo "CHANGELOG.md is updated."
  exit 0
fi

if git log --format=%B "$base..HEAD" | grep -qF '[no changelog]'; then
  echo "A commit message contains [no changelog]: CHANGELOG.md update skipped."
  exit 0
fi

echo "apps/, common/ or public/ changed but CHANGELOG.md did not." >&2
echo "Add an entry under '## [Unreleased]' in CHANGELOG.md, or put [no changelog] in a commit message." >&2
exit 1
