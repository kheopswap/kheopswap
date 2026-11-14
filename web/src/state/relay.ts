import { bind } from "@react-rxjs/core";
import { isEqual } from "lodash-es";
import {
	distinctUntilChanged,
	distinctUntilKeyChanged,
	map,
	switchMap,
} from "rxjs";
import {
	getBridgedAssetHub,
	getChains,
	isChainAssetHub,
} from "../registry/chains/chains";
import { getTokenById$ } from "../services/tokens/service";
import { relayId$ } from "./location";

export const [useRelayChains, relayChains$] = bind(
	relayId$.pipe(
		map((relayId) => {
			const allChains = getChains().filter((c) => c.relay === relayId);

			const assetHub = allChains.find(isChainAssetHub);
			if (!assetHub) throw new Error("Asset hub not found for relay");

			return {
				relayId,
				assetHub,
				bridgedAssetHub: getBridgedAssetHub(assetHub.id),
				allChains,
			};
		}),
		switchMap(({ relayId, assetHub, bridgedAssetHub, allChains }) => {
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
						bridgedAssetHub,
						allChains,
						stableToken,
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
