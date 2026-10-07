# Liquidity pools

Liquidity Pools lists every native-token pool on the current Asset Hub by TVL, with the user's positions. A pool page shows reserves and the user's share, and it lets the user add or remove liquidity. A token without a pool can get one from the create-pool page.

## Sub-features

- `pools-list`: pool links named `<NATIVE> <TOKEN> <NATIVE>/<TOKEN> <origin> [<position value>] <TVL>`, where origin is `Asset Hub - <id>` or `Foreign - <origin>`. The `TVL` sort button is always there. The `Positions` sort button needs a connected account. The active one has `aria-pressed="true"`.
- `pools-search`: the `Search` box matches the token's symbol, name, or exact asset id. No match shows `No liquidity pools match your search`. `Clear search` empties it.
- `pool-detail`: `#/<relay>/pools/<poolAssetId>` (tab title `PAS/USDC LP`) shows the `Account` field, `Pool liquidity` with both reserves and `Est. Value`, and `Your position` with reserves, `Est. Value`, and the share (`N/A` without a position). An unknown id redirects to `#/<relay>/pools`.
- `pool-add`: the `Add` tab, with `Native token amount`, `Asset token amount` (filled in proportion to the reserves), `MAX`, `Add Liquidity`, and the summary `Slippage tolerance`, `Simulation`, `Transaction fee`.
- `pool-slippage`: the slippage value button (default `0.5%`) opens `Slippage Tolerance` with `0%`, `0.1%`, `0.3%`, `0.5%`, and `1%`. The setting is shared with Swap.
- `pool-remove`: the `Remove` tab, with `Liquidity to remove` (starts at `100%`), buttons `25%`, `50%`, `75%`, `MAX`, a slider, `Expected outcome`, `Min. received`, and `Remove Liquidity`. All are disabled without a position.
- `pool-create`: `#/<relay>/pools/create/<tokenId>` (heading `Create PAS/<SYMBOL>`) has `Account`, `Initial liquidity (optional)` with two amount inputs that don't fill each other, `Create Liquidity Pool`, and `Transaction fee`.

## How to get to it (user POV)

- Open `#/<relay>/pools`.
- Choose `Liquidity Pools` in `Main navigation`. It reads `Pools` below 440 px wide.
- Click a pool row to open its detail page.
- Create a pool from Portfolio → token → `Token Details` → `Liquidity Pool` → `Create Pool`. The route is not linked from the pool list.

## Driving it with agent-browser

Preconditions:

- The app tab is on `#/paseo/pools`.

Steps:

- **List** (no wallet). Run `agent-browser wait --text "Asset Hub - 1337"`, then `agent-browser snapshot -i -c`. Links such as `PAS USDC PAS/USDC Asset Hub - 1337 ...` and `PAS USDt PAS/USDt Asset Hub - 1984 ...` appear in TVL order.
- **Search** (no wallet). Run `agent-browser find role textbox fill "1984" --name "Search"`, then wait until the 1337 row is gone: `agent-browser wait --fn "![...document.querySelectorAll('#main-content a')].some((a) => a.innerText.includes('Asset Hub - 1337'))"`. Only PAS/USDt remains. Fill `zzzz` and wait for `No liquidity pools match your search`. Click `Clear search`.
- **Detail** (no wallet). Run `agent-browser find role link click --name "PAS/USDC Asset Hub - 1337"`. The URL becomes `#/paseo/pools/9` (DOT/USDC on Polkadot is `#/polkadot/pools/1`). `get text "#main-content"` shows `Pool liquidity` with both reserves, `Your position`, and the `Add` and `Remove` buttons.
- **Add inputs** (no wallet). Run `agent-browser find role textbox fill "1" --name "Native token amount"`. `Asset token amount` fills in proportion (3.993472 USDC on 2026-10-05).
- **Slippage** (no wallet). Click the button named `0.5%`, `scripts/wait-drawer.sh open`, click `1%` with `--exact`, and `scripts/wait-drawer.sh closed`. `Slippage tolerance` reads `1%`. Set it back to `0.5%`.
- **Remove tab** (no wallet). Click `Remove` with `--exact`. The remove controls render, disabled without a position.
- **Create page** (no wallet). Reach it from Portfolio (see `portfolio.md`). Check the heading and fields, and never submit: creating a pool is permanent and takes a deposit.
- **Account.** Select the signing test account in `Account` (`scripts/wait-drawer.sh open` after the click). The drawer shows no balances here. Back on the list, `Positions` appears.
- **Add (signed).** Not yet driven. Fill `1` in `Native token amount`. `Add Liquidity` becomes enabled only if the account holds enough of the asset. Run `agent-browser find role button click --name "Add Liquidity"`, then `talisman.mjs approve --signer "<test account name>"`. The dialog `Add PAS/USDC liquidity` ends at `Transaction succeeded`, and `Your position` is non-zero.
- **Remove (signed).** Not yet driven. `Remove` → `MAX` → `Remove Liquidity` → approve. The dialog `Remove PAS/USDC liquidity` ends at `Transaction succeeded`, and `Your position` is back to zero.
- **Proof.** Save the pool page text before and after, `talisman-approve.txt`, and a screenshot of `Your position`.

## Gotchas

- The pools list has no `Account` field. The pool detail and create pages do.
- `wait --text "TVL"` is not a load gate: the header and a placeholder row (`TK1/TK2`, `Asset Hub - 420`) render while loading. Wait for a real origin such as `Asset Hub - 1337`.
- Token buttons on the pool page are disabled, because the pair is fixed by the route.
- The `Add` and `Remove` mode buttons sit next to `Add Liquidity`. Use exact names.
- Check the test account's balance of the pool's asset first. Without enough USDC, adding to PAS/USDC shows `Insufficient balance` and `Simulation Failed`. Get the asset first, or use a pool whose asset the account holds.
- The Paseo `AsPgas` signing break (see `swap.md`) applies here too. Fall back to Polkadot with ≤ 0.01 DOT.
- After an add, remove the position again so the test account doesn't accumulate LP tokens across runs.
