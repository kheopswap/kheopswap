#!/usr/bin/env bash
# Container side of launch.sh: installs the checkout's deps, starts Vite and a Chromium with Talisman restored
# from ~/.kheopswap (mounted at /verify/wallet), then keeps running. Progress goes to /verify/status:
# installing, starting-vite, installing-talisman, restoring, unlocking, then ready or failed:<step>.
# Logs go to /verify/logs, the run's artifacts folder on the host.
set -euo pipefail

if [[ "$(id -u)" == 0 ]]; then
	mkdir -p /verify/home
	for dir in /verify /verify/home /pnpm "$ROOT/node_modules" "$ROOT/web/node_modules"; do
		[[ "$(stat -c %u:%g "$dir")" == "$HOST_UID:$HOST_GID" ]] || chown "$HOST_UID:$HOST_GID" "$dir"
	done
	exec setpriv --reuid "$HOST_UID" --regid "$HOST_GID" --clear-groups "$0" "$@"
fi

export HOME=/verify/home XDG_CACHE_HOME=/pnpm/cache XDG_DATA_HOME=/pnpm/data
export CI=1 SKIP_INSTALL_SIMPLE_GIT_HOOKS=1
STORE_URL="https://clients2.google.com/service/update2/crx?response=redirect&prodversion=152.0&acceptformat=crx2,crx3&x=id%3Dfijngjgcjhjmmpcmkeiomlglpeiijkld%26uc"
logs=/verify/logs
step=starting
status() {
	step=$1
	echo "$1" >/verify/status
	echo "$(date +%T) $1"
}
trap 'echo "failed:$step" >/verify/status' ERR

wait_for() {
	for _ in $(seq 1 "$2"); do
		curl -sf -o /dev/null "$1" && return
		sleep 1
	done
	echo "$1 not answering after $2 s" >&2
	return 1
}

status installing
pnpm install --frozen-lockfile --store-dir /pnpm/store >"$logs/install.log" 2>&1

status starting-vite
pnpm dev --strictPort >"$logs/dev-server.log" 2>&1 &
vite=$!
wait_for http://localhost:5173/ 120

status installing-talisman
mkdir -p /verify/talisman
if curl -sfL --max-time 120 -o /verify/talisman.crx "$STORE_URL" && { unzip -qo /verify/talisman.crx -d /verify/talisman || (($? <= 1)); }; then
	source="Chrome Web Store"
elif [[ -f /verify/wallet/talisman.zip ]]; then
	rm -rf /verify/talisman/*
	unzip -qo /verify/wallet/talisman.zip -d /verify/talisman
	source="~/.kheopswap/talisman.zip"
else
	echo "Chrome Web Store download failed and ~/.kheopswap/talisman.zip does not exist" >&2
	false
fi
extension="$(dirname "$(find /verify/talisman -maxdepth 2 -name manifest.json | head -1)")"
echo "Talisman $(node -p "require('$extension/manifest.json').version") from $source" | tee "$logs/talisman-source.txt"

# Without Developer mode, the chrome.runtime.reload() that ends a restore unloads a --load-extension extension.
mkdir -p /verify/profile/Default
echo '{"extensions":{"ui":{"developer_mode":true}}}' >/verify/profile/Default/Preferences
xvfb-run --auto-servernum --server-args="-screen 0 1440x900x24" chromium \
	--user-data-dir=/verify/profile --remote-debugging-port=9223 --no-sandbox --no-first-run \
	--no-default-browser-check --password-store=basic --window-size=1440,900 \
	--disable-extensions-except="$extension" --load-extension="$extension" about:blank \
	>"$logs/chromium.log" 2>&1 &
# Chromium serves CDP on 127.0.0.1 only; this relay is what the published host port reaches.
socat TCP-LISTEN:9224,fork,reuseaddr TCP:127.0.0.1:9223 >"$logs/socat.log" 2>&1 &
wait_for http://127.0.0.1:9223/json/version 30

status restoring
node /opt/verify/setup-wallet.mjs restore >>"$logs/setup-wallet.log" 2>&1

status unlocking
node /opt/verify/setup-wallet.mjs unlock >>"$logs/setup-wallet.log" 2>&1

status ready
wait "$vite" || true
status failed:vite-exited
