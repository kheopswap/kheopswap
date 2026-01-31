import { type ChainAssetHub, getChains, type Token } from "@kheopswap/registry";
import {
	ensureDirectoryPools,
	ensureDirectoryTokens,
} from "@kheopswap/services/directory";
import { getTokenById$ } from "@kheopswap/services/tokens";
import { bind } from "@react-rxjs/core";
import { isEqual } from "lodash-es";
import {
	distinctUntilChanged,
	distinctUntilKeyChanged,
	map,
	of,
	shareReplay,
	switchMap,
	tap,
} from "rxjs";
import { relayId$ } from "src/state/location";

export const relayChains$ = relayId$.pipe(
	map((relayId) => {
		const chains = getChains();

		const assetHub = chains.find((c) => c.relay === relayId) as
			| ChainAssetHub
			| undefined;
		if (!assetHub) throw new Error("Asset hub not found for relay");

		return { relayId, assetHub, allChains: [assetHub] };
	}),
	// Trigger directory loading for the current chain
	tap(({ allChains }) => {
		const chainIds = allChains.map((c) => c.id);
		ensureDirectoryTokens(chainIds);
		ensureDirectoryPools(chainIds);
	}),
	switchMap(({ relayId, assetHub, allChains }) => {
		// If no stable token configured, emit immediately without one
		if (!assetHub.stableTokenId) {
			return of({
				relayId,
				assetHub,
				allChains,
				stableToken: undefined as Token | undefined,
			});
		}
		// Subscribe to token updates, emit even when undefined (loading)
		return getTokenById$(assetHub.stableTokenId).pipe(
			map(({ token: stableToken }) => ({
				relayId,
				assetHub,
				allChains,
				stableToken,
			})),
			distinctUntilKeyChanged("stableToken", isEqual),
		);
	}),
	shareReplay({ bufferSize: 1, refCount: true }),
);

const DEFAULT_RELAY_CHAINS = {
	relayId: "polkadot" as const,
	assetHub: getChains().find((c) => c.relay === "polkadot") as ChainAssetHub,
	allChains: [getChains().find((c) => c.relay === "polkadot") as ChainAssetHub],
	stableToken: undefined as Token | undefined,
};

export const [useRelayChains] = bind(relayChains$, DEFAULT_RELAY_CHAINS);

export const assetHub$ = relayChains$.pipe(
	map(({ assetHub }) => assetHub),
	distinctUntilChanged(),
	shareReplay({ bufferSize: 1, refCount: true }),
);

export const stableToken$ = relayChains$.pipe(
	map(({ stableToken }) => stableToken),
	distinctUntilChanged(),
	shareReplay({ bufferSize: 1, refCount: true }),
);
