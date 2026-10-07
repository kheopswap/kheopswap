# Liquidity pools

Liquidity Pools lists the native-token pools on the current Asset Hub by TVL, with the user's positions. A pool page shows reserves and the user's share, and it lets the user add or remove liquidity.

## Sub-features

- `pools-list`: pool links named `<NATIVE> <TOKEN> <NATIVE>/<TOKEN> <origin> <TVL>`, sortable by the `Positions` and `TVL` buttons.
- `pools-search`: the `Search` box filters pools.
- `pool-detail`: `#/<relay>/pools/<poolAssetId>` shows `Pool liquidity`, `Est. Value`, and `Your position`.
- `pool-add`: the `Add` tab, with `Native token amount`, `Asset token amount`, and `Add Liquidity`.
- `pool-remove`: the `Remove` tab, which removes from an existing position.
- `pool-create`: `#/<relay>/pools/create/<tokenId>` creates a pool for a token that has none.

## How to get to it (user POV)

- Open `#/<relay>/pools`.
- Choose `Liquidity` in `Main navigation`.
- Click a pool row to open its detail page.

## Driving it with agent-browser

Preconditions:

- The app tab is on `#/paseo/pools`.

Steps:

- **List.** Run `agent-browser wait --text "TVL"`, then `agent-browser snapshot -i -c`. Links such as `PAS USDC PAS/USDC Asset Hub - 1337 ...` and `PAS USDt PAS/USDt Asset Hub - 1984 ...` appear in TVL order.
- **Search.** Run `agent-browser find role textbox fill "USDC" --name "Search"`. Only pools whose token matches `USDC` remain.
- **Detail.** Run `agent-browser find role link click --name "PAS/USDC Asset Hub - 1337"`. The URL matches `#/paseo/pools/<id>`. On Polkadot, DOT/USDC is `#/polkadot/pools/1`. `get text "#main-content"` shows `Pool liquidity` with both reserves, `Your position`, and the `Add` and `Remove` buttons.
- **Add (signed).** Not yet driven. Select `Guardians SUB` in `Account`, then run `agent-browser find role textbox fill "1" --name "Native token amount"`. `Asset token amount` fills in proportionally, and `Add Liquidity` becomes enabled. Run `agent-browser find role button click --name "Add Liquidity"`, then `talisman.mjs approve --signer "Guardians"`. After finalization, `Your position` is non-zero.
- **Proof.** Save the pool page text before and after, `talisman-approve.txt`, and a screenshot of `Your position`.

## Gotchas

- The pools page has no `Account` field. The pool detail page does.
- Token buttons on the pool page are disabled, because the pair is fixed by the route.
- The `Add` and `Remove` mode buttons sit next to `Add Liquidity`. Use exact names.
- After an add, remove the position again so the test account doesn't accumulate LP tokens across runs.
