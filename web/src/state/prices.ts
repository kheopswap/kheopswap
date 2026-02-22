import { values } from "lodash-es";
import {
	combineLatest,
	map,
	of,
	shareReplay,
	switchMap,
	throttleTime,
} from "rxjs";
import { parseUnits } from "viem";
import { getTokenId } from "../registry/tokens/helpers";
import type { Token, TokenId, TokenType } from "../registry/tokens/types";
import { getAssetHubMirrorTokenId } from "../utils/getAssetHubMirrorTokenId";
import { getCachedObservable$ } from "../utils/getCachedObservable";
import { isBigInt } from "../utils/isBigInt";
import { getAssetConvert$ } from "./convert";
import { assetHub$, stableToken$ } from "./relay";
import { getAllTokens$ } from "./tokens";

export const getStablePlancks$ = (
	tokenId: TokenId,
	plancks: bigint | undefined,
) => {
	if (plancks === 0n)
		return of({ stablePlancks: 0n, isLoadingStablePlancks: false });

	return stableToken$.pipe(
		map((stableToken) => ({
			tokenIdIn: getAssetHubMirrorTokenId(tokenId),
			plancksIn: plancks ?? 0n,
			tokenIdOut: stableToken.id,
		})),
		switchMap(getAssetConvert$), // includes throttling
		map(({ plancksOut, isLoading }) => ({
			stablePlancks: plancksOut,
			isLoadingStablePlancks: isLoading,
		})),
		shareReplay({ bufferSize: 1, refCount: true }),
	);
};

const getTokenPrice$ = (token: Token) => {
	return getCachedObservable$(
		"getTokenPrice$",
		[token.id, token.decimals].join(","),
		() => {
			return combineLatest([assetHub$, stableToken$]).pipe(
				switchMap(([assetHub, stableToken]) => {
					const nativeTokenId = getTokenId({
						type: "native",
						chainId: assetHub.id,
					});

					const nativePrice$ = getAssetConvert$({
						tokenIdIn: token.id,
						plancksIn: parseUnits("1", token.decimals),
						tokenIdOut: nativeTokenId,
					});

					const stablePrice$ = getAssetConvert$({
						tokenIdIn: getAssetHubMirrorTokenId(token.id),
						plancksIn: parseUnits("1", token.decimals),
						tokenIdOut: stableToken.id,
					});

					return combineLatest([nativePrice$, stablePrice$]).pipe(
						map(([nativePrice, stablePrice]) => {
							return {
								tokenId: token.id,
								tokenPlancks: nativePrice?.plancksOut ?? null,
								isLoadingTokenPlancks: nativePrice?.isLoading ?? false,
								stablePlancks: stablePrice?.plancksOut ?? null,
								isLoadingStablePlancks: stablePrice?.isLoading ?? false,
								isInitializing:
									!isBigInt(nativePrice?.plancksOut) &&
									!!nativePrice?.isLoading,
							};
						}),
					);
				}),
				shareReplay({ bufferSize: 1, refCount: true }),
			);
		},
	);
};

export const getTokenPrices$ = (types?: TokenType[]) => {
	return getCachedObservable$(
		"getTokenPrices$",
		types?.sort().join(",") ?? "all",
		() => {
			return getAllTokens$(types).pipe(
				switchMap(({ data: dicTokens, isLoading: isLoadingTokens }) => {
					const tokens = values(dicTokens);
					return combineLatest(tokens.map(getTokenPrice$)).pipe(
						throttleTime(300, undefined, {
							leading: true,
							trailing: true,
						}),
						map((data) => ({
							data,
							isLoading:
								isLoadingTokens ||
								data.some(
									(d) => d.isLoadingStablePlancks || d.isLoadingTokenPlancks,
								),
						})),
					);
				}),
			);
		},
	);
};
