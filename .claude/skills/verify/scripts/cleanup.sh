#!/usr/bin/env bash
# Removes this run's container and its agent-browser session. Volumes (node_modules, pnpm store) and artifacts stay.
# Usage: cleanup.sh
set -uo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$SKILL_DIR/.run/state.env"

if [[ ! -f "$STATE" ]]; then
	echo "no active run"
	exit 0
fi
# shellcheck disable=SC1090
source "$STATE"

agent-browser close >/dev/null 2>&1 && echo "closed agent-browser session $AGENT_BROWSER_SESSION"
docker rm -f "$CONTAINER" >/dev/null 2>&1 && echo "removed container $CONTAINER"

rm "$STATE"
echo "artifacts kept in $ARTIFACTS"
