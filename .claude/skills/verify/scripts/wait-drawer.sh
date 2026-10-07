#!/usr/bin/env bash
# Waits for a drawer to finish its slide transition: clicks inside a drawer that is still opening are lost,
# and a closing drawer's overlay swallows clicks on the page.
# Usage: wait-drawer.sh open|closed
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/../.run/state.env"

case "${1:-}" in
open)
	agent-browser wait --fn "(() => { const d = document.querySelector('[role=dialog][data-open]'); return !!d && !d.hasAttribute('data-starting-style') && d.getAnimations().length === 0; })()" >/dev/null
	;;
closed)
	agent-browser wait --fn "!document.querySelector('[role=dialog]')" >/dev/null
	;;
*)
	echo "usage: wait-drawer.sh open|closed" >&2
	exit 1
	;;
esac
