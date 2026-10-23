# Transfer

Transfer lets a user send any Asset Hub token from one of their accounts to an owned account or a pasted address. The user sees the recipient's balance, a dry-run simulation, and the fee before signing.

## Sub-features

- `transfer-from`: the `FROM` field opens `Select account` with the connected accounts. It has no `Address` box.
- `transfer-to`: the `TO` field opens `Select account` with an `Address` box plus the connected accounts. With no account connected, the drawer heading is `Connect wallet`, and the `Address` box still works. The recipient's balance appears next to the `TO` label. A pasted SS58 address shows in full, an Ethereum address shortened (`0x1111...111111`).
- `transfer-amount`: the `Transfer amount` box, `Use maximum balance` (`MAX`, needs a sender with a balance), and the token picker (`Selected token: PAS on Paseo AH. Change token`).
- `transfer-summary`: `Simulation` and `Transaction fee`. Both need a sender, and the simulation also needs a recipient. The fee value opens `Select fee token`, as in `swap.md`. An amount above the balance shows `Insufficient balance` and `Simulation` `Failed`.
- `transfer-submit`: `TRANSFER` → follow-up dialog `Transfer <SYMBOL>` reading `Approve in Talisman` → Talisman approval → `Transaction succeeded`.

## How to get to it (user POV)

- Open `#/<relay>/transfer`.
- Choose `Transfer` in `Main navigation`.

## Driving it with agent-browser

Preconditions:

- The app tab is on `#/paseo/transfer`.
- For the account steps: the signing test account holds PAS. Check the `Account` drawer.

Steps:

- **Recipient (pasted)** (no wallet). Run `agent-browser find role button click --name "TO" --exact` and `scripts/wait-drawer.sh open`, then `agent-browser snapshot -i -c`. Under the `Address` heading are a `textbox` and a `button`, both unnamed. The button stays disabled until the text is a valid SS58 or Ethereum address. Run `agent-browser fill @<textbox ref> "<address>"`, click `@<button ref>`, and run `scripts/wait-drawer.sh closed`. `TO` shows the address, and its balance appears next to the label.
- **Token picker** (no wallet). Click `Selected token: PAS on Paseo AH. Change token`, run `scripts/wait-drawer.sh open`, and check the `Select token` heading. Close it with `press Escape` and `scripts/wait-drawer.sh closed`.
- **Sender.** Run `agent-browser find role button click --name "FROM" --exact`, `scripts/wait-drawer.sh open`, `agent-browser find role button click --name "<test account name>"`, and `scripts/wait-drawer.sh closed`. The balance next to `FROM` and next to `MAX` shows the PAS balance. The field may already be filled: forms default to the last chosen account.
- **Recipient (owned).** Do the same with `--name "TO" --exact`. A recipient equal to the sender is accepted (checked 2026-10-05), and a self-transfer costs only the fee.
- **Amount.** Run `agent-browser find role textbox fill "0.1" --name "Transfer amount"`. Wait for a visible `Simulation` `Success` (see `README.md`) and a non-zero `Transaction fee`.
- **Submit.** Run `agent-browser find role button click --name "TRANSFER" --exact`. The dialog `Transfer PAS` opens at once, reading `Approve in Talisman`. Then run `node .claude/skills/verify/scripts/talisman.mjs approve --signer "<test account name>"`. The helper exits 0, and the dialog ends at `Transaction succeeded`. Driven end to end on Polkadot on 2026-10-24: a 0.01 DOT self-transfer, popup text `Approve Request ... Transfer 0.01 DOT ($0.0111) to <account name>`, then `Transaction succeeded` with `Effective fee 0.0009 DOT`.
- **Proof.** Save `get text "#main-content"` and a screenshot before the submit, `talisman-approve.txt`, the dialog at `Transaction succeeded`, and the sender balance from the `Account` drawer afterwards.

## Gotchas

- The nav `TRANSFER` is a link, and the submit `TRANSFER` is a button. Pass `--exact` with `role button` and the uppercase name.
- The `Address` box and its confirm button have no accessible names, so they need snapshot refs. Take the refs from a fresh snapshot: they change when the page re-renders.
- `Transaction fee` reads `0 PAS` until a sender is selected and the estimate arrives.
- A self-transfer leaves the balance unchanged except for the fee. Check that the drop matches the fee, not the amount.
- The amount stays filled after a successful submit (seen 2026-10-24).
- The Paseo signing break (see `../SKILL.md`) applies here too: on 2026-10-24 the dialog read `Transfer PAS`, `Transaction failed`, `PJS does not support this signed-extension: AsScarcity`, and closed about 5 s later. Fall back to `#/polkadot/transfer` with ≤ 0.01 DOT, sent to the test account itself.
- Never send to an address you can't name as a user-owned test account.
- The follow-up dialog ignores `Escape` in every state. Close it with `agent-browser find role button click --name "CLOSE" --exact`.
