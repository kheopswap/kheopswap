import { useMemo } from "react";

import type { ChainId, Token } from "@kheopswap/registry";
import { getTokensByChain$ } from "@kheopswap/services/tokens";
import { type Dictionary, isEqual, values } from "lodash";
import { useObservable } from "react-rx";
import {
	Observable,
	distinctUntilChanged,
	map,
	of,
	shareReplay,
	switchMap,
} from "rxjs";

type UseFeeTokensProps = {
	chainId: ChainId | null | undefined;
	address: string | null;
};

type UseFeeTokensResult = {
	isLoading: boolean;
	data: Token[] | undefined;
};

const CACHE_FEE_TOKENS = new Map<string, Observable<Token[]>>();

const getFeeTokens$ = (
	chainId: ChainId | null | undefined,
	address: string | null,
) => {
	const cacheKey = `${chainId}||${address}`;

	if (!CACHE_FEE_TOKENS.has(cacheKey)) {
		const obs = new Observable<Token[]>((subscriber) => {
			if (!chainId || !address) {
				subscriber.next([]);
				subscriber.complete();
				return () => {};
			}

			const sub = getTokensByChain$(chainId)
				.pipe(
					map((tokensByChainState) => tokensByChainState.tokens ?? {}),
					distinctUntilChanged<Dictionary<Token>>(isEqual),
					switchMap((tokens) => {
						// TODO uncomment the block below when we support converting fee estimate
						// if (isChainIdHydration(chainId)) {
						// 	// for now we dont support changing the fee token for hydration
						// 	// return only the currently set fee token
						// 	const obs = getApi$(chainId).pipe(
						// 		switchMap((api) =>
						// 			api.query.MultiTransactionPayment.AccountCurrencyMap.watchValue(
						// 				address,
						// 				"best",
						// 			),
						// 		),
						// 		map((assetId) =>
						// 			assetId === undefined
						// 				? [tokens[getTokenId({ type: "native", chainId })]]
						// 				: [
						// 						tokens[
						// 							getTokenId({
						// 								type: "hydration-asset",
						// 								chainId,
						// 								assetId,
						// 							})
						// 						],
						// 					],
						// 		),
						// 	);
						// 	return obs;
						// }

						return of(values(tokens).filter((token) => token.isSufficient));
					}),
					distinctUntilChanged<Token[]>(isEqual),
					shareReplay({ refCount: true, bufferSize: 1 }),
				)
				.subscribe(subscriber);

			return () => {
				sub.unsubscribe();
			};
		}).pipe(shareReplay({ refCount: true, bufferSize: 1 }));

		CACHE_FEE_TOKENS.set(cacheKey, obs);
	}

	return CACHE_FEE_TOKENS.get(cacheKey) as Observable<Token[]>;
};

const DEFAULT_VALUES = {
	isLoading: true,
	data: undefined,
};

export const useFeeTokens = ({
	chainId,
	address,
}: UseFeeTokensProps): UseFeeTokensResult => {
	const feeTokens$ = useMemo(
		() =>
			getFeeTokens$(chainId, address).pipe(
				map((tokens) => ({ isLoading: false, data: tokens })),
			),
		[chainId, address],
	);

	return useObservable(feeTokens$, DEFAULT_VALUES);
};
