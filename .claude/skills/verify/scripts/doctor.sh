#!/usr/bin/env bash
# Read-only health check: is this instance worth driving? Exit 0 only when every check passes.
# Usage: doctor.sh
set -uo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(git -C "$SKILL_DIR" rev-parse --show-toplevel)"
STATE="$SKILL_DIR/.run/state.env"
CDP="${VERIFY_CDP_PORT:-9222}"
export AGENT_BROWSER_SESSION=kheopswap-verify
failed=0
if [[ -f "$STATE" ]]; then
	# shellcheck disable=SC1090
	source "$STATE"
fi
ok() { echo "OK   $*"; }
fail() { echo "FAIL $*"; failed=1; }

listener="$(lsof -t -nP -iTCP:5173 -sTCP:LISTEN 2>/dev/null | head -1)"
if [[ -z "$listener" ]]; then
	fail "nothing listens on 5173 (run launch.sh)"
else
	owner_cwd="$(lsof -a -p "$listener" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"
	if [[ "$owner_cwd" == "$ROOT/web" ]]; then
		ok "5173 served by pid $listener from this checkout"
	else
		fail "5173 served by pid $listener from $owner_cwd, not $ROOT/web"
	fi
	if curl -sf http://localhost:5173/ | grep -q "<title>Kheopswap"; then
		ok "http://localhost:5173 answers with the Kheopswap shell"
	else
		fail "http://localhost:5173 does not serve the Kheopswap shell"
	fi
fi

if browser="$(curl -sf "http://127.0.0.1:$CDP/json/version")"; then
	mode=headed
	[[ "$browser" == *HeadlessChrome* ]] && mode="headless: nobody can unlock Talisman"
	ok "dev Chrome on CDP $CDP: $(echo "$browser" | sed -n 's/.*"Browser": "\(.*\)".*/\1/p') ($mode)"
else
	fail "no Chrome on CDP $CDP (run launch.sh)"
fi

if [[ -f "$STATE" ]]; then
	ok "run $RUN_ID active, artifacts in $ARTIFACTS"
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
else
	echo "--   no active run (launch.sh not run, or already cleaned up)"
fi

popups="$(VERIFY_CDP_PORT=$CDP node "$SKILL_DIR/scripts/talisman.mjs" list 2>/dev/null)"
if [[ -n "$popups" ]]; then
	echo "WARN Talisman popups are open; settle them before driving:"
	echo "$popups" | sed 's/^/     /'
fi

exit $failed
