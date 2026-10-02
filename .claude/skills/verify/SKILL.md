---
name: verify
description: Drive the Kheopswap web app (React DEX for Polkadot Asset Hubs) in the dev Chrome with the Talisman wallet, the way a user does, and capture proof. Use to verify a UI change, reproduce a bug in the browser, or prove that a swap, transfer, portfolio, pool, or network/account flow works, including signing a real transaction with a Guardians test account.
---

# Verify Kheopswap

The surface is the web app at `http://localhost:5173` (Vite dev server, hash routes such as `#/paseo/swap`). It is the only origin this app is tested from. The driver is `agent-browser` attached over CDP to the persistent dev Chrome on port 9222. That Chrome profile (`~/Library/Application Support/Chrome-MCP-Profile`) has the Talisman extension loaded unpacked and already connected to the app. Talisman popups are invisible to `agent-browser`, so `scripts/talisman.mjs` drives them over raw CDP.

All scripts live in `scripts/` next to this file. Run them from anywhere in the checkout. Feature recipes live in [`features/`](features/README.md). Read the matching feature file before driving.

## Isolation: one run at a time

Nothing here isolates. Every checkout and worktree shares port 5173, and every run shares the one dev Chrome and its wallet. `launch.sh` refuses to start when a run is already active, or when another checkout's Vite holds 5173. Don't free 5173 or kill a dev server you did not start. Report the owner pid and its working directory, then ask the user.

## Networks

- **Paseo (`#/paseo/...`) is the default for everything.** It is a testnet: Guardians SUB holds about 5K PAS there, and PAS/USDC and PAS/USDt pools are deep.
- **Polkadot (`#/polkadot/...`) is the fallback when Paseo is broken.** Paseo breaks from time to time: RPC down, or a runtime upgrade the app can't sign for yet. Use mainnet only for that, with tiny amounts (≤ 0.01 DOT), and say in the report that mainnet was used and why.
- Kusama and Westend: read-only checks only.

Known Paseo break as of 2026-10-03: every submit fails before Talisman opens, with the toast `PJS does not support this signed-extension: AsPgas`. polkadot-api's `pjs-signer` rejects signed extensions it does not know. Until that is fixed, prove signing flows on Polkadot and report the Paseo failure as a finding.

## Launch

```bash
.claude/skills/verify/scripts/launch.sh '#/paseo/swap'
export AGENT_BROWSER_SESSION=kheopswap-verify
source .claude/skills/verify/.run/state.env   # RUN_ID, ARTIFACTS, TAB_ID
```

`launch.sh` does the following:

1. It reuses this checkout's dev server if one is already running. Otherwise it starts `pnpm dev --strictPort` in its own process group and logs to `$ARTIFACTS/dev-server.log`.
2. It starts the dev Chrome only when nothing answers on 9222.
3. It opens a pinned tab in the `kheopswap-verify` session.
4. It waits until the footer shows `Finalized:`, which means the chain connection is live.

Startup takes about 5 s. Light clients are disabled locally (`VITE_DISABLE_LIGHT_CLIENTS=true` in `web/.env.local`), so the app talks to RPC nodes.

## Doctor

```bash
.claude/skills/verify/scripts/doctor.sh
```

The doctor is read-only. Each line starts with `OK` or `FAIL`, and the exit code is 0 only when all checks pass. It checks:

- 5173 is served from this checkout's `web/` and returns the Kheopswap shell.
- The dev Chrome answers on 9222.
- The run state exists, and the recorded tab is still open.
- Talisman is injected (`window.injectedWeb3.talisman`).

It also warns about open Talisman popups. Run it first, and again whenever anything looks off.

## Drive

Use `agent-browser` commands against the pinned tab. Prefer roles and accessible names:

```bash
agent-browser find role button click --name "Swap" --exact      # --exact: "Swap token direction" also matches
agent-browser find role textbox fill "1" --name "Amount to swap"
agent-browser wait --text "Success"                              # never fixed sleeps for app state
agent-browser get text "#main-content"                           # whole form + summary as text
agent-browser snapshot -i -c                                     # refs for unnamed elements
```

Navigate by URL: `agent-browser open "http://localhost:5173/#/paseo/portfolio"`. Drawers (account, token, network, token details) open as dialogs with a heading such as `Select account`. Close them with `agent-browser press Escape`, then wait for the heading to disappear before the next click. A closing drawer's overlay swallows clicks.

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

Other subcommands: `list`, `text`, `connect`, `reject`. Only `approve` and `list` have been run against a real popup.

Only accounts with "Guardians" in their name may sign: `Guardians SUB` (substrate, `5CcU6DRp...YffCfSAP`). The `0x5C9E...Fc5f67` Ethereum account is not a Guardians account. Select `Guardians SUB` in the form's `Account` or `From` field before you submit.

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
