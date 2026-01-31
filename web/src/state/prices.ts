import {
	getTokenId,
	type Token,
	type TokenId,
	type TokenType,
} from "@kheopswap/registry";
import { getTokensByChains$ } from "@kheopswap/services/tokens";
import { getCachedObservable$, isBigInt } from "@kheopswap/utils";
import { values } from "lodash-es";
import { combineLatest, map, of, shareReplay, switchMap } from "rxjs";
import { getAssetConvert$ } from "src/state/convert";
import type { BalanceWithStableSummary } from "src/types";
import { getAssetHubMirrorTokenId } from "src/util";
import { parseUnits } from "viem";
import { assetHub$, stableToken$ } from "./relay";

export const getStablePlancks$ = (
	tokenId: TokenId,
	plancks: bigint | undefined,
) => {
	if (plancks === 0n)
		return of({ stablePlancks: 0n, isLoadingStablePlancks: false });

	return combineLatest([assetHub$, stableToken$]).pipe(
		switchMap(([assetHub, stableToken]) => {
			// If no stable token configured or not loaded yet
			if (!stableToken) {
				// Only show loading if stable token is expected but not yet loaded
				const isLoading = !!assetHub.stableTokenId;
				return of({ stablePlancks: null, isLoadingStablePlancks: isLoading });
			}
			return of({
				tokenIdIn: getAssetHubMirrorTokenId(tokenId),
				plancksIn: plancks ?? 0n,
				tokenIdOut: stableToken.id,
			}).pipe(
				switchMap(getAssetConvert$),
				map(({ plancksOut, isLoading }) => ({
					stablePlancks: plancksOut,
					isLoadingStablePlancks: isLoading,
				})),
			);
		}),
		shareReplay({ bufferSize: 1, refCount: true }),
	);
};

const getTokenPrice$ = (token: Token, nativeTokenId: TokenId) => {
	return getCachedObservable$(
		"getTokenPrice$",
		[token.id, token.decimals].join(","),
		() => {
			const nativePrice$ = getAssetConvert$({
				tokenIdIn: token.id,
				plancksIn: parseUnits("1", token.decimals),
				tokenIdOut: nativeTokenId,
			});

			return combineLatest([nativePrice$, stableToken$]).pipe(
				switchMap(([nativePrice, stableToken]) => {
					// Calculate stable price using the current chain's stable token
					const stablePrice$ = stableToken
						? getAssetConvert$({
								tokenIdIn: getAssetHubMirrorTokenId(token.id),
								plancksIn: parseUnits("1", token.decimals),
								tokenIdOut: stableToken.id,
							})
						: of({ plancksOut: null as bigint | null, isLoading: false });

					return stablePrice$.pipe(
						map(
							(stablePrice): BalanceWithStableSummary => ({
								tokenId: token.id,
								tokenPlancks: nativePrice?.plancksOut ?? null,
								isLoadingTokenPlancks: nativePrice?.isLoading ?? false,
								stablePlancks: stablePrice?.plancksOut ?? null,
								isLoadingStablePlancks: stablePrice?.isLoading ?? false,
								isInitializing:
									!isBigInt(nativePrice?.plancksOut) &&
									!!nativePrice?.isLoading,
							}),
						),
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
			// Only get tokens for the current chain
			return assetHub$.pipe(
				switchMap((assetHub) => {
					const nativeTokenId = getTokenId({
						type: "native",
						chainId: assetHub.id,
					});

					return getTokensByChains$([assetHub.id]).pipe(
						switchMap((tokensByChain) => {
							const chainTokens = tokensByChain[assetHub.id];
							const isLoadingTokens = chainTokens?.status !== "loaded";
							const tokens = chainTokens?.tokens
								? values(chainTokens.tokens).filter(
										(token) => !types || types.includes(token.type),
									)
								: [];

							if (tokens.length === 0) {
								return of({ data: [], isLoading: isLoadingTokens });
							}

							return combineLatest(
								tokens.map((token) => getTokenPrice$(token, nativeTokenId)),
							).pipe(
								map((data) => ({
									data,
									isLoading:
										isLoadingTokens ||
										data.some(
											(d) =>
												d.isLoadingStablePlancks || d.isLoadingTokenPlancks,
										),
								})),
							);
						}),
					);
				}),
			);
		},
	);
};
