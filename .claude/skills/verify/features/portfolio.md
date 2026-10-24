# Portfolio

Portfolio lists the tokens of the current Asset Hub with their prices, and the balances of the connected accounts summed across accounts. Prices are in the native token, with the stable value below when the native token is not the stable one. Opening a token shows its on-chain details and a per-account breakdown. With no connected account, the page is called `Tokens` and shows prices only.

## Sub-features

- `portfolio-allocation`: with accounts and a non-zero total, a `Total portfolio` block sits above the table: the total in the stable token, `Held across <n> accounts`, and a legend of `<SYMBOL> <n>%` plus `Other` for tokens under 2%.
- `portfolio-rows`: one row per token that is verified, held, or in a pool, with the balance, its value, and the price.
- `portfolio-value`: a holding's value is what selling it through its Asset Hub pool would return (token to native through the pool, native to stable at the spot rate), so it never exceeds the pool's native reserve. Values print with two fraction digits (`5,000.90 PAS`, `0.75 PAS`), compact only from a million, with the exact value in the tooltip. The price column stays the spot price with four significant digits.
- `portfolio-low-liquidity`: a holding is left out of the total, with `Low liquidity` in its balance cell and next to the `Portfolio` amount in `Token Details`, when its pool holds under 100 stable units on the native side, or when selling the holding would return under half of its spot value (the holding dwarfs the pool). The price column shows `Low liquidity` under the spot price when one token already dwarfs the pool, and those rows sort after priced ones. A token with no Asset Hub pool reads `No price`. The allocation header reads `Held across <n> accounts, not counting <m> tokens with low liquidity and <k> tokens without a price` (either part alone when the other count is zero), and hovering `low liquidity`, `without a price`, `Low liquidity` or `No price` explains why.
- `portfolio-discovery`: tokens outside the watched set (native, verified, pooled, held, searched) are found by a one-shot read of every token for the connected accounts, about a second after the first render and then every 5 minutes while the page is open. The last run is remembered per network and account set, so a reload within 5 minutes skips it. A token received later shows up within that interval.
- `portfolio-search`: `Search for more tokens` matches symbol, name, or an exact asset id, including tokens nobody holds. `Clear search` empties it. No match shows `No tokens match your search`.
- `portfolio-sort`: the `Balance` and `Price` column header buttons. The active one has `aria-pressed="true"`. `Balance` is the default with accounts. Without accounts only `Price` shows.
- `portfolio-details`: clicking a row opens `Token Details`. Rows depend on the token type:
  - all: `Network`, `Type`, `Total Supply`, `Price` (or `N/A`), and `TVL` (`0 <SYMBOL>` without a pool);
  - `asset`: `Asset Id`, `Holders`, `Status`, `Owner` (plus `Admin`, `Issuer`, `Freezer` when they differ from the owner);
  - `foreign-asset`: `Origin`, `Holders`, `Status`, `Owner`;
  - `asset` and `foreign-asset`: `Liquidity Pool`, a button `Pool <id>` that opens the pool page, or `Create Pool` that opens `#/<relay>/pools/create/<tokenId>`;
  - with accounts: a `Portfolio` row with the total, then one line per connected account;
  - without accounts: `Connect your accounts to browse your balances.`, whose button `Connect your accounts` opens the `Connect` drawer on top of `Token Details`.

## How to get to it (user POV)

- Open `#/<relay>/portfolio`.
- Choose `Portfolio` in `Main navigation`. It reads `Tokens` when no account is connected.

## Driving it with agent-browser

Preconditions:

- The app tab is on `#/paseo/portfolio`.
- For the balance steps: at least one connected account holds a token.

Steps:

- **Allocation.** With accounts, `get text "#main-content"` starts with `Total portfolio`, the total, `Held across <n> accounts`, and the legend. Legend entries that share a symbol carry their chain: `PAS (Paseo AH)`, `PAS (Paseo People)`. On 2026-10-25, the 3.475K MYTH holding would drain its 0.0103 MYTH / 5K PAS pool, so it read `Low liquidity`, the header read `Held across 4 accounts, not counting 1 token with low liquidity`, the legend `PAS (Paseo AH) 51% PAS (Paseo People) 49% Other 0%` and the total `10,197.75 PAS`.
- **Rows load.** With accounts, run `agent-browser wait --text "Balance"`. Without, run `agent-browser wait --text "Price"`. Then run `agent-browser snapshot -i -c`. Buttons named like `PAS PAS Paseo Asset Hub <balance> ...` and `USDC USDC Asset Hub - 1337 ...` are listed. The tab title is `Portfolio | Kheopswap`, or `Tokens | Kheopswap` without accounts.
- **Sort.** Run `agent-browser find role button click --name "Price" --exact`. Read the state with `agent-browser eval "[...document.querySelectorAll('#main-content button[aria-pressed]')].map((b) => b.innerText + ':' + b.getAttribute('aria-pressed')).join()"`, and check that the row order changed. Click `Balance` to restore.
- **Search.** Run `agent-browser find role textbox fill "USDC" --name "Search for more tokens"`. Several rows remain on Paseo: USDC `1337`, `27`, and `50000309`, plus `fUSDCx` and `tUSDC` tokens. Fill `1337` to keep one. Click `Clear search` to restore the list.
- **Details.** Run `agent-browser find role button click --name "USDC USDC Asset Hub - 1337"` and `scripts/wait-drawer.sh open`. Wait until the placeholders resolve: `agent-browser wait --fn "!document.querySelector('[role=dialog]').innerText.includes('000 TKN')"`. Read the drawer with `agent-browser get text "[role=dialog]"`. It includes `Asset Id 1337`, `Liquidity Pool` with `Pool 9`, and, with accounts, `Portfolio` followed by one line per account.
- **Pool link.** Click `Pool 9`: the URL becomes `#/paseo/pools/9`.
- **Create link.** Search a token without a pool (on 2026-10-05, `BATC`, asset `50001010`) and open its details. `Liquidity Pool` shows `Create Pool`, which opens `#/paseo/pools/create/asset::pasah::50001010`.
- **No accounts.** Disconnect `Talisman(Polkadot)` in the header wallet drawer: the nav link and the tab title read `Tokens`, and `Token Details` shows `Connect your accounts`. Clicking it opens `Connect`. Choose `Talisman(Polkadot)` there to reconnect, then `press Escape` twice to close both drawers.
- **Proof.** Save the snapshot of the rows, the drawer text, and a screenshot of the drawer.

## Gotchas

- Totals add up every connected account, including Ethereum accounts. Per-account amounts only appear in `Token Details`.
- The footer's `active subscriptions` stays around 140 on Paseo with 4 accounts (native, verified, pooled, held and searched tokens). Discovery reads the other tokens without subscribing, so a count in the thousands is a regression.
- On Paseo, MYTH shows the low-liquidity rendering: its holding dwarfs the pool. No held token trips the 100-unit pool floor there; Polkadot's `LAOS`, `WUD`, `TSN`, `DED` and `DOTA` do, and its Hydration tokens without an Asset Hub pool (`HDX`, `DAI`, `ASTR`, ...) read `No price`.
- `wait --text "Search for more tokens"` never matches, because it is a placeholder.
- Row names change with balances. Match them on the stable prefix (`<SYMBOL> <SYMBOL> <origin>`).
- Paseo's stable token is PAS itself, so prices and values are in PAS with no second line.
- `Token Details` first renders placeholders such as `000 TKN`, `00000`, and `0xdeadbeef...deadbeef`. Don't read them as data.
- Tiny prices render as `0.0₆52 DOT` but their text, accessible name and clipboard value are the full decimal (`0.00000052 DOT`): the zeros are in the DOM at font size 0 and the count is CSS generated content.
