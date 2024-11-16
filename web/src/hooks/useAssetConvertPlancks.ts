import { useMemo } from "react";

import type { TokenId } from "@kheopswap/registry";
import { getTokenById$ } from "@kheopswap/services/tokens";
import {
	getCachedObservable$,
	isBigInt,
	plancksToTokens,
} from "@kheopswap/utils";
import { useObservable } from "react-rx";
import { combineLatest, map, of, shareReplay, switchMap } from "rxjs";
import { getAssetConvert$ } from "src/state";

type UseAssetConvertPlancks = {
	tokenIdIn: TokenId | null | undefined;
	tokenIdOut: TokenId | null | undefined;
	plancks: bigint | null | undefined;
};

const DEFAULT_VALUE_PLANCKS = {
	plancksOut: undefined,
	isLoading: true,
	tokenIn: undefined,
	tokenOut: undefined,
};

export const useAssetConvertPlancks = ({
	tokenIdIn,
	tokenIdOut,
	plancks,
}: UseAssetConvertPlancks) => {
	const obs = useMemo(
		() => getAssetConvertPlancks$(tokenIdIn, tokenIdOut, plancks),
		[tokenIdIn, tokenIdOut, plancks],
	);

	return useObservable(obs, DEFAULT_VALUE_PLANCKS);
};

const DEFAULT_VALUE_PRICE = {
	price: undefined,
	isLoading: true,
	tokenIn: undefined,
	tokenOut: undefined,
};

export const useAssetConvertPrice = ({
	tokenIdIn,
	tokenIdOut,
	plancks,
}: UseAssetConvertPlancks) => {
	const obs = useMemo(
		() => getAssetConvertTokens$(tokenIdIn, tokenIdOut, plancks),
		[tokenIdIn, tokenIdOut, plancks],
	);

	return useObservable(obs, DEFAULT_VALUE_PRICE);
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

						if (!plancks)
							return of({ plancksOut: 0n, isLoading, tokenIn, tokenOut });

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
