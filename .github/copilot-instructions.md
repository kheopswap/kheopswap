# Kheopswap AI Coding Guidelines

## Project Overview

Kheopswap is a decentralized exchange for the Polkadot Asset Hub, built with React/TypeScript and reactive state management via RxJS. The project uses pnpm with a single `web/` workspace package.

## Architecture

### Project Structure

```
web/src/
├── common/        # Constants (APP_FEE_*), settings, environment flags
├── components/    # Shared UI components
├── features/      # Feature modules (swap, transfer, liquidity, portfolio, transaction)
├── hooks/         # React hooks (useBalance, useToken, usePoolReserves, etc.)
├── papi/          # Polkadot API wrapper (getApi, light client management)
├── registry/      # Chain definitions, token types, PAPI descriptors
├── routes/        # Route definitions
├── services/      # Reactive data services (balances, tokens, pools)
├── state/         # Global state (relay, pools, prices, tokens, transactions)
├── types/         # Shared TypeScript types
└── utils/         # All utility & helper functions (single namespace)
```

### Key Patterns

**Reactive Data Flow** - Services use RxJS Observables with subscription-based caching:

```typescript
// Pattern: getCachedObservable$ prevents duplicate subscriptions
export const getBalance$ = (def: BalanceDef) =>
  getCachedObservable$("getBalance$", balanceId, () => new Observable(...));
```

**Context Providers** - Use `provideContext` utility from `utils/provideContext` for feature state:

```typescript
// Creates [Provider, useHook] tuple from a hook
export const [SwapProvider, useSwap] = provideContext(useSwapProvider);
```

**Reactive Convention — `bind()` vs `useObservable()`**

Two reactive bridges coexist with clear, distinct roles:

- **`bind()` (`@react-rxjs/core`)** — Use for **global/singleton derived state** where the observable is static and shared across the entire app. Returns a `[useHook, observable$]` tuple that auto-subscribes via the root `<Subscribe>` boundary. Used in `state/`, `hooks/useSetting`, `hooks/useLoadingStatusSummary`, and layout components.

  ```typescript
  // Good: static derived observable, used globally
  export const [useAssetHubChains, assetHubChains$] = bind(relayId$.pipe(...));
  ```

- **`useObservable()` (`react-rx`)** — Use for **parameterized/dynamic subscriptions** where the observable is constructed per-call from hook arguments (e.g., token IDs, chain IDs). This is the dominant pattern in `hooks/`.

  ```typescript
  // Good: observable depends on parameters passed to the hook
  import { useObservable } from "react-rx";
  const token = useObservable(token$(tokenId), defaultValue);
  ```

**Rule of thumb:** If the observable takes parameters → `useObservable()`. If it's a singleton derived stream → `bind()`.

**Chain Types** - All supported chains are Asset Hubs (pah, kah, wah, pasah):

```typescript
type ChainId = ChainIdAssetHub; // "pah" | "kah" | "wah" | "pasah"
isChainIdAssetHub(id);          // Type guard for ChainIdAssetHub
```

### API Access

Always use `getApi()` from `papi/getApi` - it handles light client vs RPC selection and caching:

```typescript
const api = await getApi(chainId); // waitReady=true by default
```

- **Do not use PAPI Unsafe API**: Never use `api.client.getUnsafeApi()` in app code.
- **Avoid direct PAPI client usage**: Do not use `api.client` directly when a typed API query/tx/constant is available.
- **Prefer typed API surface**: Use `api.query.*`, `api.tx.*`, `api.event.*`, and `api.constants.*` first.
- **If no typed API exists**: Call this out explicitly in PR/task notes before introducing any low-level workaround.

## Development Commands

Requires Node.js >= 24.

```bash
pnpm install                 # Install dependencies (runs papi codegen via postinstall)
pnpm dev                     # Dev with production RPCs
pnpm check                   # Biome lint + format (auto-fix)
pnpm typecheck               # TypeScript check (web package)
pnpm knip                    # Check for unused dependencies/files/exports
```

## Code Conventions

- **Linting**: Biome handles formatting and linting. Pre-commit hook via simple-git-hooks runs `biome check --staged --error-on-warnings --no-errors-on-unmatched`
- **Imports**: Use relative paths for all imports (no path aliases are configured)
- **File naming**: Features in `web/src/features/`, hooks in `web/src/hooks/`, providers end with `Provider.ts(x)`
- **Observable naming**: Suffix with `$` (e.g., `assetHubChains$`, `getBalance$`)
- **State loading**: Always handle `isLoading` + `data` pattern for async states
- **Address terminology**: Prefer `ethereum` over `evm` in new variable, function, type, and file names (e.g., `isEthereumAddress`, `ethereumAddress`). Polkadot Asset Hub supports Ethereum-style addresses, but this is not an EVM runtime; avoid introducing new `evm` identifiers unless required by third-party APIs.

## Token & Chain Types

Token IDs encode type + chain: `"asset::pah::1984"` (asset type, Polkadot Asset Hub, id 1984)

```typescript
// Parse/create token IDs
const tokenId = getTokenId({ type: "asset", chainId: "pah", assetId: 1984 });
const parsed = parseTokenId(tokenId);
// parsed: { type: "asset", chainId: "pah", assetId: 1984 }
// Other token types: "native", "pool-asset", "foreign-asset"
```

Chain configurations are in `web/src/registry/chains/chains.prod.json`.

## Feature Development

Features follow structure: `features/{name}/` with Provider, Form, components

- Entry point typically exports from `index.ts`
- Providers manage form state + derived calculations
- Use existing hooks from `web/src/hooks/` (useBalance, useToken, usePoolReserves, etc.)

## AI Agent Expectations

- **DevTools MCP testing**: If a change does not require wallet signature, validate it with DevTools MCP. First verify DevTools MCP is running; if it is not available, ask the user to start it before proceeding with MCP-based validation.
- **DevTools port**: This app can only be tested with DevTools MCP against `http://localhost:5173`. Only this port should ever be used.
- **Code quality bar**: Always produce elegant, pristine, human-maintainable code. Split logic into appropriate sub-components, hooks, and files when it improves clarity, cohesion, and long-term maintainability.
- **Chain-specific runtime APIs**: When runtime call signatures differ by chain, handle them explicitly with `switch (api.chainId)` and keep the logic simple. Do not use speculative multi-attempt fallback loops across different signatures.

## Before Completing Any Task

Always run these commands to validate changes:

```bash
pnpm check      # Lint and format with Biome (auto-fixes issues)
pnpm typecheck  # Verify TypeScript types compile correctly
pnpm knip       # Check for unused dependencies/files/exports
```

Fix any errors, and update documentation (README.md, copilot-instructions.md) if necessary, before considering the task complete.
