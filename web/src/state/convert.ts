import {
	type Token,
	type TokenId,
	getChainIdFromTokenId,
	getTokenId,
	getTokenSpecs,
} from "@kheopswap/registry";
import {
	type LoadableState,
	getCachedObservable$,
	isBigInt,
	loadableData,
	loadableError,
	lodableLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import {
	type Observable,
	catchError,
	combineLatest,
	map,
	of,
	shareReplay,
	throttleTime,
} from "rxjs";
import { getAssetConvertPlancks } from "src/util";
import { getPoolReserves$ } from "./pools";

type AssetConvertInput = {
	tokenIdIn: TokenId;
	plancksIn: bigint;
	tokenIdOut: TokenId;
};

type AssetConvertResult = AssetConvertInput & {
	plancksOut: bigint | null;
	isLoading: boolean;
};

type AssetConvertMultiResult = {
	data: AssetConvertResult[];
	isLoading: boolean;
};

export const getAssetConvert$ = ({
	tokenIdIn,
	tokenIdOut,
	plancksIn,
}: AssetConvertInput): Observable<AssetConvertResult> =>
	getCachedObservable$(
		"getAssetConvert$",
		[tokenIdIn, tokenIdOut, plancksIn].join(","),
		() => {
			const returnValue = (plancksOut: bigint | null, isLoading: boolean) => ({
				tokenIdIn,
				tokenIdOut,
				plancksIn,
				plancksOut,
				isLoading,
			});

			if (!tokenIdIn || !tokenIdOut) return of(returnValue(null, false));

			const chainId1 = getChainIdFromTokenId(tokenIdIn);
			const chainId2 = getChainIdFromTokenId(tokenIdOut);

			if (!chainId1 || !chainId2 || chainId1 !== chainId2)
				return of(returnValue(null, false));

			const nativeTokenId = getTokenId({ type: "native", chainId: chainId1 });

			const getReserves$ = (tid1: TokenId, tid2: TokenId) => {
				if (tid1 === tid2)
					return of({
						reserves: [1n, 1n] as [bigint, bigint],
						isLoading: false,
					});
				return getPoolReserves$(tid1, tid2);
			};

			return combineLatest([
				getReserves$(nativeTokenId, tokenIdIn),
				getReserves$(nativeTokenId, tokenIdOut),
			]).pipe(
				map(
					([
						{ reserves: reserveNativeToTokenIn, isLoading: isLoadingPool1 },
						{ reserves: reserveNativeToTokenOut, isLoading: isLoadingPool2 },
					]) => {
						if (!reserveNativeToTokenIn || !reserveNativeToTokenOut)
							return returnValue(null, isLoadingPool1 || isLoadingPool2);

						const plancksOut =
							getAssetConvertPlancks(
								plancksIn,
								tokenIdIn,
								nativeTokenId,
								tokenIdOut,
								reserveNativeToTokenIn,
								reserveNativeToTokenOut,
							) ?? null;

						return returnValue(plancksOut, isLoadingPool1 || isLoadingPool2);
					},
				),
				shareReplay({ bufferSize: 1, refCount: true }),
			);
		},
	);

export const getAssetConvertMulti$ = (
	inputs: AssetConvertInput[],
): Observable<AssetConvertMultiResult> => {
	return combineLatest(inputs.map((input) => getAssetConvert$(input))).pipe(
		throttleTime(200, undefined, { leading: true, trailing: true }),
		map((data) => ({
			data,
			isLoading: data.some(({ isLoading }) => isLoading),
		})),
	);
};

// raw converted value based on reserves, without taking account any app or lp fee
export const [useAssetConvertLoadable, getAssetConvertLoadable$] = bind(
	(
		tokenIn: Token | TokenId | null | undefined,
		tokenOut: Token | TokenId | null | undefined,
		plancksIn: bigint | null | undefined,
	): Observable<LoadableState<bigint | null>> => {
		if (!tokenIn || !tokenOut || !isBigInt(plancksIn))
			return of(loadableData(null));

		const tokenInSpecs = getTokenSpecs(tokenIn);
		const tokenOutSpecs = getTokenSpecs(tokenOut);

		if (
			!tokenInSpecs.chainId ||
			!tokenOutSpecs.chainId ||
			tokenInSpecs.chainId !== tokenOutSpecs.chainId
		)
			return of(loadableData(null));

		const nativeTokenId = getTokenId({
			type: "native",
			chainId: tokenInSpecs.chainId,
		});

		const getReserves$ = (tid1: TokenId, tid2: TokenId) => {
			if (tid1 === tid2)
				return of({
					reserves: [1n, 1n] as [bigint, bigint],
					isLoading: false,
				});
			return getPoolReserves$(tid1, tid2);
		};

		return combineLatest([
			getReserves$(nativeTokenId, tokenInSpecs.id),
			getReserves$(nativeTokenId, tokenOutSpecs.id),
		]).pipe(
			map(
				([
					{ reserves: reserveNativeToTokenIn, isLoading: isLoadingPool1 },
					{ reserves: reserveNativeToTokenOut, isLoading: isLoadingPool2 },
				]) => {
					if (!reserveNativeToTokenIn || !reserveNativeToTokenOut)
						return loadableData(null, isLoadingPool1 || isLoadingPool2);

					const plancksOut =
						getAssetConvertPlancks(
							plancksIn,
							tokenInSpecs.id,
							nativeTokenId,
							tokenOutSpecs.id,
							reserveNativeToTokenIn,
							reserveNativeToTokenOut,
						) ?? null;

					return loadableData(plancksOut, isLoadingPool1 || isLoadingPool2);
				},
			),
			catchError((err) => of(loadableError<bigint | null>(err))),
		);
	},
	lodableLoading<bigint | null>(),
);
