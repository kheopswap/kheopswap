# Kheopswap AI Coding Guidelines

## Project Overview

Kheopswap is a decentralized exchange for the Polkadot Asset Hub, built as a pnpm monorepo with React/TypeScript frontend and reactive state management via RxJS.

## Architecture

### Monorepo Structure

```
packages/
├── constants/     # Environment flags, config (USE_CHOPSTICKS, APP_FEE_*)
├── papi/          # Polkadot API wrapper using polkadot-api library
├── registry/      # Chain definitions, token types, PAPI descriptors
├── services/      # Reactive data services (balances, tokens, pools)
├── settings/      # User preference management
├── utils/         # Shared utilities (provideContext, getCachedObservable$)
web/               # Vite + React frontend application
```

### Key Patterns

**Reactive Data Flow** - Services use RxJS Observables with subscription-based caching:

```typescript
// Pattern: getCachedObservable$ prevents duplicate subscriptions
export const getBalance$ = (def: BalanceDef) =>
  getCachedObservable$("getBalance$", balanceId, () => new Observable(...));
```

**Context Providers** - Use `provideContext` utility from `@kheopswap/utils` for feature state:

```typescript
// Creates [Provider, useHook] tuple from a hook
export const [SwapProvider, useSwap] = provideContext(useSwapProvider);
```

**React-RxJS Bindings** - Global state uses `@react-rxjs/core` `bind()`:

```typescript
export const [useAssetHubChains, assetHubChains$] = bind(relayId$.pipe(...));
```

**Chain Types** - All supported chains are Asset Hubs (pah, kah, wah, pasah):

```typescript
type ChainId = ChainIdAssetHub; // "pah" | "kah" | "wah" | "pasah"
isChainIdAssetHub(id);          // Type guard for ChainIdAssetHub
```

### API Access

Always use `getApi()` from `@kheopswap/papi` - it handles light client vs RPC selection and caching:

```typescript
const api = await getApi(chainId); // waitReady=true by default
```

## Development Commands

```bash
pnpm install                 # Install dependencies (uses corepack)
pnpm dev                     # Dev with production RPCs
pnpm dev:chopsticks          # Dev with local Chopsticks sandbox (orange header)
pnpm chopsticks              # Launch local chain forks (separate terminal)
pnpm check                   # Biome lint + format (auto-fix)
pnpm papi:update             # Update PAPI chain metadata
pnpm typecheck               # TypeScript check (web package)
```

## Code Conventions

- **Linting**: Biome handles formatting and linting. Pre-commit hook via simple-git-hooks runs `biome check --write`
- **Imports**: Use `@kheopswap/*` workspace aliases. Web uses `src/` alias for absolute imports
- **File naming**: Features in `web/src/features/`, hooks in `web/src/hooks/`, providers end with `Provider.ts(x)`
- **Observable naming**: Suffix with `$` (e.g., `assetHubChains$`, `getBalance$`)
- **State loading**: Always handle `isLoading` + `data` pattern for async states

## Token & Chain Types

Token IDs encode chain + type: `"pah::asset::1984"` (Polkadot Asset Hub, asset type, id 1984)

```typescript
// Parse/create token IDs
const tokenId = getTokenId({ chainId, type, onChainId });
const { chainId, type, onChainId } = parseTokenId(tokenId);
```

Chain configurations differ for prod vs Chopsticks - see `chains.prod.json` / `chains.chopsticks.json`.

## Feature Development

Features follow structure: `features/{name}/` with Provider, Form, components

- Entry point typically exports from `index.ts`
- Providers manage form state + derived calculations
- Use existing hooks from `web/src/hooks/` (useBalance, useToken, usePoolReserves, etc.)

## Testing Environment

Chopsticks provides a sandboxed Asset Hub at `ws://localhost:3421`.

`USE_CHOPSTICKS` constant toggles chain config and disables light clients.

## Before Completing Any Task

Always run these commands to validate changes:

```bash
pnpm check      # Lint and format with Biome (auto-fixes issues)
pnpm typecheck  # Verify TypeScript types compile correctly
```

Fix any errors before considering the task complete.

## Browser Testing with DevTools

When testing the app after making changes:

1. **Start the dev server** if not already running: `pnpm dev`
2. **Open the app** at http://localhost:5173/
3. **Disable light clients for faster testing** (unless testing light client features):
   - Click the chain selector in the header (shows "Polkadot" or network name)
   - Uncheck "Connect via light clients" toggle
   - Page will reload with RPC connections instead (much faster)
4. **Use browser DevTools** to verify the app works:
   - Check the Console for errors (filter out expected debug/info messages)
   - Navigate to key pages: Swap, Transfer, Tokens, Liquidity Pools
   - Verify no React errors like "Maximum update depth exceeded"
5. **After code changes**: If the page shows an error overlay, click **Reset** or do a hard reload (Cmd+Shift+R) to see the updated code
6. **Light client sync**: When enabled, smoldot light clients take 10-30 seconds to sync. A "Synchronizing light clients" toast is expected on initial load.
