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

Check UI changes in a browser on `http://localhost:5173` (`pnpm dev`), the only origin this app is tested from. If Vite moves to another port because 5173 is taken, free 5173. The `verify` skill (`.claude/skills/verify/`) scripts this: it runs the app and a Chromium with Talisman in a Docker container per checkout, drives it on Paseo, and records proof.

Update this file and `README.md` when your change makes them wrong.

## Chain access

- Get an API with `getApi(chainId)` from `web/src/papi/getApi.ts`. It picks light client or RPC and caches the connection.
- Read and write through the typed surface: `api.query`, `api.tx`, `api.event`, `api.constants`. Keep `api.client` and `getUnsafeApi()` out of app code. When no typed API covers the need, say so in the PR before adding a lower-level workaround.
- Call a runtime API once on `await getApi(chainId)` when that call typechecks for every chain in the union. When its arguments differ between chains, so the union call does not typecheck, switch on the chain id literal and call `getApi` inside each case, as in `case "hydration": { const api = await getApi("hydration"); ... }`. `switch (api.chainId)` does not narrow `Api<ChainId>`.
- Chain ids come in three kinds: the Asset Hubs `pah`, `kah`, `wah`, `pasah` (`ChainIdAssetHub`), Hydration `hydration` (`ChainIdHydration`) and the People chains `ppeople`, `kpeople`, `wpeople`, `paspeople` (`ChainIdPeople`). `ChainId` is their union. People chains carry only their native token, priced as the Asset Hub native token it mirrors.
- The app shows one relay at a time. `relayChains$` gives its Asset Hub, `allChains` (the chains of that relay) and `bridgedAssetHub`, the Asset Hub of the other relay that `getBridgedAssetHub` pairs with it (`pah` with `kah`), or `undefined`. The view adds two tokens of the bridged hub, its native token and its foreign asset of this relay's token, and prices them through their mirrors on the view's Asset Hub. It never watches the bridged hub's tokens and opens a connection to it only for balances. No swap or transfer route reaches the bridged hub yet.
- To express a location or a chain from another chain's point of view, use `reanchorLocation` and `getChainLocation` in `web/src/registry/utils/chainLocation.ts`.
- Code that uses Asset Hub pallets (Assets, PoolAssets, ForeignAssets, AssetConversion, Revive) takes `ChainIdAssetHub` or `ChainAssetHub`. Narrow the parameter so `getApi` returns the Asset Hub API, and guard with `isChainIdAssetHub` / `isChainAssetHub` where a value can be any chain.
- Hydration has no `ChargeAssetTxPayment`. It charges the transaction fee in the account's currency, `MultiTransactionPayment.AccountCurrencyMap` or HDX, so on Hydration the fee token list holds that one token and `useConvertedFee` prices the fee with `XcmPaymentApi.query_weight_to_asset_fee`. `dry_run_call` never charges the fee, so `TransactionProvider` blocks submit on any failed dry run and on the local balance check on every chain. Only on Asset Hub with a native fee the account can pay does the transaction summary's `Simulation` row read `Success`; otherwise it reads `Succeeds before fees`.
- An Ethereum address maps to different accounts on Asset Hub and on the other chains. `getResolvedSubstrateAddress$` resolves it to no address outside Asset Hub, so its balances on Hydration and the People chains load as `undefined`, and `isApplicableBalance` hides them.

## Runtime upgrades

Chains upgrade their runtime often, and a daily workflow opens a `Runtime upgrade on <chain>` issue for each one. To handle it, run `pnpm papi update <chain>`. It fetches the new metadata into `.papi/scale/<chain>.scale`, records the new `codeHash` in `.papi/polkadot-api.json` and regenerates the descriptors. Commit every changed file under `.papi/`.

Most upgrades need nothing else. If `pnpm typecheck` still passes, the typed API the app uses did not change.

## Reactive state

Services expose observables suffixed with `$`. Wrap shared streams in `getCachedObservable$` so subscribers share one source.

Observables reach React through `@react-rxjs/core` only:

- Singleton derived streams use `bind()`: `export const [useAssetHubChains, assetHubChains$] = bind(relayId$.pipe(...))`.
- Streams built from hook arguments (token ids, chain ids) use `bindSerialized(getObservable, getDefaultValue)` from `web/src/utils/bindSerialized.ts`, declared at module level. It caches by serialized args and evicts unused entries, and the default value keeps the hook from suspending. Avoid `bind()` factories for open-ended args: their cache never evicts.

Async values are `{ isLoading, data }`. Render both states.

Feature state lives in a provider hook exposed through `provideContext`: `export const [SwapProvider, useSwap] = provideContext(useSwapProvider)`.

## Tokens

Token ids encode type, chain and on-chain id, as in `asset::pah::1984`. Build and parse them with `getTokenId` and `parseTokenId`. Types are `native`, `asset`, `pool-asset`, `foreign-asset` and `hydration-asset`. Only `native` exists on every chain. `asset`, `pool-asset` and `foreign-asset` are Asset Hub only, so their `chainId` is a `ChainIdAssetHub`. `hydration-asset` is Hydration only, so its `chainId` is a `ChainIdHydration`. `parseTokenId` rejects each type on chains of the other kind.

The `tokens.<network>.json` snapshots are generated. Before touching token data, read the token registry section of `README.md`.

Token logos live in `web/public/img/tokens`. Their dominant colors are computed at build time by `web/plugins/tokenColors.ts` and imported from `virtual:token-colors`. Restart `pnpm dev` after adding a logo.

## Brand assets

The icons and favicons in `web/public` are generated from `web/public/logo.svg`. Edit `logo.svg`, then run `pnpm generate-brand-assets`.

## Naming

Name Ethereum-style addresses and helpers `ethereum` (`isEthereumAddress`, `ethereumAddress`). Asset Hub accepts Ethereum addresses but is not an EVM runtime, so `evm` appears only where a third-party API imposes it.
