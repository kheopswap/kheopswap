import { keyBy, values } from "lodash-es";
import { map, shareReplay, switchMap } from "rxjs";
import type { TokenType } from "../registry/tokens/types";
import { getTokensByChains$ } from "../services/tokens/service";
import type { ChainTokensState } from "../services/tokens/state";
import { getCachedObservable$ } from "../utils/getCachedObservable";
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
