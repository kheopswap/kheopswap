#!/usr/bin/env bash
# Tears down only what launch.sh started: the app tab, the dev server process group, and the dev
# Chrome if launch.sh had to start it. Artifacts stay in place.
# Usage: cleanup.sh
set -uo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$SKILL_DIR/.run/state.env"
export AGENT_BROWSER_SESSION=kheopswap-verify

if [[ ! -f "$STATE" ]]; then
	echo "no active run"
	exit 0
fi
# shellcheck disable=SC1090
source "$STATE"

curl -sf -o /dev/null "http://127.0.0.1:9222/json/close/$TAB_ID" && echo "closed tab $TAB_ID"

if [[ -n "$DEV_PGID" ]] && kill -0 "$DEV_PGID" 2>/dev/null; then
	kill -- -"$DEV_PGID" && echo "stopped dev server process group $DEV_PGID"
fi

if [[ -n "$CHROME_PID" ]] && kill -0 "$CHROME_PID" 2>/dev/null; then
	kill "$CHROME_PID" && echo "quit dev Chrome pid $CHROME_PID"
fi

rm "$STATE"
echo "artifacts kept in $ARTIFACTS"
