import {
	combineLatest,
	map,
	type Observable,
	of,
	shareReplay,
	switchMap,
} from "rxjs";
import type { Token, TokenId } from "../registry/tokens/types";
import { getTokenById$ } from "../services/tokens/service";
import { getAssetConvert$ } from "../state/convert";
import { bindSerialized } from "../utils/bindSerialized";
import { getCachedObservable$ } from "../utils/getCachedObservable";
import { isBigInt } from "../utils/isBigInt";
import { plancksToTokens } from "../utils/plancks";

type UseAssetConvertPlancks = {
	tokenIdIn: TokenId | null | undefined;
	tokenIdOut: TokenId | null | undefined;
	plancks: bigint | null | undefined;
};

type AssetConvertTokens = {
	tokenIn: Token | null | undefined;
	tokenOut: Token | null | undefined;
};

type UseAssetConvertPlancksResult = AssetConvertTokens & {
	plancksOut: bigint | null | undefined;
	isLoading: boolean;
};

type UseAssetConvertPriceResult = AssetConvertTokens & {
	price: string | undefined;
	isLoading: boolean;
};

const useAssetConvertPlancksByArgs = bindSerialized(
	(
		tokenIdIn: TokenId | null,
		tokenIdOut: TokenId | null,
		plancks: bigint | null,
	): Observable<UseAssetConvertPlancksResult> =>
		getAssetConvertPlancks$(tokenIdIn, tokenIdOut, plancks),
	(): UseAssetConvertPlancksResult => ({
		plancksOut: undefined,
		isLoading: true,
		tokenIn: undefined,
		tokenOut: undefined,
	}),
);

export const useAssetConvertPlancks = ({
	tokenIdIn,
	tokenIdOut,
	plancks,
}: UseAssetConvertPlancks) =>
	useAssetConvertPlancksByArgs(
		tokenIdIn ?? null,
		tokenIdOut ?? null,
		plancks ?? null,
	);

const useAssetConvertPriceByArgs = bindSerialized(
	(
		tokenIdIn: TokenId | null,
		tokenIdOut: TokenId | null,
		plancks: bigint | null,
	): Observable<UseAssetConvertPriceResult> =>
		getAssetConvertTokens$(tokenIdIn, tokenIdOut, plancks),
	(): UseAssetConvertPriceResult => ({
		price: undefined,
		isLoading: true,
		tokenIn: undefined,
		tokenOut: undefined,
	}),
);

export const useAssetConvertPrice = ({
	tokenIdIn,
	tokenIdOut,
	plancks,
}: UseAssetConvertPlancks) =>
	useAssetConvertPriceByArgs(
		tokenIdIn ?? null,
		tokenIdOut ?? null,
		plancks ?? null,
	);

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
