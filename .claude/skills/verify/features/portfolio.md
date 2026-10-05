# Portfolio

Portfolio lists the tokens of the current Asset Hub with their prices, and the balances of the connected accounts summed across accounts. Prices are in the native token, with the stable value below when the native token is not the stable one. Opening a token shows its on-chain details and a per-account breakdown. With no connected account, the page is called `Tokens` and shows prices only.

## Sub-features

- `portfolio-rows`: one row per token that is verified, held, or in a pool, with the balance, its value, and the price.
- `portfolio-search`: `Search for more tokens` matches symbol, name, or an exact asset id, including tokens nobody holds. `Clear search` empties it. No match shows `No tokens match your search`.
- `portfolio-sort`: the `Balance` and `Price` column header buttons. The active one has `aria-pressed="true"`. `Balance` is the default with accounts. Without accounts only `Price` shows.
- `portfolio-details`: clicking a row opens `Token Details`. Rows depend on the token type:
  - all: `Network`, `Type`, `Total Supply`, `Price` (or `N/A`), and `TVL` when pooled;
  - `asset`: `Asset Id`, `Holders`, `Status`, `Owner` (plus `Admin`, `Issuer`, `Freezer` when they differ from the owner);
  - `asset` and `foreign-asset`: `Liquidity Pool`, a button `Pool <id>` that opens the pool page, or `Create Pool` that opens `#/<relay>/pools/create/<tokenId>`;
  - with accounts: a `Portfolio` row with the total, then one line per connected account;
  - without accounts: `Connect your accounts to browse your balances.`, whose button opens the `Connect` drawer.

## How to get to it (user POV)

- Open `#/<relay>/portfolio`.
- Choose `Portfolio` in `Main navigation`. It reads `Tokens` when no account is connected.

## Driving it with agent-browser

Preconditions:

- The app tab is on `#/paseo/portfolio`.
- For the balance steps: at least one connected account holds a token.

Steps:

- **Rows load.** With accounts, run `agent-browser wait --text "Balance"`. Without, run `agent-browser wait --text "Price"`. Then run `agent-browser snapshot -i -c`. Buttons named like `PAS PAS Paseo Asset Hub <balance> ...` and `USDC USDC Asset Hub - 1337 ...` are listed. The tab title is `Portfolio | Kheopswap`, or `Tokens | Kheopswap` without accounts.
- **Sort.** Run `agent-browser find role button click --name "Price" --exact`. Read the state with `agent-browser eval "[...document.querySelectorAll('#main-content button[aria-pressed]')].map((b) => b.innerText + ':' + b.getAttribute('aria-pressed')).join()"`, and check that the row order changed. Click `Balance` to restore.
- **Search.** Run `agent-browser find role textbox fill "USDC" --name "Search for more tokens"`. Several rows remain on Paseo: USDC `1337`, `27`, and `50000309`, plus `fUSDCx` and `tUSDC` tokens. Fill `1337` to keep one. Click `Clear search` to restore the list.
- **Details.** Run `agent-browser find role button click --name "USDC USDC Asset Hub - 1337"` and `scripts/wait-drawer.sh open`. Wait until the placeholders resolve: `agent-browser wait --fn "!document.querySelector('[role=dialog]').innerText.includes('000 TKN')"`. Read the drawer with `agent-browser get text "[role=dialog]"`. It includes `Asset Id 1337`, `Liquidity Pool` with `Pool 9`, and, with accounts, `Portfolio` followed by one line per account.
- **Pool link.** Click `Pool 9`: the URL becomes `#/paseo/pools/9`.
- **Create link.** Search a token without a pool (on 2026-10-05, `BATC`, asset `50001010`) and open its details. `Liquidity Pool` shows `Create Pool`, which opens `#/paseo/pools/create/asset::pasah::50001010`.
- **Proof.** Save the snapshot of the rows, the drawer text, and a screenshot of the drawer.

## Gotchas

- Totals add up every connected account, including the `0x5C9E...` Ethereum account. Per-account amounts only appear in `Token Details`.
- `wait --text "Search for more tokens"` never matches, because it is a placeholder.
- Row names change with balances. Match them on the stable prefix (`<SYMBOL> <SYMBOL> <origin>`).
- Paseo's stable token is PAS itself, so prices and values are in PAS with no second line.
- `Token Details` first renders placeholders such as `000 TKN`, `00000`, and `0xdeadbeef...deadbeef`. Don't read them as data.
- Without accounts, a search with no match shows a loading row forever instead of `No tokens match your search` (seen 2026-10-05). Report it as a product bug. The empty state with accounts has not been checked.
