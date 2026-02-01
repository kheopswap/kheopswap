# Kheopswap Architecture

This document describes the architecture and patterns used in the Kheopswap codebase.

## Package Structure

```
packages/
├── constants/      # Environment flags and configuration
├── papi/           # Polkadot API wrapper (light client support)
├── react-utils/    # React-specific utilities (provideContext)
├── registry/       # Chain definitions, token types, PAPI descriptors
├── services/       # Reactive data services (RxJS observables)
├── settings/       # User preference management
└── utils/          # Framework-agnostic utilities

web/                # React frontend application
directory/          # Static data generation (CI only, not a runtime dependency)
```

## Directory vs Registry: Data Flow Architecture

The codebase separates **type definitions** (registry) from **data generation** (directory) to allow CI-driven data updates without triggering Cloudflare rebuilds.

### Package Responsibilities

| Package | Purpose | Build Dependency | Runtime Import |
|---------|---------|------------------|----------------|
| **registry** | TypeScript types, utilities, native tokens, PAPI descriptors | ✅ Yes | ✅ Yes |
| **directory** | CI data generation scripts, generated JSON files | ❌ No | ❌ No (fetched from GitHub) |
| **services** | Runtime data fetching, caching, observables | ✅ Yes | ✅ Yes |

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BUILD TIME (directory/)                             │
│   CI runs every 2 hours - generates JSON files, commits to repo             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌───────────────────┐     ┌─────────────────────┐    │
│  │ Chain RPCs   │ ──▶ │ fetchTokens.ts    │ ──▶ │ data/v1/{chain}.json│    │
│  │ (live data)  │     │ fetchPools.ts     │     │ (committed to repo) │    │
│  └──────────────┘     └───────────────────┘     └─────────────────────┘    │
│         │                     ▲                                             │
│         │             ┌───────┴───────┐                                    │
│         │             │ known/        │                                    │
│         │             │ tokens.json   │ (curated logos, names, verified)   │
│         │             └───────────────┘                                    │
│         ▼                                                                   │
│  ┌──────────────┐                                                          │
│  │ Talisman     │ (logos, metadata enrichment - NOT used at runtime)       │
│  │ Chaindata    │                                                          │
│  └──────────────┘                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        RUNTIME (packages/services/)                         │
│   Frontend loads data with tiered strategy + on-chain polling               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. STARTUP: Load from localStorage (instant)                              │
│       │                                                                     │
│       ▼                                                                     │
│  2. DIRECTORY: Fetch JSON from GitHub CDN (override localStorage)          │
│       │                                                                     │
│       ▼                                                                     │
│  3. ON-CHAIN POLLING: Fetch new data directly from chain                   │
│       • Tokens: every 15 minutes (merge new tokens only)                   │
│       • Pools: every 5 minutes (merge new pools, update existing)          │
│       • On-demand: when pool references unknown token                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    Merge Rules                                   │       │
│  │  • New tokens from chain: verified=false, no logo               │       │
│  │  • Existing tokens: chain wins for decimals/isSufficient,       │       │
│  │    directory wins for name/symbol/logo/verified                 │       │
│  │  • Pools: on-chain data wins                                    │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Separation?

1. **No Cloudflare rebuilds** - Directory JSON updates via CI don't change any build dependencies
2. **Fast startup** - localStorage provides instant data, directory fetch happens in background
3. **Self-healing** - On-chain polling discovers new tokens/pools without waiting for CI
4. **Curated quality** - Directory provides logos, verified status, better names from Talisman
5. **Always fresh** - Polling ensures recent chain changes appear within minutes

## Dependency Graph

```
                    ┌─────────────────────────────────────────────────┐
                    │                      WEB                         │
                    │  features / hooks / state / components          │
                    └─────────────────┬───────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
   ┌─────────────┐           ┌─────────────┐            ┌─────────────┐
   │ react-utils │           │  services   │            │  settings   │
   │(provideCtx) │           │ (RxJS data) │            │(user prefs) │
   └─────────────┘           └──────┬──────┘            └──────┬──────┘
                                    │                          │
                    ┌───────────────┼───────────────┐          │
                    │               │               │          │
                    ▼               ▼               ▼          │
             ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
             │    papi     │ │  registry   │ │  constants  │◄──┘
             │ (API client)│ │(chain defs) │ │  (config)   │
             └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                             ┌──────▼──────┐
                             │    utils    │
                             │(pure utils) │
                             └─────────────┘
```

## State Management Patterns

### 1. Global State with `bind()` (from `@react-rxjs/core`)

Use for app-wide state that's shared across many components:

```typescript
// In packages/services or web/src/state
export const relayChains$ = relayId$.pipe(
  switchMap(/* ... */),
  shareReplay({ bufferSize: 1, refCount: true }),
);

// Bind creates a React hook from an Observable
export const [useRelayChains] = bind(relayChains$, DEFAULT_VALUE);
```

**Characteristics:**
- Singleton state (one instance for the entire app)
- Survives component unmounts
- Data persists in memory

**Examples:** `useRelayChains`, `useAssetHubChains`, location state

### 2. Feature State with `provideContext()` (from `@kheopswap/react-utils`)

Use for feature-scoped state isolated to a component subtree:

```typescript
// In features/{name}/Provider.ts
const useSwapProvider = () => {
  const [formData, setFormData] = useState(/* ... */);
  const { data: tokens } = useTokens();
  
  return { formData, setFormData, tokens };
};

export const [SwapProvider, useSwap] = provideContext(useSwapProvider);
```

**Characteristics:**
- Scoped to provider boundary
- Re-created when provider unmounts
- Good for form state, transaction state

**Examples:** `SwapProvider`, `TransferProvider`, `TransactionProvider`

### 3. Cached Observables with `getCachedObservable$()`

Use for data streams that should be shared and cached:

```typescript
export const getBalance$ = (def: BalanceDef) => {
  const balanceId = getBalanceId(def);
  
  return getCachedObservable$("getBalance$", balanceId, () => {
    return new Observable<BalanceState>((subscriber) => {
      // Subscribe to chain data...
    }).pipe(shareReplay({ refCount: true, bufferSize: 1 }));
  });
};
```

**Characteristics:**
- Prevents duplicate subscriptions
- Keyed by namespace + id
- Memory persists until page reload

## Feature Structure

Features follow a consistent pattern:

```
features/{name}/
├── index.ts                    # Public exports
├── {Name}.tsx                  # Main component
├── {Name}Form.tsx              # Form UI
├── {Name}Provider.ts           # State management hook
├── {Name}TransactionProvider.ts # Transaction state
├── use{Name}Extrinsic.ts       # Transaction builder
└── schema.ts                   # Form validation schema
```

### SwapProvider Decomposition

Large providers should be split into focused hooks:

```typescript
// useSwapFormData.ts - Form state with URL persistence
export const useSwapFormData = () => { /* ... */ };

// useSwapTokens.ts - Available tokens filtering
export const useSwapTokens = () => { /* ... */ };

// useSwapInputs.ts - Input amount calculations
export const useSwapInputs = (props) => { /* ... */ };

// useSwapComputation.ts - AMM output calculations
export const useSwapComputation = (props) => { /* ... */ };

// SwapProvider.ts - Composition
const useSwapProvider = () => {
  const [formData, setFormData] = useSwapFormData();
  const { tokens } = useSwapTokens();
  const inputs = useSwapInputs({ tokenIdIn, amountIn });
  const outputs = useSwapComputation({ /* ... */ });
  
  return { formData, tokens, ...inputs, ...outputs };
};
```

## Observable Naming Conventions

- Suffix observables with `$`: `balance$`, `getBalance$`
- Use `get{Name}$` for factory functions
- Use `{name}$` for singleton streams

## Token & Chain Types

Token IDs encode chain + type + on-chain ID:

```typescript
// Format: "{chainId}::{type}::{onChainId}"
const tokenId = "pah::asset::1984";  // USDT on Polkadot Asset Hub

// Parse/create
const { chainId, type, onChainId } = parseTokenId(tokenId);
const tokenId = getTokenId({ chainId, type, onChainId });
```

Chain IDs are short identifiers:
- `pah` - Polkadot Asset Hub
- `kah` - Kusama Asset Hub
- `wah` - Westend Asset Hub
- `pasah` - Paseo Asset Hub

## Testing Strategy

Tests live alongside source files:

```
src/
├── plancks.ts
├── plancks.test.ts       # Unit tests
├── formatDecimals.ts
└── formatDecimals.test.ts
```

Run tests:
```bash
pnpm test              # Run all tests
pnpm -r test           # Run tests in all packages
```

## Development Workflow

```bash
pnpm install           # Install dependencies
pnpm dev               # Start dev server (production RPCs)
pnpm dev:chopsticks    # Start with local chain fork

pnpm check             # Biome lint + format (auto-fix)
pnpm typecheck         # TypeScript validation
pnpm test              # Run tests
```

## Adding a New Feature

1. Create feature folder: `web/src/features/{name}/`
2. Create provider hook using `provideContext`
3. Add route in `web/src/routes/`
4. Export from feature's `index.ts`

## Adding a New Package

1. Create folder in `packages/`
2. Add `package.json` with `@kheopswap/` scope
3. Add to consuming packages' dependencies
4. Run `pnpm install`
