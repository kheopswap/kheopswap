import type { Token, TokenId } from "@kheopswap/registry";
import { getTokenById$ } from "@kheopswap/services/tokens";
import {
	getCachedObservable$,
	isBigInt,
	plancksToTokens,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { combineLatest, map, of, shareReplay, switchMap } from "rxjs";
import { getAssetConvert$ } from "src/state";

type UseAssetConvertPlancksResult = {
	plancksOut: bigint | null;
	isLoading: boolean;
	tokenIn: Token | null | undefined;
	tokenOut: Token | null | undefined;
};

const DEFAULT_VALUE_PLANCKS: UseAssetConvertPlancksResult = {
	plancksOut: null,
	isLoading: true,
	tokenIn: null,
	tokenOut: null,
};

// bind() with factory function for parameterized observable
const [useAssetConvertPlancksInternal] = bind(
	(
		tokenIdIn: TokenId | null | undefined,
		tokenIdOut: TokenId | null | undefined,
		plancks: bigint | null | undefined,
	) => getAssetConvertPlancks$(tokenIdIn, tokenIdOut, plancks),
	DEFAULT_VALUE_PLANCKS,
);

type UseAssetConvertPlancks = {
	tokenIdIn: TokenId | null | undefined;
	tokenIdOut: TokenId | null | undefined;
	plancks: bigint | null | undefined;
};

export const useAssetConvertPlancks = ({
	tokenIdIn,
	tokenIdOut,
	plancks,
}: UseAssetConvertPlancks) => {
	return useAssetConvertPlancksInternal(tokenIdIn, tokenIdOut, plancks);
};

const DEFAULT_VALUE_PRICE = {
	price: undefined,
	isLoading: true,
	tokenIn: undefined,
	tokenOut: undefined,
};

// bind() with factory function for useAssetConvertPrice
const [useAssetConvertPriceInternal] = bind(
	(
		tokenIdIn: TokenId | null | undefined,
		tokenIdOut: TokenId | null | undefined,
		plancks: bigint | null | undefined,
	) => getAssetConvertTokens$(tokenIdIn, tokenIdOut, plancks),
	DEFAULT_VALUE_PRICE,
);

export const useAssetConvertPrice = ({
	tokenIdIn,
	tokenIdOut,
	plancks,
}: UseAssetConvertPlancks) => {
	return useAssetConvertPriceInternal(tokenIdIn, tokenIdOut, plancks);
};

const NO_TOKEN_RESULT = { token: null, status: "loaded" };

const getAssetConvertPlancks$ = (
	tokenIdIn: TokenId | null | undefined,
	tokenIdOut: TokenId | null | undefined,
	plancks: bigint | null | undefined,
) => {
	return getCachedObservable$(
		"getAssetConvertPlancks",
		`${tokenIdIn},${tokenIdOut},${plancks}`,
		() => {
			return combineLatest([
				tokenIdIn ? getTokenById$(tokenIdIn) : of(NO_TOKEN_RESULT),
				tokenIdOut ? getTokenById$(tokenIdOut) : of(NO_TOKEN_RESULT),
			]).pipe(
				switchMap(
					([
						{ token: tokenIn, status: statusTokenIn },
						{ token: tokenOut, status: statusTokenOut },
					]) => {
						const isLoading = [statusTokenIn, statusTokenOut].some(
							(status) => status !== "loaded",
						);

						if (!tokenIdIn || !tokenIdOut)
							return of({ plancksOut: null, isLoading, tokenIn, tokenOut });

						// Converting 0 of any token is always 0 (no need to check pool reserves)
						if (plancks === 0n)
							return of({ plancksOut: 0n, isLoading, tokenIn, tokenOut });

						// If plancks is null/undefined, we can't calculate yet
						if (plancks == null)
							return of({ plancksOut: null, isLoading, tokenIn, tokenOut });

						return getAssetConvert$({
							tokenIdIn,
							tokenIdOut,
							plancksIn: plancks,
						}).pipe(
							map(({ plancksOut, isLoading }) => ({
								plancksOut,
								isLoading,
								tokenIn,
								tokenOut,
							})),
						);
					},
				),
				shareReplay({ bufferSize: 1, refCount: true }),
			);
		},
	);
};

const getAssetConvertTokens$ = (
	tokenIdIn: TokenId | null | undefined,
	tokenIdOut: TokenId | null | undefined,
	plancks: bigint | null | undefined,
) => {
	return getCachedObservable$(
		"getAssetConvertTokens$",
		`${tokenIdIn},${tokenIdOut},${plancks}`,
		() => {
			return getAssetConvertPlancks$(tokenIdIn, tokenIdOut, plancks).pipe(
				map(({ plancksOut, isLoading, tokenIn, tokenOut }) => ({
					isLoading,
					price:
						isBigInt(plancksOut) && tokenOut
							? plancksToTokens(plancksOut, tokenOut.decimals)
							: undefined,
					tokenIn,
					tokenOut,
				})),
				shareReplay({ bufferSize: 1, refCount: true }),
			);
		},
	);
};
