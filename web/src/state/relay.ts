import { type ChainAssetHub, getChains } from "@kheopswap/registry";
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

			const assetHub = chains.find((c) => c.relay === relayId) as
				| ChainAssetHub
				| undefined;
			if (!assetHub) throw new Error("Asset hub not found for relay");

			return { relayId, assetHub, allChains: [assetHub] };
		}),
		switchMap(({ relayId, assetHub, allChains }) => {
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
						assetHub,
						allChains,
						stableToken, //always defined by config
					};
				}),
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
