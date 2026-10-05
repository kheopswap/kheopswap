---
name: verify
description: Drive the Kheopswap web app (React DEX for Polkadot Asset Hubs) in the dev Chrome with the Talisman wallet, the way a user does, and capture proof. Use to verify a UI change, reproduce a bug in the browser, or prove that a swap, transfer, portfolio, pool, or network/account flow works, including signing a real transaction with a Guardians test account.
---

# Verify Kheopswap

The surface is the web app at `http://localhost:5173` (Vite dev server, hash routes such as `#/paseo/swap`). It is the only origin this app is tested from. The driver is `agent-browser` attached over CDP to the persistent dev Chrome on port 9222 (`VERIFY_CDP_PORT`). Talisman popups are invisible to `agent-browser`, so `scripts/talisman.mjs` drives them over raw CDP.

## The dev Chrome profile

Signing needs a Chrome profile with Talisman installed, `Guardians SUB` imported, and the wallet connected to `http://localhost:5173`. `launch.sh` uses this profile:

| OS | Binary | Profile | State |
|---|---|---|---|
| macOS | `/Applications/Google Chrome.app` | `~/Library/Application Support/Chrome-MCP-Profile` | Set up with Talisman. |
| Linux | first of `google-chrome-stable`, `google-chrome`, `chromium` | `~/.config/Chrome-MCP-Profile` | No Talisman yet (checked 2026-10-05). |

`VERIFY_CHROME_BIN`, `VERIFY_CHROME_PROFILE` and `VERIFY_CDP_PORT` override the defaults. Every script reads `VERIFY_CDP_PORT`.

Without Talisman the doctor fails on `Talisman is not injected`. Wallet-free surfaces still drive: quotes, token pickers, the portfolio in `Tokens` mode, the pool list and pool pages. Report every account or signing step as unreachable, with the missing profile as the reason.

On Linux, `~/.talisman-dev/chrome-data` belongs to the Talisman repo's own verify skill: its `pnpm dev` starts it with a dev build of the extension, on CDP 9223. Don't launch or edit it from here.

All scripts live in `scripts/` next to this file. Run them from anywhere in the checkout. Feature recipes live in [`features/`](features/README.md). Read the matching feature file before driving.

## Isolation: one run at a time

Nothing here isolates. Every checkout and worktree shares port 5173, and every run shares the one dev Chrome and its wallet. `launch.sh` refuses to start when a run is already active, or when another checkout's Vite holds 5173. Don't free 5173 or kill a dev server you did not start. Report the owner pid and its working directory, then ask the user.

## Networks

- **Paseo (`#/paseo/...`) is the default for everything.** It is a testnet: Guardians SUB holds about 5K PAS there, and PAS/USDC and PAS/USDt pools are deep.
- **Polkadot (`#/polkadot/...`) is the fallback when Paseo is broken.** Paseo breaks from time to time: RPC down, or a runtime upgrade the app can't sign for yet. Use mainnet only for that, with tiny amounts (≤ 0.01 DOT), and say in the report that mainnet was used and why.
- Kusama and Westend: read-only checks only.

Known Paseo break, first seen 2026-10-03 and still there on 2026-10-05: every submit fails before Talisman opens. The follow-up dialog reads `Transaction failed` and `PJS does not support this signed-extension: AsPgas`. polkadot-api's `pjs-signer` rejects signed extensions it does not know. Until that is fixed, prove signing flows on Polkadot and report the Paseo failure as a finding.

## Launch

```bash
.claude/skills/verify/scripts/launch.sh '#/paseo/swap'
export AGENT_BROWSER_SESSION=kheopswap-verify
source .claude/skills/verify/.run/state.env   # RUN_ID, ARTIFACTS, TAB_ID
```

`launch.sh` does the following:

1. It reuses this checkout's dev server if one is already running. Otherwise it starts `pnpm dev --strictPort` in its own process group and logs to `$ARTIFACTS/dev-server.log`.
2. It starts the dev Chrome only when nothing answers on the CDP port. With no desktop session (no `DISPLAY`, `WAYLAND_DISPLAY`, or `wayland-*` socket in `$XDG_RUNTIME_DIR`), it starts Chrome with `--headless=new`. Nobody can then unlock Talisman or see its popups. The agent shell often lacks `WAYLAND_DISPLAY`, so `launch.sh` finds the socket itself. Chrome logs to `$ARTIFACTS/chrome.log`.
3. It opens a pinned tab in the `kheopswap-verify` session.
4. It waits until the footer shows `Finalized:`, which means the chain connection is live.

Startup takes about 15 s, plus `pnpm install` in a fresh worktree. Light clients are disabled by `VITE_DISABLE_LIGHT_CLIENTS=true` in the committed `web/.env`, so the app talks to RPC nodes.

## Doctor

```bash
.claude/skills/verify/scripts/doctor.sh
```

The doctor is read-only. Each line starts with `OK` or `FAIL`, and the exit code is 0 only when all checks pass. It checks:

- 5173 is served from this checkout's `web/` and returns the Kheopswap shell.
- The dev Chrome answers on the CDP port, and the doctor reports whether it is headless.
- The run state exists, and the recorded tab is still open.
- Talisman is injected (`window.injectedWeb3.talisman`).

It also warns about open Talisman popups. Run it first, and again whenever anything looks off.

## Drive

Use `agent-browser` commands against the pinned tab. Prefer roles and accessible names:

```bash
agent-browser find role button click --name "Swap" --exact      # --exact: "Swap token direction" also matches
agent-browser find role textbox fill "1" --name "Amount to swap"
agent-browser wait --text "Transaction succeeded"                # never fixed sleeps for app state
agent-browser get text "#main-content"                           # whole form + summary as text
agent-browser snapshot -i -c                                     # refs for unnamed elements
```

Navigate by URL: `agent-browser open "http://localhost:5173/#/paseo/portfolio"`. Drawers (account, token, network, slippage, token details) open as dialogs with a heading such as `Select account`. They slide in and out for 300 ms. A click inside a drawer that is still opening is lost, and a closing drawer's overlay swallows clicks. After you open or close a drawer, run:

```bash
.claude/skills/verify/scripts/wait-drawer.sh open     # after the click that opens it
.claude/skills/verify/scripts/wait-drawer.sh closed   # after Escape, Close, or a choice that closes it
```

`wait --text "<heading>"` is not enough: it returns while the drawer is still sliding in.

### Signing with Talisman

Click the submit button, then run:

```bash
node .claude/skills/verify/scripts/talisman.mjs approve --signer "Guardians" > "$ARTIFACTS/talisman-approve.txt"
```

The helper:

- waits for the popup;
- prints the request text;
- clicks `Approve` only when the text names the signer;
- waits for the popup to close.

It exits with one of these codes:

| Code | Meaning | What to do |
|---|---|---|
| 0 | Approved | Continue. |
| 1 | No popup appeared | Read the app's toasts: the app usually failed before signing. |
| 2 | Signer mismatch, nothing clicked | Fix the account selection. |
| 3 | Talisman is locked | Ask the user to unlock it. Never guess the password. |

Other subcommands: `list`, `text`, `connect`, `reject`. Only `approve` and `list` have been run against a real popup, and only on macOS.

Only accounts with "Guardians" in their name may sign: `Guardians SUB` (substrate, `5CcU6DRpocLUWYJHuNLjB4gGyHJrkWuruQD5XFbRYffCfSAP`). The `0x5C9E...Fc5f67` Ethereum account is not a Guardians account. Select `Guardians SUB` in the form's `Account` or `From` field before you submit.

## Evidence

Write everything under `$ARTIFACTS` (`.claude/skills/verify/artifacts/<run-id>/`, gitignored). Cleanup keeps it. For each proof:

- Capture the state before the action (`get text "#main-content"` plus a screenshot) and after it.
- For transactions, capture:
  - the Talisman request text;
  - the follow-up dialog at `Transaction succeeded`, which follows `Waiting for finalization`;
  - a second view of the side effect: the account balance in the `Account` drawer, or the token's `Portfolio` rows in Portfolio → token → `Token Details`.
- Drive the real user path through the UI. Don't call services, set localStorage, or call `api.tx` from the console.
- When a check fails, keep the screenshot and the exact toast or error text as the finding.

Name files by feature and step, for example `swap-quote.png`, `swap-finalized.png`, and `balances-after.txt`.

## Cleanup

```bash
.claude/skills/verify/scripts/cleanup.sh
```

Cleanup closes only the recorded tab and stops only the dev server process group that `launch.sh` started. It quits Chrome only if `launch.sh` started it. It removes `.run/state.env` and prints where the artifacts are. Never use `agent-browser close --all`, and never kill by process name: the dev Chrome and any dev server you reused belong to the user. Run cleanup after every run, failed runs included.
