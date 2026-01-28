# Kheopswap Directory

This package generates static JSON files containing token and pool data for all supported Asset Hub chains. The web application fetches this data instead of querying chains directly, providing faster startup times.

## Data Structure

Generated data is stored in `data/v1/{chainId}.json` for each supported chain:
- `pah.json` - Polkadot Asset Hub
- `kah.json` - Kusama Asset Hub  
- `wah.json` - Westend Asset Hub
- `pasah.json` - Paseo Asset Hub

Each JSON file contains:
```json
{
  "chainId": "pah",
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "tokens": [...],
  "pools": [...]
}
```

## Token Logos

Token logos are stored in the `logos/` folder and are referenced by URL in the token metadata. When adding a new logo:

1. Add the image file to `logos/` (PNG or SVG recommended)
2. Use a descriptive filename (e.g., `dot.svg`, `usdc.svg`)
3. Reference it in `src/known/tokens.json` as `"logo": "dot.svg"`

Logos are served from: `https://raw.githubusercontent.com/kheopswap/kheopswap/main/directory/logos/{filename}`

## Registering a New Token

To add a known token with verified metadata:

1. Edit `src/known/tokens.json`
2. Add your token entry with full metadata:

```json
{
  "id": "pah::asset::1984",  // Format: {chainId}::{type}::{onChainId}
  "type": "asset",
  "chainId": "pah",
  "onChainId": "1984",
  "symbol": "USDT",
  "name": "Tether USD",
  "decimals": 6,
  "logo": "usdt.svg",        // Optional - file in logos/ folder
  "verified": true
}
```

Token ID format:
- Native tokens: `{chainId}::native`
- Assets: `{chainId}::asset::{assetId}`
- Pool assets: `{chainId}::pool-asset::{assetId}`
- Foreign assets: `{chainId}::foreign-asset::{locationHash}`

## Overriding Token Metadata

To override metadata for tokens that exist on-chain but need corrections (e.g., Snowbridge tokens with incorrect symbols):

1. Edit `src/known/overrides.json`
2. Add a partial override entry:

```json
{
  "pah::foreign-asset::0x01010100591f": {
    "symbol": "ETH",
    "name": "Ethereum",
    "logo": "eth.svg"
  }
}
```

Only include the fields you want to override.

## Running Locally

```bash
# Install dependencies (from monorepo root)
pnpm install

# Generate directory data
pnpm --filter @kheopswap/directory generate
```

## Automated Updates

A GitHub Action runs every 2 hours to regenerate the directory data and commit any changes. The workflow:

1. Fetches current token and pool data from all chains
2. Merges with known tokens and overrides
3. Writes to `data/v1/{chainId}.json`
4. Commits changes with `[skip ci]` to avoid triggering Cloudflare rebuilds

## Architecture

The directory data generation process:

1. **fetchTokens.ts** - Fetches all token types from chain:
   - Native tokens (DOT, KSM, etc.)
   - Assets (from Assets pallet)
   - Pool assets (from PoolAssets pallet)
   - Foreign assets (from ForeignAssets pallet)
   
2. **fetchPools.ts** - Fetches all AssetConversion pools

3. **known/** - Contains verified token metadata and overrides that get merged with on-chain data

4. **generate.ts** - Orchestrates data generation for all chains

The web app then:
1. Loads cached data from localStorage (instant)
2. Fetches fresh data from GitHub in background
3. Updates UI when new data arrives (stale-while-revalidate pattern)
