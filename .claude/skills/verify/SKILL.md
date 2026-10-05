---
name: verify
description: Drive the Kheopswap web app (React DEX for Polkadot Asset Hubs) the way a user does, in a Docker container running Vite and a Chromium with the Talisman wallet restored from a backup, and capture proof. Use to verify a UI change, reproduce a bug in the browser, or prove that a swap, transfer, portfolio, pool, or network/account flow works, including signing a real transaction with the user's test account.
---

# Verify Kheopswap

The surface is the web app at `http://localhost:5173` (Vite dev server, hash routes such as `#/paseo/swap`). It is the only origin this app is tested from. Each checkout gets a Docker container that runs `pnpm dev` on the checkout and a Chromium with Talisman. The driver is `agent-browser` on the host, attached over the container's CDP port. Talisman popups are invisible to `agent-browser`, so `scripts/talisman.mjs` drives them over raw CDP.

The host needs Docker, Node, `agent-browser` and `curl`. Nothing else is installed on the host: Chromium, Talisman and the Linux `node_modules` live in the container.

All scripts live in `scripts/` next to this file, and the image in `docker/`. Run them from anywhere in the checkout. Feature recipes live in [`features/`](features/README.md). Read the matching feature file before driving.

## Wallet setup

Every launch restores the same Talisman backup into a fresh Chromium profile, so each run starts from a known wallet. The backup lives in `~/.kheopswap`:

| File | Required | Content |
|---|---|---|
| `talisman.json` | yes | A Talisman backup (support page → Backup → Save). |
| `talisman.password` | yes | The password of the wallet the backup came from. |
| `talisman.zip` | no | A Talisman build, used when the Chrome Web Store download fails. |

`launch.sh` checks both required files before it starts anything, and prints how to make a missing one. To make the backup, lock Talisman in your own browser and click the version number on its login page 10 times: the support page opens. Click Backup, then Save, and move the download to `~/.kheopswap/talisman.json`. Keep the folder at `700` and the files at `600`. Use a wallet that holds only test accounts, because every container gets a copy.

The container installs Talisman from the Chrome Web Store, or from `talisman.zip` when the download fails. `launch.sh` and the doctor print the source and version. Restore and unlock go through Talisman's own pages: `support.html` → Restore, then `popup.html` → Unlock. Logs are in `$ARTIFACTS/setup-wallet.log`.

After the restore, Talisman is connected only to the sites the backup authorized. Connect the app once per launch (see `features/network-and-account.md`). Talisman locks itself after 15 idle minutes. `talisman.mjs` unlocks a locked popup with `talisman.password`, and `talisman.mjs unlock` unlocks it outside a request.

## Isolation: one container per checkout

Each checkout or worktree gets container `kheopswap-verify-<checkout folder>`. It has its own port 5173, its own Chromium, and a host CDP port in 9300-9399 (`VERIFY_CDP_PORT` pins it). Each also gets its own `agent-browser` session, `kheopswap-verify-<checkout folder>`. Runs in different checkouts don't collide.

The checkout is mounted read-write at its own path, so Vite sees your edits live. Linux `node_modules` live in the volumes `kheopswap-verify-<checkout folder>-node_modules` and `...-web-node_modules`, and the pnpm store in `kheopswap-verify-pnpm`. The host's own `node_modules` stay untouched.

Parallel runs share the wallet's accounts. Two sends from one account on one network at the same time take the same nonce. Don't sign in two checkouts at once with the same account.

## Networks

- **Paseo (`#/paseo/...`) is the default for everything.** It is a testnet with deep PAS/USDC and PAS/USDt pools. Check the test account's balance in the `Account` drawer before you rely on it.
- **Polkadot (`#/polkadot/...`) is the fallback when Paseo is broken.** Paseo breaks from time to time: RPC down, or a runtime upgrade the app can't sign for yet. Use mainnet only for that, with tiny amounts (≤ 0.01 DOT), and say in the report that mainnet was used and why.
- Kusama and Westend: read-only checks only.

Known Paseo break, first seen 2026-10-03 and still there on 2026-10-05: every submit fails before Talisman opens. The follow-up dialog reads `Transaction failed` and `PJS does not support this signed-extension: AsPgas`. polkadot-api's `pjs-signer` rejects signed extensions it does not know. Until that is fixed, prove signing flows on Polkadot and report the Paseo failure as a finding.

## Launch

```bash
.claude/skills/verify/scripts/launch.sh '#/paseo/swap'
source .claude/skills/verify/.run/state.env   # RUN_ID, ARTIFACTS, CDP, CONTAINER, AGENT_BROWSER_SESSION, TAB_ID, EXTENSION
```

`launch.sh` does the following:

1. It checks `~/.kheopswap` and refuses to start when a run is already active.
2. It builds the `kheopswap-verify` image from `docker/` (cached after the first build) and starts this checkout's container. A container left over from a run without state is replaced.
3. It prints the container's progress: `installing` (`pnpm install`), `starting-vite`, `installing-talisman`, `restoring`, `unlocking`, then `ready`. On `failed:<step>`, or if the container stops, it removes the container and points to the logs in `$ARTIFACTS`.
4. It opens a pinned app tab in the run's `agent-browser` session.
5. It waits until the footer shows `Finalized:`, which means the chain connection is live.

On 2026-10-05, the first image build took about 2 min. A launch with empty volumes then took about 40 s, 16 s of it `pnpm install`. A later launch took about 20 s. Light clients are disabled by `VITE_DISABLE_LIGHT_CLIENTS=true` in the committed `web/.env`, so the app talks to RPC nodes.

## Doctor

```bash
.claude/skills/verify/scripts/doctor.sh
```

The doctor is read-only. Each line starts with `OK` or `FAIL`, and the exit code is 0 only when all checks pass. It checks:

- A run is active, and its container is running with status `ready`.
- 5173 in the container returns the Kheopswap shell.
- Chromium answers on the run's CDP port.
- The recorded tab is still open.
- Talisman is injected (`window.injectedWeb3.talisman`).
- Talisman is unlocked. After an auto-lock, run `node .claude/skills/verify/scripts/talisman.mjs unlock`.

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

Navigate by URL: `agent-browser open "http://localhost:5173/#/paseo/portfolio"`. The URL is the container's own `localhost`. Drawers (account, token, network, slippage, token details) open as dialogs with a heading such as `Select account`. They slide in and out for 300 ms. A click inside a drawer that is still opening is lost, and a closing drawer's overlay swallows clicks. After you open or close a drawer, run:

```bash
.claude/skills/verify/scripts/wait-drawer.sh open     # after the click that opens it
.claude/skills/verify/scripts/wait-drawer.sh closed   # after Escape, Close, or a choice that closes it
```

`wait --text "<heading>"` is not enough: it returns while the drawer is still sliding in.

### Signing with Talisman

Only the test account that your user-level `CLAUDE.md` designates for signing may sign. Read that file first, and select that account in the form's `Account` or `From` field before you submit. Click the submit button, then run:

```bash
node .claude/skills/verify/scripts/talisman.mjs approve --signer "<test account name>" > "$ARTIFACTS/talisman-approve.txt"
```

The helper:

- waits for the popup;
- unlocks it with `~/.kheopswap/talisman.password` if Talisman is locked;
- waits until `Approve` is enabled, because the popup first shows `Analysing transaction`;
- prints the request text;
- clicks `Approve` only when the text names the signer;
- waits for the popup to close.

It exits with one of these codes:

| Code | Meaning | What to do |
|---|---|---|
| 0 | Approved | Continue. |
| 1 | No popup appeared | Read the app's toasts: the app usually failed before signing. |
| 2 | Signer mismatch, nothing clicked | Fix the account selection. |
| 3 | Talisman is locked, and the password file is missing or wrong | Ask the user to fix `~/.kheopswap/talisman.password`. Never guess the password. |

Other subcommands: `list`, `status`, `unlock`, `text`, `connect`, `reject`. On 2026-10-05, `approve`, `connect`, `list`, `status` and `unlock` ran against the container. `text` and `reject` have not run against a real popup.

## Evidence

Write everything under `$ARTIFACTS` (`.claude/skills/verify/artifacts/<run-id>/`, gitignored). Cleanup keeps it. The container's logs land there too: `install.log`, `dev-server.log`, `chromium.log`, `setup-wallet.log` and `talisman-source.txt`. For each proof:

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

Cleanup closes the run's `agent-browser` session, removes the container with its wallet and browser profile, and removes `.run/state.env`. It keeps the volumes, so the next launch skips most of `pnpm install`, and it keeps the artifacts. Run it after every run, failed runs included. To reclaim the disk, remove the volumes with `docker volume rm`. Never remove another checkout's container: its name ends with that checkout's folder.
