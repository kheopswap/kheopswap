# Swap

Swap lets a user trade the Asset Hub native token for a pooled asset, or back, through an asset-conversion pool. The user sees a live quote with price impact. Once an account is selected, the summary adds minimum received, a dry-run simulation, and fees. The user then signs and follows the transaction until it finalizes.

## Sub-features

- `swap-quote`: entering an amount fills `Amount to receive`, `Pool reserves`, and `Price impact`. With an account selected, the summary also shows `Slippage tolerance`, `Min. received`, `Simulation`, `Transaction fee`, `Service fee`, and `Protocol fee`.
- `swap-token-select`: the token buttons open the `Select token` drawer, which has a `Search` box. Every pair is native/X: picking a non-native token on one side sets the other side to native.
- `swap-direction`: `Swap token direction` swaps the input and output tokens.
- `swap-max`: `Use maximum balance` (`MAX`, needs an account) fills the balance minus 2× fee and the existential deposit.
- `swap-slippage`: the slippage value button (default `0.5%`, needs an account) opens `Slippage Tolerance` with `0%`, `0.1%`, `0.3%`, `0.5%`, and `1%`. The setting is shared with the pool pages.
- `swap-fee-token`: the `Transaction fee` value is a button that opens `Select fee token` when the account holds more than one fee token.
- `swap-submit`: `Swap` → follow-up dialog `Swap <IN>/<OUT>` reading `Approve in Talisman` → Talisman approval → `Transaction succeeded`.

## How to get to it (user POV)

- Open `#/<relay>/swap`, or `#/<relay>` (redirects to swap). `/` and an unknown relay redirect to `#/polkadot/swap`.
- Choose `Swap` in `Main navigation`.

## Driving it with agent-browser

Preconditions:

- The app tab is on `#/paseo/swap`.
- For the account steps: the signing test account holds PAS. Check the `Account` drawer.

Steps:

- **Pick the output token** (no wallet). Run:
  - `agent-browser find role button click --name "Select token" --exact`, then `scripts/wait-drawer.sh open`
  - `agent-browser find role textbox fill "USDC" --name "Search"`
  - `agent-browser find role button click --name "USDC USDC USD Coin"`, then `scripts/wait-drawer.sh closed`

  The output button's accessible name becomes `Selected token: USDC on Paseo AH. Change token`, and the tab title becomes `PAS/USDC Swap`.
- **Quote** (no wallet). Run `agent-browser find role textbox fill "1" --name "Amount to swap"`. `Amount to receive` is non-zero: read it with `agent-browser eval "document.querySelector('[aria-label=\"Amount to receive\"]').value"`. `#main-content` lists `Pool reserves` and `Price impact`. On 2026-10-05, 1 PAS quoted 3.969547 USDC at `-0.59%`.
- **Direction** (no wallet). Click `Swap token direction`: the two `Selected token: ...` buttons swap. Click it again to restore.
- **Select account.** Run `agent-browser find role button click --name "Account"`, `scripts/wait-drawer.sh open`, `agent-browser find role button click --name "<test account name>"`, and `scripts/wait-drawer.sh closed`. The form's `Account` field reads the account name. The field may already be filled: forms default to the last chosen account.
- **Full summary.** Wait for a visible `Simulation` `Success` (see `README.md`), then for a positive fee: `agent-browser wait --fn "/Transaction fee\s*0\.\d*[1-9]\d*\s*PAS/.test(document.querySelector('#main-content').innerText)"`. Save `swap-quote.txt` and `swap-quote.png`.
- **Slippage.** Click the button named `0.5%`, `scripts/wait-drawer.sh open`, click `1%` with `--exact`, and `scripts/wait-drawer.sh closed`. `Slippage tolerance` reads `1%`, and `Min. received` drops. Set it back to `0.5%` the same way.
- **Fee token.** Click the button named after the fee (for example `0.0014 PAS`). The `Select fee token` drawer lists PAS and the account's other fee tokens. Close it with `press Escape`.
- **Max.** Click `Use maximum balance`: `Amount to swap` becomes the balance minus a margin. Fill `1` again.
- **Submit.** Run `agent-browser find role button click --name "Swap" --exact`. The dialog `Swap PAS/USDC` opens at once, reading `Approve in Talisman`. Then run `node .claude/skills/verify/scripts/talisman.mjs approve --signer "<test account name>"`. The helper exits 0. On the 2026-10-03 Polkadot run (0.01 DOT → USDC), the popup text read `Approve Batch Request ... <account name> ... Swap 0.01 DOT for USDC to <account name> ... Transfer < 0.0001 DOT to Kheopswap Treasury`.
- **Follow up.** Run `agent-browser wait --text "Effective outcome"`, then `agent-browser wait --text "Transaction succeeded"`. This can take about 30 s. The dialog shows `Estimated outcome`, `Effective outcome`, `Effective slippage`, `Estimated fee`, `Effective fee`, and `View in block explorer`.
- **Second view.** Run `agent-browser find role button click --name "Close" --exact`, then reopen the `Account` drawer. The test account's balance has dropped by the amount plus fees. Portfolio → USDC → `Token Details` lists the USDC received by the test account.
- **Proof.** Save:
  - `swap-quote.txt` and `swap-quote.png` before the submit;
  - `talisman-approve.txt`;
  - `swap-finalized.png`;
  - `balances-after.txt`.

## Gotchas

- `find ... --name "Swap"` without `--exact` can hit `Swap token direction`. The nav `Swap` is a link, not a button.
- `--name "USD Coin"` also matches `Fake USD Coin X` when that token has a pool. Use `USDC USDC USD Coin`.
- Without a selected account, the summary stops after `Price impact`, and neither `MAX` nor the slippage button exists.
- The swap batches a service-fee transfer to `Kheopswap Treasury`, which is expected in the Talisman request.
- On Paseo, from 2026-10-03 to at least 2026-10-05, the submit fails before any popup. The dialog reads `Transaction failed` and `PJS does not support this signed-extension: AsPgas`, and `talisman.mjs` exits 1. Record the dialog text, then prove `swap-submit` on `#/polkadot/swap` with 0.01 DOT → USDC.
- A failed-transaction toast closes after 5 s. Capture the dialog, which stays open until `Close`.
- `Waiting for finalization` with a check mark is not the end state. Wait for `Transaction succeeded` or `Transaction failed`.
- Tiny swaps show about -0.6% `Price impact`. That is the 0.3% service fee (`VITE_APP_FEE_PERCENT`) plus the 0.3% pool fee: the impact compares the spot value of the gross amount with the pool output of the net amount.
