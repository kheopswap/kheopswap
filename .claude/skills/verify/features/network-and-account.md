# Network and account

The header lets a user switch between the four Asset Hubs and manage wallet connections. Account drawers connect wallets (Talisman for Polkadot, Talisman for Ethereum, WalletConnect) and pick the account a form uses.

## Sub-features

- `network-switch`: `Chain` opens `Select network`, with `Polkadot Asset Hub`, `Kusama Asset Hub`, `Westend Asset Hub`, and `Paseo Asset Hub`. Picking one rewrites the route's relay segment and keeps the page.
- `light-clients`: the `Connect via light clients` switch in `Select network`. `VITE_DISABLE_LIGHT_CLIENTS=true` in the committed `web/.env` disables it, and the drawer reads `Light clients are temporarily disabled.` The switch has no accessible name: it shows as `switch [checked=false, disabled]` in a snapshot.
- `wallet-connect`: the header button `Connect wallet` opens a drawer titled `Connect`, with either `Installed wallets` and a button per injected wallet (`Talisman(Polkadot)`) or `No wallets found`, then `External wallets` (`WalletConnect`), and `Connected Accounts` as disabled buttons without balances.
- `account-select`: a form's `Account`, `From`, or `To` field opens a drawer titled `Select account` with the same wallet lists and the `Connected Accounts` as clickable buttons. With no account connected, the field reads `Connect Wallet` and the drawer heading is `Connect wallet`. Swap and Transfer show balances next to each account; the pool page does not. Transfer's `To` adds an `Address` box.
- `chain-status`: the footer shows `Best: <n>`, `Finalized: <n>`, and `<x>/<y> active subscriptions` (hidden below 640 px wide), then `Powered by polkadot-api and kheopskit`.
- `redirects`: `/` and an unknown relay go to `#/polkadot/swap`. `#/<relay>` and unknown pages go to `#/<relay>/swap`.

## How to get to it (user POV)

- Use the `Chain` and `Connect wallet` buttons in the header, on every page.
- Use the account field on the Swap, Transfer, and pool pages.
- Change the relay segment of the URL: `#/polkadot/...`, `#/kusama/...`, `#/westend/...`, or `#/paseo/...`.

## Driving it with agent-browser

Preconditions:

- The app tab is open on any route.

Steps:

- **Switch network** (no wallet). Run:
  - `agent-browser find role button click --name "Chain"`
  - `.claude/skills/verify/scripts/wait-drawer.sh open`
  - `agent-browser find role button click --name "Paseo Asset Hub"`
  - `agent-browser wait --url "**/paseo/**"`

  The URL now has the `paseo` segment, and the drawer closes.
- **Chain liveness** (no wallet). Read the footer twice, a few blocks apart: `agent-browser get text "#root" | grep -E 'Best|Finalized'`. `Best:` and `Finalized:` increase.
- **Redirects** (no wallet). Open `http://localhost:5173/` and `http://localhost:5173/#/bogus/swap`: both end on `#/polkadot/swap`. Open `#/paseo`: it ends on `#/paseo/swap`.
- **Wallets.** Run `agent-browser find role button click --name "Connect wallet"` and `scripts/wait-drawer.sh open`. The drawer lists `Talisman(Polkadot)`, `Talisman(Ethereum)`, `WalletConnect`, and, once connected, `Connected Accounts` with buttons named `<account name> <short address>`. Close it with `press Escape` and `scripts/wait-drawer.sh closed`.
- **Accounts.** On `#/paseo/swap`, run `agent-browser find role button click --name "Account"` and `scripts/wait-drawer.sh open`. The drawer heading is `Select account`, and buttons such as `<account name> <short address> <balance>` are listed under `Connected Accounts`. The accessible name starts with `Account identicon for ...`, so match `--name "<test account name>"` as a substring. When one account name is a prefix of another, such as `<name>` and `<name> 2`, add the start of the short address: `--name "<name> 5Abc"`.
- **Connect a wallet.** Only when `Connected Accounts` is empty. Choose `Talisman(Polkadot)`, then run `node .claude/skills/verify/scripts/talisman.mjs connect`. The helper clicks `Connect All` and `Connect <n>`, and the accounts appear in the drawer. A fresh container needs this once per launch, unless the backup already authorized `localhost:5173`.
- **Proof.** Save the URL after the switch, the footer text, and the drawer snapshot.

## Gotchas

- `http://localhost:5173/` always redirects to `#/polkadot/swap`, which is mainnet. Open `#/paseo/...` explicitly.
- Clicking a wallet that is already connected disconnects it. Reconnecting needs the popup again: run `talisman.mjs connect`.
- Clicking a network while the `Select network` drawer is still sliding in does nothing. Run `wait-drawer.sh open` first.
- `talisman.mjs` unlocks a locked popup with `~/.kheopswap/talisman.password`. Exit 3 means that file is missing or Talisman rejected it. Stop and ask the user.
