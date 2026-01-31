import type { TokenType } from "@kheopswap/registry";
import {
	type ChainTokensState,
	getTokensByChains$,
} from "@kheopswap/services/tokens";
import { getCachedObservable$ } from "@kheopswap/utils";
import { keyBy, values } from "lodash-es";
import { map, shareReplay, switchMap } from "rxjs";
import { relayChains$ } from "./relay";

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
					const allStates = values(dicChainsTokenState).filter(
						(v): v is ChainTokensState => !!v,
					);
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
