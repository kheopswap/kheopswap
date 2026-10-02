# Portfolio

Portfolio lists every token the connected accounts hold on the current Asset Hub, aggregated across accounts, with prices in the reference stable token. Opening a token shows its on-chain details and a per-account breakdown.

## Sub-features

- `portfolio-rows`: one row per held token, with the balance, its stable value, and the price.
- `portfolio-search`: `Search for more tokens` filters the rows and finds tokens the accounts don't hold.
- `portfolio-sort`: the `Balance` and `Price` column header buttons.
- `portfolio-details`: clicking a row opens `Token Details`, which shows `Network`, `Type`, `Asset Id`, `Total Supply`, `Holders`, `Status`, the roles, `Liquidity Pool`, `Price`, `TVL`, and `Portfolio` (per account).

## How to get to it (user POV)

- Open `#/<relay>/portfolio`.
- Choose `Portfolio` in `Main navigation`.

## Driving it with agent-browser

Preconditions:

- The app tab is on `#/paseo/portfolio`.
- At least one connected account holds a token.

Steps:

- **Rows load.** Run `agent-browser wait --text "Balance"`, then `agent-browser snapshot -i -c`. Buttons named like `PAS PAS Paseo Asset Hub <balance> ...` and `USDC USDC Asset Hub - 1337 ...` are listed.
- **Search.** Run `agent-browser find role textbox fill "USDC" --name "Search for more tokens"`. Only rows matching `USDC` remain.
- **Details.** Run `agent-browser find role button click --name "USDC USDC Asset Hub - 1337"`, then `agent-browser wait --text "Token Details"`. The drawer text includes `Asset Id 1337`, `Liquidity Pool`, and a `Portfolio` section with one line per account. Read it with `agent-browser eval "document.body.innerText.split('Token Details')[1]"`.
- **Proof.** Save the snapshot of the rows, the drawer text, and a screenshot of the drawer.

## Gotchas

- Totals add up every connected account, including the `0x5C9E...` Ethereum account. Per-account amounts only appear in `Token Details` → `Portfolio`.
- `wait --text "Search for more tokens"` never matches, because it is a placeholder. Wait for `Balance` instead.
- Row names change with balances. Match them on the stable prefix (`<SYMBOL> <SYMBOL> <origin>`).
- Paseo has no market prices, so stable values may show in PAS.
