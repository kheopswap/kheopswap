import type { ChainId, Token } from "@kheopswap/registry";
import { getTokensByChain$ } from "@kheopswap/services/tokens";
import { getCachedObservable$ } from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { isEqual, values } from "lodash-es";
import {
	distinctUntilChanged,
	map,
	Observable,
	of,
	shareReplay,
	switchMap,
} from "rxjs";
import type { LoadingState } from "src/types";

type UseFeeTokensProps = {
	chainId: ChainId | null | undefined;
	address: string | null;
};

type UseFeeTokensResult = LoadingState<Token[] | undefined>;

const DEFAULT_VALUES: UseFeeTokensResult = {
	isLoading: true,
	data: [],
};

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

// bind() with factory function for parameterized observable
const [useFeeTokensInternal] = bind(
	(chainId: ChainId | null | undefined, address: string | null) =>
		getFeeTokens$(chainId, address).pipe(
			map((tokens) => ({ isLoading: false, data: tokens })),
		),
	DEFAULT_VALUES,
);

export const useFeeTokens = ({
	chainId,
	address,
}: UseFeeTokensProps): UseFeeTokensResult => {
	return useFeeTokensInternal(chainId, address);
};
