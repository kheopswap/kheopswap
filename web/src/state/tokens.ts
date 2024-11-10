import { relayChains$ } from "./relay";

import type { TokenType } from "@kheopswap/registry";
import { getTokensByChains$ } from "@kheopswap/services/tokens";
import { getCachedObservable$ } from "@kheopswap/utils";
import { keyBy, values } from "lodash";
import { map, shareReplay, switchMap } from "rxjs";

export const getAllTokens$ = (types?: TokenType[]) => {
	return getCachedObservable$(
		"getAllTokens$",
		types?.sort().join(",") ?? "all",
		() =>
			relayChains$.pipe(
				switchMap(({ allChains }) =>
					getTokensByChains$(allChains.map((chain) => chain.id)),
				),
				map((dicChainsTokenState) => {
					const allStates = values(dicChainsTokenState);
					const isLoading = allStates.some(
						(state) => state.status !== "loaded",
					);
					const arrTokens = allStates
						.flatMap((state) => values(state.tokens))
						.filter((token) => !types || types.includes(token.type));
					const dicTokens = keyBy(arrTokens, "id");
					return { isLoading, data: dicTokens };
				}),
				shareReplay({ bufferSize: 1, refCount: true }),
			),
	);
};
