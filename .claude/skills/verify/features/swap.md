# Swap

Swap lets a user trade any two pooled Asset Hub tokens. A pair with the native token goes through one asset-conversion pool, and a pair of two assets goes through native in one call, across two pools. The user sees a live quote with price impact. Once an account is selected, the summary adds minimum received, a dry-run simulation, and fees. The user then signs and follows the transaction until it finalizes.

## Sub-features

- `swap-quote`: entering an amount fills `Amount to receive`, `Pool reserves` (or `Route`, such as `USDC → PAS → USDt`, for two pools), and `Price impact`. With an account selected, the summary also shows `Slippage tolerance`, `Min. received`, `Simulation`, `Transaction fee`, `Service fee`, and `Protocol fee`, which lists one fee per pool.
- `swap-token-select`: the token buttons open the `Select token` drawer, which has a `Search` box. The side the user picks keeps the token. The other side stays when the pair still routes; otherwise it becomes the first token that routes, in this order: the new token's mirror on the other side's chain, the Asset Hub mirror of the other side, the Asset Hub mirror of the new token, native, then empty. Picking the token already on the other side flips the pair.
- `swap-direction`: `Swap token direction` swaps the input and output tokens.
- `swap-max`: `Use maximum balance` (`MAX`, needs an account and a fee estimate) fills the native balance minus 2× fee and the existential deposit, or the full balance of a non-native token.
- `swap-slippage`: the slippage value button (default `0.5%`, needs an account) opens `Slippage Tolerance` with `0%`, `0.1%`, `0.3%`, `0.5%`, and `1%`. The pool pages keep their own setting.
- `swap-fee-token`: for a Polkadot account on a chain with more than one sufficient token, the `Transaction fee` value is a button that opens `Select fee token`. The drawer lists every sufficient token with the account's balance, held or not. Ethereum accounts pay in the native token and get no button.
- `swap-submit`: `SWAP` → follow-up dialog `Swap <IN>/<OUT>` reading `Approve in Talisman` → Talisman approval → `Transaction succeeded`.

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

  The output button's accessible name becomes `Selected token: USDC on Paseo AH. Change token`, and the tab title becomes `PAS/USDC Swap | Kheopswap`.
- **Quote** (no wallet). Run `agent-browser find role textbox fill "1" --name "Amount to swap"`. `Amount to receive` is non-zero: read it with `agent-browser eval "document.querySelector('[aria-label=\"Amount to receive\"]').value"`. `#main-content` lists `Pool reserves` and `Price impact`. On 2026-10-24, 1 PAS quoted 1.137336 USDC at `-0.6%`, and 0.5 USDC quoted 0.498178 USDt along `USDC → PAS → USDt`.
- **Direction** (no wallet). Click `Swap token direction`: the two `Selected token: ...` buttons swap. Click it again to restore.
- **Select account.** Run `agent-browser find role button click --name "Account"`, `scripts/wait-drawer.sh open`, `agent-browser find role button click --name "<test account name>"`, and `scripts/wait-drawer.sh closed`. The form's `Account` field reads the account name. The field may already be filled: forms default to the last chosen account.
- **Full summary.** Wait for a visible `Simulation` `Success` (see `README.md`), then for a positive fee: `agent-browser wait --fn "/Transaction fee\s*0\.\d*[1-9]\d*\s*PAS/.test(document.querySelector('#main-content').innerText)"`. Save `swap-quote.txt` and `swap-quote.png`.
- **Slippage.** Click the button named `0.5%`, `scripts/wait-drawer.sh open`, click `1%` with `--exact`, and `scripts/wait-drawer.sh closed`. `Slippage tolerance` reads `1%`, and `Min. received` drops. Set it back to `0.5%` the same way.
- **Fee token.** Click the button named after the fee (for example `0.0014 PAS`). The `Select fee token` drawer lists PAS and the chain's other sufficient tokens (USDC, USDt, ETH and others on Paseo), each with the account's balance. Close it with `press Escape`.
- **Max.** Click `Use maximum balance`: `Amount to swap` becomes the balance minus a margin. Fill `1` again.
- **Submit.** Run `agent-browser find role button click --name "SWAP" --exact`. The dialog `Swap PAS/USDC` opens at once, reading `Approve in Talisman`. Then run `node .claude/skills/verify/scripts/talisman.mjs approve --signer "<test account name>"`. The helper exits 0. On the 2026-10-24 Polkadot run (0.01 DOT → USDC), the popup text read `Approve Batch Request ... <account name> ... Swap 0.01 DOT for USDC to <account name> Transfer < 0.0001 DOT to 5FfAKN…MCTV`.
- **Follow up.** Run `agent-browser wait --text "Effective outcome"`, then `agent-browser wait --text "Transaction succeeded"`. This can take about 30 s. The dialog shows `Estimated outcome`, `Effective outcome`, `Effective slippage`, `Estimated fee`, `Effective fee`, and `View in block explorer`.
- **Second view.** Run `agent-browser find role button click --name "CLOSE" --exact`, then reopen the `Account` drawer. The test account's balance has dropped by the amount plus fees. On the network you swapped on, Portfolio → USDC → `Token Details` lists the USDC received by the test account.
- **Proof.** Save:
  - `swap-quote.txt` and `swap-quote.png` before the submit;
  - `talisman-approve.txt`;
  - `swap-finalized.png`;
  - `balances-after.txt`.

## Gotchas

- `find ... --name "Swap"` without `--exact` can hit `Swap token direction`, and `--name "Swap" --exact` matches nothing because the button renders as `SWAP`. The nav `SWAP` is a link, not a button.
- `--name "USD Coin"` also matches `Fake USD Coin X` when that token has a pool. Use `USDC USDC USD Coin`.
- Without a selected account, the summary stops after `Price impact`, and neither `MAX` nor the slippage button exists.
- The swap batches a service-fee transfer to `VITE_APP_FEE_ADDRESS` (`5FfAKN…MCTV`, or a contact name if the wallet knows it), which is expected in the Talisman request. When that address can't receive the token, the fee is 0 and the plain swap is sent without a batch.
- Signing on Paseo needs the Talisman build from `~/.kheopswap/talisman.zip` (see `../SKILL.md`). On 2026-10-24, with 3.12.0, 1 PAS → USDC showed the popup `Approve Batch Request ... Swap 0.997 PAS for USDC to <account name> Transfer 0.003 PAS to 5FfAKN…MCTV` and ended at `Transaction succeeded` with `Effective outcome 1.137 USDC`. With the Web Store build, the dialog reads `Transaction failed` and `PJS does not support this signed-extension: AsScarcity`, and `talisman.mjs` exits 1.
- A failed transaction's toast closes after 5 s, and the follow-up dialog closes with it (seen 2026-10-24). Capture the dialog right after the submit click: `agent-browser wait --text "Transaction failed"`, then `get text "[role=dialog]"`.
- `Waiting for finalization` with a check mark is not the end state. Wait for `Transaction succeeded` or `Transaction failed`.
- Tiny swaps show about -0.6% `Price impact`. That is the 0.3% service fee (`VITE_APP_FEE_PERCENT`) plus the 0.3% pool fee: the impact compares the spot value of the gross amount with the pool output of the net amount.
