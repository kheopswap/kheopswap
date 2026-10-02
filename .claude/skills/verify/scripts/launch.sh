#!/usr/bin/env bash
# Starts (or reuses) this checkout's dev server and the dev Chrome, opens a pinned app tab,
# and writes the run state that doctor.sh and cleanup.sh read.
# Usage: launch.sh [route]   e.g. launch.sh '#/paseo/portfolio' (default '#/paseo/swap')
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(git -C "$SKILL_DIR" rev-parse --show-toplevel)"
STATE_DIR="$SKILL_DIR/.run"
STATE="$STATE_DIR/state.env"
ROUTE="${1:-#/paseo/swap}"
APP_URL="http://localhost:5173/$ROUTE"
CDP=9222
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME_PROFILE="$HOME/Library/Application Support/Chrome-MCP-Profile"
export AGENT_BROWSER_SESSION=kheopswap-verify

if [[ -f "$STATE" ]]; then
	echo "FAIL a run is already active ($STATE). Run doctor.sh, then cleanup.sh if it is stale." >&2
	exit 1
fi

mkdir -p "$STATE_DIR"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
ARTIFACTS="$SKILL_DIR/artifacts/$RUN_ID"
mkdir -p "$ARTIFACTS"

DEV_PGID=""
listener="$(lsof -t -nP -iTCP:5173 -sTCP:LISTEN 2>/dev/null | head -1 || true)"
if [[ -n "$listener" ]]; then
	owner_cwd="$(lsof -a -p "$listener" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"
	if [[ "$owner_cwd" != "$ROOT/web" ]]; then
		echo "FAIL port 5173 is held by pid $listener running in $owner_cwd, not $ROOT/web." >&2
		echo "     It is not ours to kill. Ask the user before freeing 5173." >&2
		exit 1
	fi
	echo "reusing dev server pid $listener from this checkout (cleanup will leave it running)"
else
	set -m
	(cd "$ROOT" && exec nohup pnpm dev --strictPort >"$ARTIFACTS/dev-server.log" 2>&1) &
	DEV_PGID=$!
	set +m
	for _ in $(seq 1 120); do
		curl -sf -o /dev/null http://localhost:5173/ && break
		kill -0 "$DEV_PGID" 2>/dev/null || { echo "FAIL dev server exited, see $ARTIFACTS/dev-server.log" >&2; exit 1; }
		sleep 0.5
	done
	curl -sf -o /dev/null http://localhost:5173/ || { echo "FAIL dev server not answering after 60s" >&2; kill -- -"$DEV_PGID"; exit 1; }
	echo "started dev server, process group $DEV_PGID"
fi

CHROME_PID=""
if ! curl -sf -o /dev/null "http://127.0.0.1:$CDP/json/version"; then
	nohup "$CHROME_BIN" --no-startup-window --no-default-browser-check --no-first-run \
		--remote-debugging-port=$CDP --user-data-dir="$CHROME_PROFILE" >/dev/null 2>&1 &
	CHROME_PID=$!
	for _ in $(seq 1 40); do
		curl -sf -o /dev/null "http://127.0.0.1:$CDP/json/version" && break
		sleep 0.5
	done
	echo "started dev Chrome pid $CHROME_PID"
fi

agent-browser --cdp $CDP --pin-tab tab new "$APP_URL" >/dev/null
TAB_ID="$(agent-browser tab list --json | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(d.data.tabs.find((t)=>t.active).targetId)')"

cat >"$STATE" <<EOF
RUN_ID=$RUN_ID
ARTIFACTS=$ARTIFACTS
DEV_PGID=$DEV_PGID
CHROME_PID=$CHROME_PID
TAB_ID=$TAB_ID
EOF

agent-browser wait --text "Finalized:" >/dev/null
echo "ready: $APP_URL"
echo "tab $TAB_ID in session $AGENT_BROWSER_SESSION"
echo "export AGENT_BROWSER_SESSION=$AGENT_BROWSER_SESSION ARTIFACTS=$ARTIFACTS"
