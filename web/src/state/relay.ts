import { STABLE_ASSET_ID } from "@kheopswap/constants";
import {
	type Chain,
	type ChainAssetHub,
	type ChainRelay,
	PARA_ID_ASSET_HUB,
	getChainById,
	getChains,
	getTokenId,
} from "@kheopswap/registry";
import { getTokenById$ } from "@kheopswap/services/tokens";
import { bind } from "@react-rxjs/core";
import { isEqual } from "lodash";
import {
	distinctUntilChanged,
	distinctUntilKeyChanged,
	map,
	of,
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
			// if (!assetHub.stableTokenId) throw new Error("Stable token not found");
			return getTokenById$(STABLE_ASSET_ID).pipe(
				distinctUntilKeyChanged("token", isEqual),
				switchMap(({ token }) => {
					const tokenChain = token ? getChainById(token?.chainId) : null;
					// biome-ignore lint/style/noNonNullAssertion: <explanation>
					if (tokenChain?.relay === relayId) return of(token!);
					return getTokenById$(
						// use AssetHub's native as stable, for now
						getTokenId({ type: "native", chainId: assetHub.id }),
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
					).pipe(map(({ token }) => token!));
				}),
				map((stableToken) => {
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
