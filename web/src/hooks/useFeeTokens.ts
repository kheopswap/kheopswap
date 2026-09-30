import { isEqual, values } from "lodash-es";
import {
	distinctUntilChanged,
	map,
	Observable,
	of,
	shareReplay,
	switchMap,
} from "rxjs";
import type { ChainId } from "../registry/chains/types";
import type { Token } from "../registry/tokens/types";
import { getTokensByChain$ } from "../services/tokens/service";
import { bindSerialized } from "../utils/bindSerialized";
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

const getFeeTokens$ = (
	chainId: ChainId | null | undefined,
	address: string | null,
) => {
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
