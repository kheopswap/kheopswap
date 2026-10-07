# Network and account

The header lets a user switch between the four Asset Hubs and manage wallet connections. The account drawer connects wallets (Talisman for Polkadot, Talisman for Ethereum, WalletConnect) and picks the account used by a form.

## Sub-features

- `network-switch`: the header's network button (`Network: <name>`, showing the chain logo and a short name such as `Paseo`) opens `Select network`, with `Polkadot Asset Hub`, `Kusama Asset Hub`, `Westend Asset Hub`, and `Paseo Asset Hub`. Picking one rewrites the route's relay segment.
- `light-clients`: the `Connect via light clients` switch in `Select network`. It is disabled locally, where the drawer reads `Light clients are temporarily disabled.`
- `wallet-connect`: the header's wallet button opens the wallet drawer. It reads `Connect` (accessible name `Connect wallet`) with no accounts, and shows the wallet icons and `<n> accounts` (accessible name `Wallet: <n> connected`) once connected. The drawer has with `Installed wallets` and `External wallets`.
- `account-select`: a form's `Account`, `From`, or `To` field opens `Select account`, with `Connected Accounts` and their balances.
- `chain-status`: the footer shows `Best: <n>`, `Finalized: <n>`, and `<x>/<y> active subscriptions`.

## How to get to it (user POV)

- Use the `Network` and wallet buttons in the header, on every page. The header also has a `Switch to light mode` / `Switch to dark mode` button.
- Use the account field on the Swap, Transfer, and pool pages.
- Change the relay segment of the URL: `#/polkadot/...`, `#/kusama/...`, `#/westend/...`, or `#/paseo/...`.

## Driving it with agent-browser

Preconditions:

- The app tab is open on any route.

Steps:

- **Switch network.** Run:
  - `agent-browser find role button click --name "Network"`
  - `agent-browser wait --text "Select network"`
  - `agent-browser find role button click --name "Paseo Asset Hub"`
  - `agent-browser wait --url "**/paseo/**"`

  The URL now has the `paseo` segment, and the footer's `Finalized:` number keeps increasing.
- **Chain liveness.** Read the footer twice, a few blocks apart: `agent-browser get text "#root"` (or a screenshot of the footer). `Best:` and `Finalized:` increase.
- **Accounts.** On `#/paseo/swap`, run `agent-browser find role button click --name "Account"`, then `agent-browser wait --text "Connected Accounts"`. The drawer lists `Talisman(Polkadot)`, `Talisman(Ethereum)`, and `WalletConnect`, and buttons such as `Guardians SUB 5CcU6DRp...YffCfSAP <balance>`.
- **Connect a wallet.** This is needed only when `Connected Accounts` is empty. Choose `Talisman(Polkadot)`, then run `node .claude/skills/verify/scripts/talisman.mjs connect`. The helper clicks `Connect All` and `Connect <n>`, and the accounts appear in the drawer.
- **Proof.** Save the URL after the switch, the footer text, and the drawer snapshot.

## Gotchas

- `http://localhost:5173/` always redirects to `#/polkadot/swap`, which is mainnet. Open `#/paseo/...` explicitly.
- The dev Chrome profile is already connected. Don't disconnect wallets: reconnecting needs the popup, and possibly the user to unlock Talisman.
- `talisman.mjs` exit 3 means Talisman is locked. Stop and ask the user.
- The header wallet button's accessible name deliberately avoids the word "account", so `--name "Account"` still reaches the form's account field. Open the header drawer with `--name "wallet"`, which matches both of its states.
- On Paseo the header network button is named `Network: Paseo`, so a short case-insensitive name such as `--name "PAS"` hits it before any form control. Use `--exact` or a longer name like `USDC USDC Asset Hub - 1337`.
