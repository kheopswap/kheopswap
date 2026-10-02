# AGENTS.md

Kheopswap is a decentralized exchange for the Polkadot Asset Hubs. The app is React + TypeScript in `web/`, with state flowing through RxJS observables. Use pnpm on Node 24 or later.

## Before you finish

Run these from the repo root and fix everything they report:

```bash
pnpm check      # Biome lint + format, auto-fixes
pnpm typecheck
pnpm test
pnpm knip       # unused files, exports, dependencies
```

Check UI changes in a browser on `http://localhost:5173` (`pnpm dev`), the only origin this app is tested from. If Vite moves to another port because 5173 is taken, free 5173.

Update this file and `README.md` when your change makes them wrong.

## Chain access

- Get an API with `getApi(chainId)` from `web/src/papi/getApi.ts`. It picks light client or RPC and caches the connection.
- Read and write through the typed surface: `api.query`, `api.tx`, `api.event`, `api.constants`. Keep `api.client` and `getUnsafeApi()` out of app code. When no typed API covers the need, say so in the PR before adding a lower-level workaround.
- When a runtime call's signature differs between chains, write one explicit case per chain with `switch (api.chainId)`.
- Every supported chain is an Asset Hub: `pah`, `kah`, `wah`, `pasah`.

## Reactive state

Services expose observables suffixed with `$`. Wrap shared streams in `getCachedObservable$` so subscribers share one source.

Observables reach React through `@react-rxjs/core` only:

- Singleton derived streams use `bind()`: `export const [useAssetHubChains, assetHubChains$] = bind(relayId$.pipe(...))`.
- Streams built from hook arguments (token ids, chain ids) use `bindSerialized(getObservable, getDefaultValue)` from `web/src/utils/bindSerialized.ts`, declared at module level. It caches by serialized args and evicts unused entries, and the default value keeps the hook from suspending. Avoid `bind()` factories for open-ended args: their cache never evicts.

Async values are `{ isLoading, data }`. Render both states.

Feature state lives in a provider hook exposed through `provideContext`: `export const [SwapProvider, useSwap] = provideContext(useSwapProvider)`.

## Tokens

Token ids encode type, chain and on-chain id, as in `asset::pah::1984`. Build and parse them with `getTokenId` and `parseTokenId`. Types are `native`, `asset`, `pool-asset` and `foreign-asset`.

The `tokens.<network>.json` snapshots are generated. Before touching token data, read the token registry section of `README.md`.

## Naming

Name Ethereum-style addresses and helpers `ethereum` (`isEthereumAddress`, `ethereumAddress`). Asset Hub accepts Ethereum addresses but is not an EVM runtime, so `evm` appears only where a third-party API imposes it.
