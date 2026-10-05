#!/usr/bin/env bash
# Starts (or reuses) this checkout's dev server and the dev Chrome, opens a pinned app tab,
# and writes the run state that doctor.sh and cleanup.sh read.
# Usage: launch.sh [route]   e.g. launch.sh '#/paseo/portfolio' (default '#/paseo/swap')
# Env: VERIFY_CDP_PORT (default 9222), VERIFY_CHROME_BIN, VERIFY_CHROME_PROFILE override the per-OS defaults.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(git -C "$SKILL_DIR" rev-parse --show-toplevel)"
STATE_DIR="$SKILL_DIR/.run"
STATE="$STATE_DIR/state.env"
ROUTE="${1:-#/paseo/swap}"
APP_URL="http://localhost:5173/$ROUTE"
CDP="${VERIFY_CDP_PORT:-9222}"
if [[ "$(uname)" == Darwin ]]; then
	CHROME_BIN="${VERIFY_CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
	CHROME_PROFILE="${VERIFY_CHROME_PROFILE:-$HOME/Library/Application Support/Chrome-MCP-Profile}"
else
	CHROME_BIN="${VERIFY_CHROME_BIN:-$(command -v google-chrome-stable google-chrome chromium | head -1 || true)}"
	CHROME_PROFILE="${VERIFY_CHROME_PROFILE:-${XDG_CONFIG_HOME:-$HOME/.config}/Chrome-MCP-Profile}"
fi
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
CHROME_PID=""
abort() {
	[[ -f "$STATE" ]] && return
	if [[ -n "$CHROME_PID" ]]; then kill "$CHROME_PID" 2>/dev/null || true; fi
	if [[ -n "$DEV_PGID" ]]; then kill -- -"$DEV_PGID" 2>/dev/null || true; fi
}
trap abort EXIT

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
	curl -sf -o /dev/null http://localhost:5173/ || { echo "FAIL dev server not answering after 60s" >&2; exit 1; }
	echo "started dev server, process group $DEV_PGID"
fi

if ! curl -sf -o /dev/null "http://127.0.0.1:$CDP/json/version"; then
	[[ -x "$CHROME_BIN" ]] || { echo "FAIL no Chrome binary found; set VERIFY_CHROME_BIN" >&2; exit 1; }
	chrome_args=(--no-default-browser-check --no-first-run --remote-debugging-port="$CDP" --user-data-dir="$CHROME_PROFILE")
	if [[ "$(uname)" == Darwin || -n "${WAYLAND_DISPLAY:-}${DISPLAY:-}" ]]; then
		chrome_args+=(--no-startup-window)
	elif wayland="$(find "${XDG_RUNTIME_DIR:-/run/user/$UID}" -maxdepth 1 -type s -name 'wayland-[0-9]*' -printf '%f\n' 2>/dev/null | head -1)" && [[ -n "$wayland" ]]; then
		export WAYLAND_DISPLAY="$wayland"
		chrome_args+=(--no-startup-window)
	else
		echo "no desktop session: starting Chrome headless, so nobody can unlock Talisman or see its popups"
		chrome_args+=(--headless=new)
	fi
	nohup "$CHROME_BIN" "${chrome_args[@]}" >"$ARTIFACTS/chrome.log" 2>&1 &
	CHROME_PID=$!
	for _ in $(seq 1 40); do
		curl -sf -o /dev/null "http://127.0.0.1:$CDP/json/version" && break
		sleep 0.5
	done
	curl -sf -o /dev/null "http://127.0.0.1:$CDP/json/version" || { echo "FAIL Chrome not answering on CDP $CDP, see $ARTIFACTS/chrome.log" >&2; exit 1; }
	echo "started dev Chrome pid $CHROME_PID"
fi

agent-browser --cdp $CDP --pin-tab tab new "$APP_URL" >/dev/null
TAB_ID="$(agent-browser tab list --json | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(d.data.tabs.find((t)=>t.active).targetId)')"

cat >"$STATE" <<EOF
RUN_ID=$RUN_ID
ARTIFACTS=$ARTIFACTS
CDP=$CDP
DEV_PGID=$DEV_PGID
CHROME_PID=$CHROME_PID
TAB_ID=$TAB_ID
EOF

agent-browser wait --text "Finalized:" >/dev/null
echo "ready: $APP_URL"
echo "tab $TAB_ID in session $AGENT_BROWSER_SESSION"
echo "export AGENT_BROWSER_SESSION=$AGENT_BROWSER_SESSION ARTIFACTS=$ARTIFACTS"
