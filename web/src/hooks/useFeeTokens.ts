import { isEqual, values } from "lodash-es";
import {
	combineLatest,
	distinctUntilChanged,
	filter,
	map,
	type Observable,
	of,
	shareReplay,
	switchMap,
} from "rxjs";
import {
	isChainIdAssetHub,
	isChainIdHydration,
} from "../registry/chains/chains";
import type { ChainId, ChainIdHydration } from "../registry/chains/types";
import type { Token } from "../registry/tokens/types";
import { getPoolsByChain$ } from "../services/pools/service";
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

	return getCachedObservable$(
		"getFeeToken$",
		`::${chainId}::${address}`,
		() => {
			if (!chainId || !address) return of([]);

			const sufficientTokens$ = getTokensByChain$(chainId).pipe(
				map((tokensByChainState) =>
					values(tokensByChainState.tokens ?? {}).filter(
						(token) => token.isSufficient,
					),
				),
			);

			const feeTokens$ = isChainIdAssetHub(chainId)
				? combineLatest([
						sufficientTokens$,
						getPoolsByChain$(chainId).pipe(map(({ pools }) => pools)),
					]).pipe(
						map(([tokens, pools]) =>
							tokens.filter(
								(token) =>
									token.type === "native" ||
									pools.some((pool) => pool.tokenIds.includes(token.id)),
							),
						),
					)
				: sufficientTokens$;

			return feeTokens$.pipe(
				distinctUntilChanged<Token[]>(isEqual),
				shareReplay({ refCount: true, bufferSize: 1 }),
			);
		},
	);
};
