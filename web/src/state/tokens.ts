import { keyBy } from "es-toolkit";
import { map, shareReplay, switchMap } from "rxjs";
import type { ChainAssetHub } from "../registry/chains/types";
import {
	KNOWN_TOKENS_MAP,
	TOKENS_OVERRIDES_MAP,
} from "../registry/tokens/tokens";
import type { TokenType } from "../registry/tokens/types";
import { getTokensByChains$ } from "../services/tokens/service";
import type { ChainTokensState } from "../services/tokens/state";
import { getAssetHubMirrorTokenIds } from "../utils/getAssetHubMirrorTokenId";
import { getCachedObservable$ } from "../utils/getCachedObservable";
import { relayChains$ } from "./relay";

const getKnownTokensOfChain = (chain: ChainAssetHub | undefined) =>
	keyBy(
		Object.values(KNOWN_TOKENS_MAP)
			.filter((token) => token.chainId === chain?.id)
			.map((token) => Object.assign({}, token, TOKENS_OVERRIDES_MAP[token.id])),
		(item) => item.id,
	);

export const viewTokens$ = relayChains$.pipe(
	switchMap(({ assetHub, bridgedAssetHub, allChains }) => {
		const bridgedHubTokens = getKnownTokensOfChain(bridgedAssetHub);
		const remoteChains = bridgedAssetHub
			? [...allChains, bridgedAssetHub]
			: allChains;

		return getTokensByChains$(allChains.map((chain) => chain.id)).pipe(
			map((dicChainsTokenState) => {
				const allStates = Object.values(dicChainsTokenState).filter(
					(v): v is ChainTokensState => !!v,
				);
				const relayTokens = keyBy(
					allStates.flatMap((state) => Object.values(state.tokens)),
					(item) => item.id,
				);
				const mirrorTokenIds = getAssetHubMirrorTokenIds(
					{ ...bridgedHubTokens, ...relayTokens },
					assetHub,
					remoteChains,
				);
				return {
					isLoading: allStates.some((state) => state.status !== "loaded"),
					tokens: {
						...relayTokens,
						...Object.fromEntries(
							Object.entries(bridgedHubTokens).filter(([, token]) =>
								mirrorTokenIds.has(token.id),
							),
						),
					},
					mirrorTokenIds,
				};
			}),
		);
	}),
	shareReplay({ bufferSize: 1, refCount: true }),
);

export const getAllTokens$ = (types?: TokenType[]) => {
	return getCachedObservable$(
		"getAllTokens$",
		types?.sort().join(",") ?? "all",
		() =>
			viewTokens$.pipe(
				map(({ isLoading, tokens }) => ({
					isLoading,
					data: types
						? Object.fromEntries(
								Object.entries(tokens).filter(([, token]) =>
									types.includes(token.type),
								),
							)
						: tokens,
				})),
				shareReplay({ bufferSize: 1, refCount: true }),
			),
	);
};
