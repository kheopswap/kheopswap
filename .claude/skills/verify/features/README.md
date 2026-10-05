# Kheopswap verification map

This directory is the maintained source for verifying Kheopswap's user-facing behavior. Read the index, then use the matching feature file as the recipe. Commands assume a sourced `.claude/skills/verify/.run/state.env`, which exports the run's `AGENT_BROWSER_SESSION` (see `../SKILL.md`).

## Baseline preconditions

- `launch.sh` succeeded, and `doctor.sh` exits 0. If launch stops on a missing file in `~/.kheopswap`, pass its message on to the user and stop: every run needs the wallet backup.
- The network is Paseo (`#/paseo/...`) unless the feature file says otherwise. Fall back to Polkadot only when Paseo is broken, and use tiny amounts.
- Talisman is unlocked, and the signing test account is listed under `Connected Accounts` in the `Account` drawer. A fresh container's wallet is connected only to the sites its backup authorized: connect it first (see `network-and-account.md`).
- No Talisman popup is pending (`node scripts/talisman.mjs list` prints nothing).

## Driving conventions

- Reach pages by URL (`agent-browser open "http://localhost:5173/#/paseo/<route>"`) or by the `Main navigation` links `Swap`, `Transfer`, `Portfolio`, and `Liquidity Pools`. With no connected account, `Portfolio` reads `Tokens`.
- Use `find role ... --name`. Add `--exact` when a longer name contains the short one (`Swap` vs `Swap token direction`, `Close` in dialogs).
- Wait for text or conditions (`wait --text`, `wait --fn`), never fixed sleeps. Balances and quotes stream in after the page renders.
- After a click that opens a drawer, run `scripts/wait-drawer.sh open` before clicking inside it. After `press Escape` or a choice that closes it, run `scripts/wait-drawer.sh closed`.
- While the dry run loads, `Simulation` renders an `aria-hidden` placeholder holding the word `Success`, and `innerText` includes it. Neither `wait --text "Success"` nor a regex on `innerText` proves the simulation passed. Wait for a visible `Success`:

  ```bash
  agent-browser wait --fn "[...document.querySelectorAll('#main-content span')].some((s) => s.textContent === 'Success' && !s.closest('[aria-hidden=true]'))"
  ```
- Choosing a wallet under `Installed wallets` in any account drawer toggles it: clicking a connected wallet disconnects it.
- Sign only as the test account your user-level `CLAUDE.md` designates for signing, through `talisman.mjs approve --signer "<test account name>"`.

## Proof and skip reporting

- Capture the action and the resulting state: `get text "#main-content"` plus a screenshot, before and after.
- For transaction proofs, record the Talisman request text, the follow-up dialog at `Transaction succeeded`, and a second view of the balance change.
- Record the network and route used with every artifact.
- If Paseo is broken, record the exact error, rerun on Polkadot, and report both.
- Don't report a sub-feature as verified through a different entry point.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph on the user-visible behavior. Four H2 sections follow, in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with agent-browser`, and `Gotchas`.

## Features

- [Swap](./swap.md) covers the quote, token selection, direction flip, max, slippage, fee token, and a signed swap.
- [Transfer](./transfer.md) covers sender selection, owned and pasted recipients, the amount and token, and a signed transfer.
- [Portfolio](./portfolio.md) covers aggregated balances, the wallet-less `Tokens` mode, token search, sorting, and the token details drawer.
- [Liquidity pools](./liquidity-pools.md) covers the pool list, search, pool detail, slippage, add/remove liquidity, and the create-pool page.
- [Network and account](./network-and-account.md) covers the network switch, redirects, chain status, wallet connection, and account selection.
