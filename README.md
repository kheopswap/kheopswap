# kheopswap.xyz

[https://kheopswap.xyz](https://kheopswap.xyz) - A decentralized exchange for seamless swaps on the Polkadot Asset Hub.

## Development

```bash
corepack enable

pnpm install

# optionally, update PAPI metadata from live networks
# pnpm papi update

pnpm dev
```

A daily workflow runs `pnpm papi update` and opens a PR when a supported chain has a runtime upgrade. It needs a `RUNTIME_UPGRADE_TOKEN` secret, a fine-grained PAT with contents and pull requests write access, because a PR opened with `GITHUB_TOKEN` does not trigger CI.

## Coding agents

Project instructions for coding agents live in [`AGENTS.md`](AGENTS.md).

Maintainers work with [pstack](https://github.com/michael-denyer/pstack-claude). In Claude Code:

```text
/plugin marketplace add michael-denyer/pstack-claude
/plugin install pstack@pstack-claude
```

In Codex:

```bash
codex plugin marketplace add michael-denyer/pstack-claude
codex plugin add pstack@pstack-claude
```

Other harnesses can follow pstack's [shared skills installation](https://github.com/michael-denyer/pstack-claude/blob/main/docs/reference.md#shared-skills-installation).

## Token registry maintenance

Token snapshots are maintained by `pnpm fetch-tokens` (locally) and by the scheduled CI workflow.

- `web/src/registry/tokens/tokens.[networkId].json` files are **automatically generated**.
- These generated files should **never be modified manually**.
- Manual token edits belong only in `web/src/registry/tokens/tokens-overrides.yaml`.

### Override rules

- Every override entry must target a token by exact `id`.
- The `id` must match an existing generated token id.
- Typical maintenance flow:
	1. Find/copy the token `id` from `tokens.[networkId].json`.
	2. Add/update the corresponding entry in `tokens-overrides.yaml`.
	3. Regenerate snapshots with `pnpm fetch-tokens` when needed.

### Environment variables used by `pnpm fetch-tokens`

- `COINGECKO_API_KEY`: optional, increases CoinGecko rate limits.
- `COINGECKO_BUDGET_PER_RUN`: optional cap for CoinGecko calls per run.
- `DISCORD_WEBHOOK_URL`: optional; when set, failures send a Discord notification containing the error message.
