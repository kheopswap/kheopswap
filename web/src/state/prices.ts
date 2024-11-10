import { values } from "lodash";
import { parseUnits } from "viem";

import { getAllTokens$ } from "./tokens";

import { assetHub$, stableToken$ } from "./relay";

import {
	type Token,
	type TokenId,
	type TokenType,
	getTokenId,
} from "@kheopswap/registry";
import { getCachedObservable$, isBigInt } from "@kheopswap/utils";
import { combineLatest, map, of, shareReplay, switchMap } from "rxjs";
import { getAssetConvert$ } from "src/state/convert";
import { getAssetHubMirrorTokenId } from "src/util";

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
