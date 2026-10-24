# Liquidity pools

Liquidity Pools lists every native-token pool on the current Asset Hub by TVL, with the user's positions, under a hub that sums the TVL and draws the pools around the native token. A pool page shows reserves and the user's share, and it lets the user add or remove liquidity. A token without a pool can get one from the create-pool page.

## Sub-features

- `pools-hub`: above the table, `Total value locked`, `<n> pools, every one paired with <NATIVE>.`, and an SVG with one link per pool, named `<NATIVE>/<TOKEN> pool, <TVL>`. These links come before the table rows in a snapshot. The hub renders nothing with fewer than 3 pools or a zero total.
- `pools-list`: pool links named `<NATIVE> <TOKEN> <NATIVE>/<TOKEN> <origin> [<position value>] <TVL>`, where origin is `Asset Hub - <id>` or `Foreign - <origin>`. The `TVL` sort button is there unless a search leaves no rows. The `Positions` sort button needs a connected account. The active one has `aria-pressed="true"`.
- `pools-search`: the `Search` box matches the token's symbol, name, or exact asset id. No match shows `No liquidity pools match your search`. `Clear search` empties it.
- `pool-detail`: `#/<relay>/pools/<poolAssetId>` (tab title `PAS/USDC LP`) has the heading `Liquidity Pools › PAS/USDC`, the `ACCOUNT` field, `POOL LIQUIDITY` with both reserves and `EST. VALUE`, and `YOUR POSITION` with reserves, `EST. VALUE`, and the share (`N/A` without a position). An unknown id redirects to `#/<relay>/pools`.
- `pool-add`: the `Add` tab, with `Native token amount`, `Asset token amount` (filled in proportion to the reserves), `Use maximum balance` (`MAX`, only for a non-zero balance), `ADD LIQUIDITY`, and the summary `Slippage tolerance`, `Simulation`, `Transaction fee`.
- `pool-slippage`: the slippage value button (default `0.5%`) opens `Slippage Tolerance` with `0%`, `0.1%`, `0.3%`, `0.5%`, and `1%`. Pools keep their own setting, separate from Swap's (checked 2026-10-24).
- `pool-remove`: the `Remove` tab, with `LIQUIDITY TO REMOVE` (starts at `100%`), buttons `25%`, `50%`, `75%`, `MAX`, a slider, `EXPECTED OUTCOME`, `MIN. RECEIVED`, and `REMOVE LIQUIDITY`. All are disabled without a position.
- `pool-create`: `#/<relay>/pools/create/<tokenId>` (heading `Liquidity Pools › Create PAS/<SYMBOL>`, tab title `Create Pool PAS/<SYMBOL> | Kheopswap`) has `ACCOUNT`, `INITIAL LIQUIDITY (OPTIONAL)` with two amount inputs that don't fill each other, `CREATE LIQUIDITY POOL`, and `Transaction fee`.

## How to get to it (user POV)

- Open `#/<relay>/pools`.
- Choose `Liquidity` in `Main navigation`.
- Click a pool row to open its detail page.
- Create a pool from Portfolio → token → `Token Details` → `Liquidity Pool` → `Create Pool`. The route is not linked from the pool list.

## Driving it with agent-browser

Preconditions:

- The app tab is on `#/paseo/pools`.

Steps:

- **List** (no wallet). Run `agent-browser wait --text "Asset Hub - 1337"`, then `agent-browser snapshot -i -c`. After the hub links (`PAS/pUSD pool, 4.994M PAS` first on 2026-10-24), table links such as `PAS USDC PAS/USDC Asset Hub - 1337 ...` and `PAS USDt PAS/USDt Asset Hub - 1984 ...` appear in TVL order.
- **Search** (no wallet). Run `agent-browser find role textbox fill "1984" --name "Search"`, then wait until the 1337 row is gone: `agent-browser wait --fn "![...document.querySelectorAll('#main-content a')].some((a) => a.textContent.includes('Asset Hub - 1337'))"`. Use `textContent`: the hub links are SVG elements, which have no `innerText`. Only PAS/USDt remains in the table, and the hub keeps every pool. Fill `zzzz` and wait for `No liquidity pools match your search`. Click `Clear search`.
- **Detail** (no wallet). Run `agent-browser find role link click --name "PAS/USDC Asset Hub - 1337"`. The URL becomes `#/paseo/pools/9` (DOT/USDC on Polkadot is `#/polkadot/pools/1`). `get text "#main-content"` shows `POOL LIQUIDITY` with both reserves, `YOUR POSITION`, and the `Add` and `Remove` buttons.
- **Add inputs** (no wallet). Run `agent-browser find role textbox fill "1" --name "Native token amount"`. `Asset token amount` fills in proportion (1.144204 USDC on 2026-10-24).
- **Slippage** (no wallet). Click the button named `0.5%`, `scripts/wait-drawer.sh open`, click `1%` with `--exact`, and `scripts/wait-drawer.sh closed`. `Slippage tolerance` reads `1%`, and the swap page still reads `0.5%`. Set it back to `0.5%`.
- **Remove tab** (no wallet). Click `Remove` with `--exact`. The remove controls render, disabled without a position.
- **Create page** (no wallet). Reach it from Portfolio (see `portfolio.md`). Check the heading and fields, and never submit: creating a pool is permanent and takes a deposit.
- **Account.** Select the signing test account in `Account` (`scripts/wait-drawer.sh open` after the click). The drawer shows no balances here. Back on the list, `Positions` appears.
- **Add (signed).** Fill `Native token amount`. `ADD LIQUIDITY` becomes enabled only if the account holds enough of the asset. Run `agent-browser find role button click --name "ADD LIQUIDITY" --exact`, then `talisman.mjs approve --signer "<test account name>"`. The popup reads `AssetConversion: add_liquidity`. The dialog `Add PAS/USDC liquidity` ends at `Transaction succeeded`, and `YOUR POSITION` is non-zero. Driven on Polkadot pool 1 on 2026-10-24 with 0.005 DOT and 0.0055 USDC.
- **Remove (signed).** `Remove` → `MAX` → `REMOVE LIQUIDITY` (all with `--exact`) → approve. The popup reads `AssetConversion: remove_liquidity`. The dialog `Remove PAS/USDC liquidity` ends at `Transaction succeeded`, and `YOUR POSITION` is back to zero. Driven on Polkadot pool 1 on 2026-10-24.
- **Proof.** Save the pool page text before and after, `talisman-approve.txt`, and a screenshot of `YOUR POSITION`.

## Gotchas

- The pools list has no `Account` field. The pool detail and create pages do.
- `wait --text "TVL"` is not a load gate: the header and a placeholder row (`TK1/TK2`, `Asset Hub - 420`) render while loading. Wait for a real origin such as `Asset Hub - 1337`.
- Token buttons on the pool page are disabled, because the pair is fixed by the route.
- The `Add` and `Remove` mode buttons sit next to `ADD LIQUIDITY`. Use exact names.
- Check the test account's balance of the pool's asset first. Without enough USDC, adding to PAS/USDC shows `Insufficient balance`, and `Simulation` reads `Failed`. Get the asset first, or use a pool whose asset the account holds.
- Signing on Paseo needs the Talisman build from `~/.kheopswap/talisman.zip` (see `../SKILL.md`). Without it, fall back to Polkadot with ≤ 0.01 DOT.
- After an add, remove the position again so the test account doesn't accumulate LP tokens across runs.
