# Transfer

Transfer lets a user send any Asset Hub token from one of their accounts to an owned account or a pasted address. The user sees the recipient's balance, a dry-run simulation, and the fee before signing.

## Sub-features

- `transfer-from`: the `From` field opens `Select account`, which lists owned accounts only.
- `transfer-to`: the `To` field opens `Select account`, which has an `Address` box plus the connected accounts. The recipient's balance appears above the field.
- `transfer-amount`: the `Transfer amount` box, `Use maximum balance`, and the token picker.
- `transfer-summary`: `Simulation` and `Transaction fee`.
- `transfer-submit`: `Transfer` → Talisman approval → toast.

## How to get to it (user POV)

- Open `#/<relay>/transfer`.
- Choose `Transfer` in `Main navigation`.

## Driving it with agent-browser

Preconditions:

- The app tab is on `#/paseo/transfer`.
- `Guardians SUB` holds PAS.

Steps:

- **Sender.** Choose `From`, then `Guardians SUB`. Run `agent-browser find role button click --name "From" --exact`, `agent-browser wait --text "Connected Accounts"`, and `agent-browser find role button click --name "Guardians SUB"`. The balance label next to `From` shows the PAS balance.
- **Recipient (owned).** Not yet driven: nobody has confirmed whether the app accepts a recipient equal to the sender. Choose `To`, then `Guardians SUB`. A self-transfer costs only the fee. Use the same commands with `--name "To" --exact`. A balance appears next to `To`.
- **Recipient (pasted).** Open `To` and run `agent-browser snapshot -i -c`. The first `textbox` under the `Address` heading has no accessible name. Run `agent-browser fill @<ref> "<address>"`, then click the enabled button next to it.
- **Amount.** Run `agent-browser find role textbox fill "0.1" --name "Transfer amount"`, then `agent-browser wait --text "Success"`. The summary shows `Simulation Success` and a non-zero `Transaction fee`.
- **Submit.** Not yet driven end to end. Run `agent-browser find role button click --name "Transfer" --exact`, then `node .claude/skills/verify/scripts/talisman.mjs approve --signer "Guardians"`. The helper exits 0, and the app shows a transaction toast that ends in success.
- **Proof.** Save `get text "#main-content"` and a screenshot before the submit, `talisman-approve.txt`, the success toast screenshot, and the sender balance from the `Account` drawer afterwards.

## Gotchas

- The nav `Transfer` is a link, and the submit `Transfer` is a button. Pass `--exact` with `role button`.
- The `Address` box has no accessible name, so it needs a snapshot ref.
- A self-transfer leaves the balance unchanged except for the fee. Check that the drop matches the fee, not the amount.
- The Paseo `AsPgas` signing break (see `swap.md`) applies here too. Fall back to `#/polkadot/transfer` with ≤ 0.01 DOT, sent to `Guardians SUB` itself.
- Never send to an address you can't name as a user-owned test account.
