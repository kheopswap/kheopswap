# Kheopswap verification map

This directory is the maintained source for verifying Kheopswap's user-facing behavior. Read the index, then use the matching feature file as the recipe. Commands assume `AGENT_BROWSER_SESSION=kheopswap-verify` and a sourced `.claude/skills/verify/.run/state.env` (see `../SKILL.md`).

## Baseline preconditions

- `launch.sh` succeeded, and `doctor.sh` exits 0.
- The network is Paseo (`#/paseo/...`) unless the feature file says otherwise. Fall back to Polkadot only when Paseo is broken, and use tiny amounts.
- Talisman is unlocked, and `Guardians SUB` is listed under `Connected Accounts` in the `Account` drawer.
- No Talisman popup is pending (`node scripts/talisman.mjs list` prints nothing).

## Driving conventions

- Reach pages by URL (`agent-browser open "http://localhost:5173/#/paseo/<route>"`) or by the `Main navigation` links `Swap`, `Transfer`, `Portfolio`, and `Liquidity Pools`.
- Use `find role ... --name`. Add `--exact` when a longer name contains the short one (`Swap` vs `Swap token direction`, `Close` in dialogs).
- Wait for text or conditions (`wait --text`, `wait --fn`), never fixed sleeps. Balances and quotes stream in after the page renders.
- Close drawers with `press Escape`, then wait for the drawer heading to disappear.
- Sign only as an account whose name contains `Guardians`, through `talisman.mjs approve --signer "Guardians"`.

## Proof and skip reporting

- Capture the action and the resulting state: `get text "#main-content"` plus a screenshot, before and after.
- For transaction proofs, record the Talisman request text, the follow-up dialog at `Transaction succeeded`, and a second view of the balance change.
- Record the network and route used with every artifact.
- If Paseo is broken, record the exact error, rerun on Polkadot, and report both.
- Don't report a sub-feature as verified through a different entry point.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph on the user-visible behavior. Four H2 sections follow, in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with agent-browser`, and `Gotchas`.

## Features

- [Swap](./swap.md) covers the quote, token selection, direction flip, slippage, and a signed swap.
- [Transfer](./transfer.md) covers sender and recipient selection, the amount, and a signed transfer.
- [Portfolio](./portfolio.md) covers aggregated balances, token search, sorting, and the token details drawer.
- [Liquidity pools](./liquidity-pools.md) covers the pool list, search, pool detail, and add/remove liquidity.
- [Network and account](./network-and-account.md) covers the network switch, wallet connection, and account selection.
