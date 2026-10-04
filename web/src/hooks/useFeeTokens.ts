import { isEqual, values } from "lodash-es";
import {
	distinctUntilChanged,
	filter,
	map,
	Observable,
	of,
	shareReplay,
	switchMap,
} from "rxjs";
import { isChainIdHydration } from "../registry/chains/chains";
import type { ChainId, ChainIdHydration } from "../registry/chains/types";
import type { Token } from "../registry/tokens/types";
import { getTokenById$, getTokensByChain$ } from "../services/tokens/service";
import { getHydrationFeeCurrencyTokenId$ } from "../state/hydrationFees";
import { bindSerialized } from "../utils/bindSerialized";
import { isEthereumAddress } from "../utils/ethereumAddress";
import { getCachedObservable$ } from "../utils/getCachedObservable";

type UseFeeTokensProps = {
	chainId: ChainId | null | undefined;
	address: string | null;
};

type UseFeeTokensResult = {
	isLoading: boolean;
	data: Token[] | undefined;
};

const useFeeTokensByChainAndAddress = bindSerialized(
	(chainId: ChainId | null, address: string | null) =>
		getFeeTokens$(chainId, address).pipe(
			map((tokens): UseFeeTokensResult => ({ isLoading: false, data: tokens })),
		),
	(): UseFeeTokensResult => ({ isLoading: true, data: undefined }),
);

export const useFeeTokens = ({
	chainId,
	address,
}: UseFeeTokensProps): UseFeeTokensResult =>
	useFeeTokensByChainAndAddress(chainId ?? null, address);

const getHydrationFeeTokens$ = (
	chainId: ChainIdHydration,
	address: string,
): Observable<Token[]> =>
	isEthereumAddress(address)
		? of([])
		: getHydrationFeeCurrencyTokenId$(chainId, address).pipe(
				switchMap(getTokenById$),
				map(({ token }) => token),
				filter((token): token is Token => !!token),
				map((token) => [token]),
			);

const getFeeTokens$ = (
	chainId: ChainId | null | undefined,
	address: string | null,
) => {
	if (isChainIdHydration(chainId) && address)
		return getCachedObservable$(
			"getHydrationFeeTokens$",
			`::${chainId}::${address}`,
			() =>
				getHydrationFeeTokens$(chainId, address).pipe(
					shareReplay({ refCount: true, bufferSize: 1 }),
				),
		);

	return getCachedObservable$("getFeeToken$", `::${chainId}::${address}`, () =>
		new Observable<Token[]>((subscriber) => {
			if (!chainId || !address) {
				subscriber.next([]);
				subscriber.complete();
				return () => {};
			}

			const sub = getTokensByChain$(chainId)
				.pipe(
					map((tokensByChainState) => tokensByChainState.tokens ?? {}),
					distinctUntilChanged<Record<string, Token>>(isEqual),
					switchMap((tokens) => {
						return of(values(tokens).filter((token) => token.isSufficient));
					}),
					distinctUntilChanged<Token[]>(isEqual),
					shareReplay({ refCount: true, bufferSize: 1 }),
				)
				.subscribe(subscriber);

			return () => {
				sub.unsubscribe();
			};
		}).pipe(shareReplay({ refCount: true, bufferSize: 1 })),
	);
};
