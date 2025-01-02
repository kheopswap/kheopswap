import {
	type ChainIdAssetHub,
	KNOWN_TOKENS_LIST,
	KNOWN_TOKENS_MAP,
	type Token,
	type TokenId,
	getTokenId,
	getTokenSpecs,
} from "@kheopswap/registry";

import {
	type LoadableState,
	isBigInt,
	loadableData,
	loadableError,
	loadableLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import {
	type Observable,
	catchError,
	combineLatest,
	map,
	of,
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

// ouputs equivalent value of the asset based on reserves, it does not take any fee into account
export const getAssetConvert$ = ({
	tokenIdIn,
	tokenIdOut,
	plancksIn,
}: AssetConvertInput): Observable<AssetConvertResult> =>
	getAssetConvertLoadable$(tokenIdIn, tokenIdOut, plancksIn).pipe(
		map(({ data: plancksOut, isLoading }) => ({
			tokenIdIn,
			tokenIdOut,
			plancksIn,
			plancksOut: plancksOut ?? null,
			isLoading,
		})),
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

// returns the token from the assetHub chain that matches the provided tokenId
// unwraps token origins (which are all harcoded) until finding the
// ex : pah's KSM representation of native KSM on Kusama (KSM => kah KSM => pah KSM)
const getAhTokenId = (
	tokenId: TokenId,
	ahChainId: ChainIdAssetHub,
): TokenId | null => {
	const specs = getTokenSpecs(tokenId);
	if (specs.chainId === ahChainId) return tokenId;

	const knownToken = KNOWN_TOKENS_MAP[tokenId];
	if (knownToken && "origin" in knownToken && knownToken.origin) {
		const target = getAhTokenId(knownToken.origin, ahChainId);
		if (target) return target;
	}

	const ahToken = KNOWN_TOKENS_LIST.find(
		(t) => "origin" in t && t.origin === tokenId && t.chainId === ahChainId,
	) as Token;

	return ahToken?.id ?? null;
};

// raw converted value based on AH reserves, without taking account any app or lp fee
export const [useAssetConvertLoadable, getAssetConvertLoadable$] = bind(
	(
		tokenIdIn: TokenId | null | undefined,
		tokenIdOut: TokenId | null | undefined,
		plancksIn: bigint | null | undefined,
	): Observable<LoadableState<bigint | null>> => {
		if (!tokenIdIn || !tokenIdOut || !isBigInt(plancksIn))
			return of(loadableData(null));

		if (tokenIdIn === tokenIdOut) return of(loadableData(plancksIn));

		// const assetHubId =

		const ahTokenIn = getAhTokenId(tokenIdIn, "pah");
		const ahTokenOut = getAhTokenId(tokenIdOut, "pah");

		if (!ahTokenIn || !ahTokenOut) return of(loadableData(null));

		const ahTokenInSpecs = getTokenSpecs(ahTokenIn);
		const ahTokenOutSpecs = getTokenSpecs(ahTokenOut);

		// if tokenIn is not on assetHub and his origin is on assetHub, use the origin
		// if (tokenInSpecs.origin && tokenInSpecs.chainId !== tokenOutSpecs.chainId)
		// 	tokenInSpecs = getTokenById$(tokenInSpecs.origin);

		if (
			!ahTokenInSpecs.chainId ||
			!ahTokenOutSpecs.chainId ||
			ahTokenInSpecs.chainId !== ahTokenOutSpecs.chainId
		)
			return of(loadableData(null));

		const nativeTokenId = getTokenId({
			type: "native",
			chainId: ahTokenInSpecs.chainId,
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
			getReserves$(nativeTokenId, ahTokenInSpecs.id),
			getReserves$(nativeTokenId, ahTokenOutSpecs.id),
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
							ahTokenInSpecs.id,
							nativeTokenId,
							ahTokenOutSpecs.id,
							reserveNativeToTokenIn,
							reserveNativeToTokenOut,
						) ?? null;

					return loadableData(plancksOut, isLoadingPool1 || isLoadingPool2);
				},
			),
			catchError((err) => of(loadableError<bigint | null>(err))),
		);
	},
	loadableLoading<bigint | null>(),
);
