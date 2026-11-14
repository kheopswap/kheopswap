# Bridge

The Swap page bridges KSM and DOT between Polkadot Asset Hub and Kusama Asset Hub. A user picks a relay token on one hub and the same token on the other, sees what arrives, the bridge fee and the destination fee, signs once on the origin hub, and follows the transfer until it arrives a few minutes later. It works both ways, for both tokens, on the Polkadot and the Kusama view, for Substrate accounts only. The bridge exists only on mainnet: the quote steps are read-only, and a signed transfer spends the amount plus the bridge fee (see `../SKILL.md`, Networks).

## Sub-features

- `bridge-token-select`: each view lists four bridge tokens in `Select token`. On Polkadot they are `DOT` `Polkadot Asset Hub`, `KSM` `Bridged to Polkadot Asset Hub`, `KSM` `Kusama Asset Hub` and `DOT` `Bridged to Kusama Asset Hub`. A token on the other hub pairs only with its mirror: picking it sets the other side to that mirror.
- `bridge-quote`: with an account and an amount, the summary shows `You receive`, `Bridge fee` in the origin hub's native token, `Destination fee` in the token sent, `Arrival time` `A few minutes`, `Simulation` and `Transaction fee`. The submit button reads `TRANSFER`.
- `bridge-fee-warning`: a small amount trips the fee warning `You pay ... in fees (...% of what you send) to deliver ...`, and `TRANSFER` stays disabled until `I accept these fees and want to transfer anyway` is ticked.
- `bridge-direction`: `Swap token direction` reverses the transfer, and the bridge fee changes to the other hub's native token.
- `bridge-view-switch`: switching between the Polkadot and the Kusama network keeps a bridge pair and its amount.
- `bridge-submit`: `TRANSFER` → follow-up dialog `Transfer <SYMBOL> to <destination hub>` → Talisman approval → `Arrival on <destination hub>` reading `Crossing the bridge, takes a few minutes`, then `Arrived` with `Received`.

## How to get to it (user POV)

- Open `#/polkadot/swap` or `#/kusama/swap`.
- Pick a relay token on one hub as input and the same token on the other hub as output.

## Driving it with agent-browser

Preconditions:

- The app tab is on `#/polkadot/swap`, and the test account is selected in `Account`.
- The test account holds the token to send and the origin hub's native token for the bridge fee: DOT to send from Polkadot Asset Hub, KSM to send from Kusama Asset Hub. Check Portfolio on `#/polkadot/portfolio`, which lists both hubs' relay tokens.

Steps:

- **Pick the pair.** Click the input token button (`Selected token: DOT on Polkadot AH. Change token`), run `scripts/wait-drawer.sh open`, fill `KSM` in `Search`, click `--name "KSM KSM Kusama Bridged to Polkadot Asset Hub"`, and run `scripts/wait-drawer.sh closed`. Do the same on the output button with `--name "KSM KSM Kusama Kusama Asset Hub"`. The buttons read `Selected token: KSM on Polkadot AH` and `Selected token: KSM on Kusama AH`. Both buttons share the name prefix `Selected token`, so take their refs from `agent-browser snapshot -i -c`: the input is the first.
- **Quote.** Run `agent-browser find role textbox fill "0.01" --name "Amount to swap"`, then wait for a visible `Simulation` `Success` (see `README.md`). Save `bridge-quote.txt` (`get text "#main-content"`) and `bridge-quote.png`. On 2026-11-15, 0.01 KSM from Polkadot Asset Hub showed `You receive ~0.0099 KSM`, `Bridge fee 0.0377 DOT`, `Destination fee < 0.0001 KSM`, `Arrival time A few minutes`, `Simulation Success` and `Transaction fee 0.0011 DOT`.
- **Fee warning.** At 0.01 the warning shows and `TRANSFER` is disabled. Read the checkbox state from a snapshot and click `agent-browser find role checkbox click --name "I accept these fees"` only when it reads `checked=false`. `TRANSFER` is then enabled. Do not click it in a read-only run.
- **Reverse.** Click `Swap token direction` and fill `0.01` again. On 2026-11-15, 0.01 KSM from Kusama Asset Hub showed `You receive ~0.0096 KSM`, `Bridge fee 0.0035 KSM`, `Destination fee 0.0004 KSM` and `Transaction fee < 0.0001 KSM`.
- **DOT.** Pick `DOT DOT Polkadot Polkadot Asset Hub` as input and `DOT DOT Polkadot Bridged to Kusama Asset Hub` as output. On 2026-11-15, 0.01 DOT showed `You receive ~0.0097 DOT`, `Bridge fee 0.0377 DOT` and `Destination fee 0.0003 DOT`.
- **Other view.** Open `http://localhost:5173/#/kusama/swap`. The pair and the amount are kept, and the summary quotes the same transfer.
- **Submit.** Click `TRANSFER`, run `talisman.mjs approve --signer "<test account name>"`, then wait for `Arrived` in the follow-up dialog, which stays open. Until then the arrival row reads `Crossing the bridge, takes a few minutes`. On 2026-11-15 a 0.01 KSM round trip was signed on mainnet. Kusama Asset Hub to Polkadot Asset Hub arrived 2 min 51 s after its block with `Received 0.0096 KSM`, and the way back arrived after 2 min 27 s with `Received 0.0099 KSM`. Each amount equalled its quote. The app reports `Not confirmed` after 30 minutes.
- **Second view.** After `Arrived`, the output token's balance on the destination hub has grown by `Received`. Portfolio on either view lists it.
- **Proof.** Save `bridge-quote.txt` and `bridge-quote.png` per pair, and for a signed run `talisman-approve.txt`, the follow-up dialog at `Arrived`, and `balances-after.txt`.

## Gotchas

- The `Transaction fee` from Kusama Asset Hub reads `< 0.0001 KSM`, so the positive-fee wait of `swap.md` never matches there. Match `<` as well.
- The fee warning checkbox keeps its state when the same pair is opened on the other view. Clicking it blindly unticks it.
- An account without the origin hub's native token cannot pay the bridge fee, even when it holds the bridged token. The origin simulation then fails.
- A pair that would swap and bridge, such as DOT on Polkadot Asset Hub to KSM on Kusama Asset Hub, does not route: picking the second token replaces the first with its mirror.
- Ethereum accounts cannot bridge: the form reads `Ethereum accounts cannot use the bridge yet`.
- On 2026-11-15 the first page load after launch once failed with `Failed to fetch tokens {chainId: "pah" ...}` in the console, and Portfolio showed a total of `0.0000`. `agent-browser reload` fixed it.
- Before signing a real transfer, rerun `cd web && node scripts/capture-bridge-transfer-fixtures.ts`: it fails when a Bridge Hub no longer accepts the exported message, which the app's own simulation cannot see. It rewrites the tracked fixtures, so restore them with `git checkout` afterwards unless you mean to recapture. `--out` takes only a path inside the repo that git does not ignore, because the script formats its output with Biome.
- The follow-up dialog's `Estimated fee` and `Effective fee` rows hold the transaction fee only. The bridge fee shows in the form's summary, not in the dialog.
- Talisman can lock itself between the two legs of a round trip. Run `talisman.mjs unlock` before the second submit.
