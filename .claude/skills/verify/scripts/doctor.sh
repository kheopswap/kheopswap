#!/usr/bin/env bash
# Read-only health check: is this run's container worth driving? Exit 0 only when every check passes.
# Usage: doctor.sh
set -uo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$SKILL_DIR/.run/state.env"
failed=0
ok() { echo "OK   $*"; }
fail() { echo "FAIL $*"; failed=1; }

if [[ ! -f "$STATE" ]]; then
	fail "no active run (run launch.sh)"
	exit 1
fi
# shellcheck disable=SC1090
source "$STATE"
ok "run $RUN_ID active, artifacts in $ARTIFACTS"

if [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" == true ]]; then
	status="$(docker exec "$CONTAINER" cat /verify/status 2>/dev/null)"
	if [[ "$status" == ready ]]; then
		ok "container $CONTAINER is ready ($(cat "$ARTIFACTS/talisman-source.txt"))"
	else
		fail "container $CONTAINER status is '$status', see the logs in $ARTIFACTS"
	fi
	if docker exec "$CONTAINER" curl -sf http://localhost:5173/ | grep -q "<title>Kheopswap"; then
		ok "http://localhost:5173 in the container answers with the Kheopswap shell"
	else
		fail "http://localhost:5173 in the container does not serve the Kheopswap shell, see $ARTIFACTS/dev-server.log"
	fi
else
	fail "container $CONTAINER is not running; run cleanup.sh then launch.sh"
fi

if browser="$(curl -sf "http://127.0.0.1:$CDP/json/version")"; then
	ok "Chromium on CDP 127.0.0.1:$CDP: $(echo "$browser" | sed -n 's/.*"Browser": "\(.*\)".*/\1/p')"
else
	fail "nothing answers on CDP 127.0.0.1:$CDP"
fi

if curl -sf "http://127.0.0.1:$CDP/json" | grep -q "\"id\": \"$TAB_ID\""; then
	ok "app tab $TAB_ID is open"
	wallets="$(agent-browser eval 'Object.keys(window.injectedWeb3 ?? {}).join(",")' 2>/dev/null)"
	if [[ "$wallets" == *talisman* ]]; then
		ok "Talisman is injected in the app tab ($wallets)"
	else
		fail "Talisman is not injected in the app tab (got: $wallets)"
	fi
else
	fail "app tab $TAB_ID is gone; run cleanup.sh then launch.sh"
fi

if node "$SKILL_DIR/scripts/talisman.mjs" status --timeout 5 >/dev/null 2>&1; then
	ok "Talisman is unlocked"
else
	fail "Talisman is locked (it auto-locks after 15 min); run: node $SKILL_DIR/scripts/talisman.mjs unlock"
fi

popups="$(node "$SKILL_DIR/scripts/talisman.mjs" list 2>/dev/null)"
if [[ -n "$popups" ]]; then
	echo "WARN Talisman popups are open; settle them before driving:"
	echo "$popups" | sed 's/^/     /'
fi

exit $failed
