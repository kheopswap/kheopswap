# Swap

Swap lets a user trade one Asset Hub token for another through an asset-conversion pool. The user sees a live quote with price impact, minimum received, a dry-run simulation, and fees, then signs and follows the transaction until it finalizes.

## Sub-features

- `swap-quote`: entering an amount fills `Amount to receive` and the summary (`Pool reserves`, `Price impact`, `Min. received`, `Simulation`, `Transaction fee`, `Service fee`, `Protocol fee`).
- `swap-token-select`: the token buttons open the `Select token` drawer, which has a `Search` box.
- `swap-direction`: `Swap token direction` swaps the input and output tokens.
- `swap-max`: `Use maximum balance` fills the spendable balance.
- `swap-slippage`: the slippage value button (for example `0.5%`) opens `Slippage Tolerance`.
- `swap-submit`: `Swap` → Talisman approval → follow-up dialog → `Transaction succeeded`.

## How to get to it (user POV)

- Open `#/<relay>/swap`, or `#/<relay>` (redirects to swap). `/` redirects to `#/polkadot/swap`.
- Choose `Swap` in `Main navigation`.

## Driving it with agent-browser

Preconditions:

- The app tab is on `#/paseo/swap`.
- `Guardians SUB` holds PAS. Check the `Account` drawer.

Steps:

- **Select account.** Choose `Account`, then `Guardians SUB`. Run `agent-browser find role button click --name "Account"`, `agent-browser wait --text "Connected Accounts"`, and `agent-browser find role button click --name "Guardians SUB"`. The form's `Account` field reads `Guardians SUB`.
- **Pick the output token.** Run:
  - `agent-browser find role button click --name "Select token" --exact`
  - `agent-browser find role textbox fill "USDC" --name "Search"`
  - `agent-browser find role button click --name "USD Coin"`

  The output button's accessible name becomes `Selected token: USDC on Paseo AH. Change token`.
- **Quote.** Run `agent-browser find role textbox fill "1" --name "Amount to swap"`, then `agent-browser wait --text "Success"`. `Amount to receive` is non-zero, and `get text "#main-content"` lists `Pool reserves`, `Price impact`, `Min. received`, and `Simulation Success`.
- **Wait for fees.** Run `agent-browser wait --fn "!/Transaction fee\s*0 PAS/.test(document.querySelector('#main-content').innerText)"`. The fee becomes non-zero.
- **Submit.** Run `agent-browser find role button click --name "Swap" --exact`, then `node .claude/skills/verify/scripts/talisman.mjs approve --signer "Guardians"`. The helper exits 0. On the 2026-10-03 Polkadot run (0.01 DOT → USDC), the popup text read `Approve Batch Request ... Guardians SUB ... Swap 0.01 DOT for USDC to Guardians SUB ... Transfer < 0.0001 DOT to Kheopswap Treasury`.
- **Follow up.** Run `agent-browser wait --text "Effective outcome"`, then `agent-browser wait --text "Transaction succeeded"`. This can take about 30 s. The dialog `Swap PAS/USDC` shows `Estimated outcome`, `Effective outcome`, `Effective slippage`, and `Effective fee`.
- **Second view.** Run `agent-browser find role button click --name "Close" --exact`, then reopen the `Account` drawer. The `Guardians SUB` balance has dropped by the amount plus fees. Portfolio → USDC → `Token Details` → `Portfolio` lists the USDC received by `Guardians SUB`.
- **Proof.** Save:
  - `swap-quote.txt` and `swap-quote.png` before the submit;
  - `talisman-approve.txt`;
  - `swap-finalized.png`;
  - `balances-after.txt`.

## Gotchas

- `find ... --name "Swap"` without `--exact` can hit `Swap token direction`. The nav `Swap` is a link, not a button.
- The swap batches a service-fee transfer to `Kheopswap Treasury`, which is expected in the Talisman request.
- On Paseo, as of 2026-10-03, the submit fails before any popup with the toast `PJS does not support this signed-extension: AsPgas`. `talisman.mjs` then exits 1. Record the toast, then prove `swap-submit` on `#/polkadot/swap` with 0.01 DOT → USDC.
- `Waiting for finalization` with a check mark is not the end state. Wait for `Transaction succeeded` or `Transaction failed`.
- Tiny swaps showed about -0.6% `Price impact` on both networks: 0.01 DOT in an 84K DOT pool, and 1 PAS in a 25M PAS pool. Nobody has checked what that figure includes.
- `Transaction fee` reads `0` until the fee estimate arrives. Don't screenshot the quote before it updates.
