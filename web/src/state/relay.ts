import { type ChainAssetHub, getChains } from "@kheopswap/registry";
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
	filter,
	map,
	switchMap,
	tap,
} from "rxjs";
import { relayId$ } from "src/state/location";

export const [useRelayChains, relayChains$] = bind(
	relayId$.pipe(
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
			if (!assetHub.stableTokenId) throw new Error("Stable token not found");
			return getTokenById$(assetHub.stableTokenId).pipe(
				// Wait for the token to be loaded before emitting
				map(({ token: stableToken }) => ({
					relayId,
					assetHub,
					allChains,
					stableToken,
				})),
				// Only emit when stableToken is defined (loaded from directory)
				filter(
					(
						data,
					): data is {
						relayId: typeof relayId;
						assetHub: typeof assetHub;
						allChains: typeof allChains;
						stableToken: NonNullable<typeof data.stableToken>;
					} => data.stableToken !== undefined,
				),
				distinctUntilKeyChanged("stableToken", isEqual),
			);
		}),
	),
);

export const [, assetHub$] = bind(
	relayChains$.pipe(
		map(({ assetHub }) => assetHub),
		distinctUntilChanged(),
	),
);

export const [, stableToken$] = bind(
	relayChains$.pipe(
		map(({ stableToken }) => stableToken),
		distinctUntilChanged(),
	),
);
