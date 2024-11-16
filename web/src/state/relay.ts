import {
	type Chain,
	type ChainAssetHub,
	type ChainRelay,
	PARA_ID_ASSET_HUB,
	getChains,
} from "@kheopswap/registry";
import { getTokenById$ } from "@kheopswap/services/tokens";
import { bind } from "@react-rxjs/core";
import { isEqual } from "lodash";
import {
	distinctUntilChanged,
	distinctUntilKeyChanged,
	map,
	switchMap,
} from "rxjs";
import { relayId$ } from "src/state/location";

export const [useRelayChains, relayChains$] = bind(
	relayId$.pipe(
		map((relayId) => {
			const chains = getChains();

			const relay = chains.find(
				(c) => c.id === relayId && c.relay === relayId,
			) as ChainRelay | undefined;
			if (!relay) throw new Error("Relay not found");

			const allChains = chains.filter((c) => c.relay === relayId) as Chain[];

			const assetHub = allChains.find(
				(c) => c.paraId === PARA_ID_ASSET_HUB && c.relay === relayId,
			) as ChainAssetHub | undefined;
			if (!assetHub) throw new Error("Relay not found");

			return { relayId, relay, assetHub, allChains };
		}),
		switchMap(({ relayId, relay, assetHub, allChains }) => {
			if (!assetHub.stableTokenId) throw new Error("Stable token not found");
			return getTokenById$(assetHub.stableTokenId).pipe(
				distinctUntilKeyChanged("token", isEqual),
				map(({ token: stableToken }) => {
					if (!stableToken)
						throw new Error(
							`Stable token not found: ${assetHub.stableTokenId}`,
						);
					return {
						relayId,
						relay,
						assetHub,
						allChains,
						stableToken, //always defined by config
					};
				}),
			);
		}),
	),
);

export const [useAssetHub, assetHub$] = bind(
	relayChains$.pipe(
		map(({ assetHub }) => assetHub),
		distinctUntilChanged(),
	),
);

export const [useStableToken, stableToken$] = bind(
	relayChains$.pipe(
		map(({ stableToken }) => stableToken),
		distinctUntilChanged(),
	),
);
