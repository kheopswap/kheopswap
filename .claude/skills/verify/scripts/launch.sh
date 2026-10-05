#!/usr/bin/env bash
# Starts this checkout's verify container (Vite, Chromium, and Talisman restored from ~/.kheopswap), opens a pinned
# app tab over the container's CDP port, and writes the run state that the other scripts read.
# Usage: launch.sh [route]   e.g. launch.sh '#/paseo/portfolio' (default '#/paseo/swap')
# Env: VERIFY_CDP_PORT pins the host CDP port (default: the first free port in 9300-9399).
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(git -C "$SKILL_DIR" rev-parse --show-toplevel)"
STATE_DIR="$SKILL_DIR/.run"
STATE="$STATE_DIR/state.env"
ROUTE="${1:-#/paseo/swap}"
APP_URL="http://localhost:5173/$ROUTE"
WALLET_DIR="$HOME/.kheopswap"
SLUG="$(basename "$ROOT" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9\n' '-')"
CONTAINER="kheopswap-verify-$SLUG"
LABEL=kheopswap-verify.checkout
AGENT_BROWSER_SESSION="kheopswap-verify-$SLUG"

if [[ ! -f "$WALLET_DIR/talisman.json" ]]; then
	cat >&2 <<EOF
FAIL missing $WALLET_DIR/talisman.json, the Talisman backup every verify container restores.
     Make it once from the Talisman extension in your own browser:
     1. Lock Talisman so its login page shows, then click the version number on that page 10 times.
        The support page opens. You can also open
        chrome-extension://fijngjgcjhjmmpcmkeiomlglpeiijkld/support.html directly.
     2. Click Backup, then Save.
     3. mkdir -p ~/.kheopswap && chmod 700 ~/.kheopswap
        mv ~/Downloads/backup.talisman.*.json ~/.kheopswap/talisman.json && chmod 600 ~/.kheopswap/talisman.json
     Use a wallet that holds only test accounts: every container gets a copy.
     Then put that wallet's password in ~/.kheopswap/talisman.password (chmod 600).
EOF
	exit 1
fi
if [[ ! -f "$WALLET_DIR/talisman.password" ]]; then
	cat >&2 <<EOF
FAIL missing $WALLET_DIR/talisman.password. Write the password of the wallet that $WALLET_DIR/talisman.json
     was backed up from into it, then run chmod 600 on it. The container unlocks Talisman with it.
EOF
	exit 1
fi
for tool in docker node agent-browser curl; do
	command -v "$tool" >/dev/null || { echo "FAIL $tool is not installed" >&2; exit 1; }
done
docker info >/dev/null 2>&1 || { echo "FAIL the Docker daemon is not reachable" >&2; exit 1; }

if [[ -f "$STATE" ]]; then
	echo "FAIL a run is already active ($STATE). Run doctor.sh, then cleanup.sh if it is stale." >&2
	exit 1
fi
owner="$(docker inspect -f "{{index .Config.Labels \"$LABEL\"}}" "$CONTAINER" 2>/dev/null || true)"
if [[ -n "$owner" && "$owner" != "$ROOT" ]]; then
	echo "FAIL container $CONTAINER belongs to $owner. Rename this checkout's folder or clean up that one." >&2
	exit 1
elif [[ -n "$owner" ]]; then
	echo "removing $CONTAINER, left over from a run without state"
	docker rm -f "$CONTAINER" >/dev/null
fi

mkdir -p "$STATE_DIR"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
ARTIFACTS="$SKILL_DIR/artifacts/$RUN_ID"
mkdir -p "$ARTIFACTS"
started=$SECONDS
elapsed() { echo "$((SECONDS - started))s"; }

echo "building image kheopswap-verify (about 2 min the first time)"
# Running the id this build printed keeps a parallel build of another checkout's Dockerfile out of this run.
image="$(docker build -q -t kheopswap-verify "$SKILL_DIR/docker")"
echo "$(elapsed) image ready"

CDP="${VERIFY_CDP_PORT:-}"
if [[ -z "$CDP" ]]; then
	for port in $(seq 9300 9399); do
		[[ -n "$(docker ps -aq --filter "publish=$port")" ]] && continue
		(exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null && continue
		CDP=$port
		break
	done
	[[ -n "$CDP" ]] || { echo "FAIL no free port in 9300-9399; set VERIFY_CDP_PORT" >&2; exit 1; }
fi

abort() {
	[[ -f "$STATE" ]] && return
	docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
	echo "launch failed: removed $CONTAINER, logs kept in $ARTIFACTS" >&2
}
trap abort EXIT

# Docker would create missing mount points as root inside the checkout.
mkdir -p "$ROOT/node_modules" "$ROOT/web/node_modules"
docker run -d --init --name "$CONTAINER" --label "$LABEL=$ROOT" --shm-size=2g \
	-p "127.0.0.1:$CDP:9224" \
	-e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" -e ROOT="$ROOT" \
	-v "$ROOT:$ROOT" \
	-v "$CONTAINER-node_modules:$ROOT/node_modules" \
	-v "$CONTAINER-web-node_modules:$ROOT/web/node_modules" \
	-v kheopswap-verify-pnpm:/pnpm \
	-v "$WALLET_DIR:/verify/wallet:ro" \
	-v "$ARTIFACTS:/verify/logs" \
	-w "$ROOT" "$image" >/dev/null
echo "$(elapsed) started $CONTAINER, CDP on 127.0.0.1:$CDP"

last=""
deadline=$((SECONDS + 1200))
while ((SECONDS < deadline)); do
	if [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" != true ]]; then
		docker logs --tail 20 "$CONTAINER" >&2
		echo "FAIL $CONTAINER stopped during '$last', see $ARTIFACTS" >&2
		exit 1
	fi
	status="$(docker exec "$CONTAINER" cat /verify/status 2>/dev/null || true)"
	if [[ -n "$status" && "$status" != "$last" ]]; then
		echo "$(elapsed) $status"
		last=$status
	fi
	case "$status" in
	ready) break ;;
	failed:*)
		echo "FAIL container setup failed while ${status#failed:}, see the logs in $ARTIFACTS" >&2
		exit 1
		;;
	esac
	sleep 1
done
[[ "$last" == ready ]] || { echo "FAIL $CONTAINER not ready after 20 min (last: $last)" >&2; exit 1; }

export AGENT_BROWSER_SESSION
agent-browser --cdp "$CDP" --pin-tab tab new "$APP_URL" >/dev/null
TAB_ID="$(agent-browser tab list --json | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(d.data.tabs.find((t)=>t.active).targetId)')"
EXTENSION="$(docker exec "$CONTAINER" cat /verify/extension)"

cat >"$STATE" <<EOF
export RUN_ID=$RUN_ID
export ARTIFACTS=$ARTIFACTS
export CDP=$CDP
export CONTAINER=$CONTAINER
export AGENT_BROWSER_SESSION=$AGENT_BROWSER_SESSION
export TAB_ID=$TAB_ID
export EXTENSION=$EXTENSION
EOF

agent-browser wait --text "Finalized:" >/dev/null
echo "$(elapsed) ready: $APP_URL"
echo "$(cat "$ARTIFACTS/talisman-source.txt"), unlocked"
echo "source $STATE"
