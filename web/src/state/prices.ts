import { values } from "lodash-es";
import {
	combineLatest,
	distinctUntilChanged,
	map,
	type Observable,
	of,
	shareReplay,
	switchMap,
	throttleTime,
} from "rxjs";
import { parseUnits } from "viem";
import { isChainIdHydration } from "../registry/chains/chains";
import type { Chain, ChainIdHydration } from "../registry/chains/types";
import { getChainIdFromTokenId, getTokenId } from "../registry/tokens/helpers";
import type { Token, TokenId, TokenType } from "../registry/tokens/types";
import { getAssetHubMirrorTokenIds } from "../utils/getAssetHubMirrorTokenId";
import { getCachedObservable$ } from "../utils/getCachedObservable";
import { isBigInt } from "../utils/isBigInt";
import { getAssetConvert$ } from "./convert";
import { assetHub$, relayChains$, stableToken$ } from "./relay";
import { getAllTokens$ } from "./tokens";

const assetHubMirrorTokenIds$ = combineLatest([
	relayChains$,
	getAllTokens$(),
]).pipe(
	map(([{ assetHub, allChains }, { data: tokens }]) => {
		const hydration = allChains.find(
			(chain): chain is Chain<ChainIdHydration> => isChainIdHydration(chain.id),
		);
		return hydration
			? getAssetHubMirrorTokenIds(tokens, assetHub, hydration)
			: new Map<TokenId, TokenId>();
	}),
	shareReplay({ bufferSize: 1, refCount: true }),
);

export const getAssetHubMirrorTokenId$ = (
	tokenId: TokenId,
): Observable<TokenId> =>
	isChainIdHydration(getChainIdFromTokenId(tokenId))
		? assetHubMirrorTokenIds$.pipe(
				map((mirrorTokenIds) => mirrorTokenIds.get(tokenId) ?? tokenId),
				distinctUntilChanged(),
			)
		: of(tokenId);

export const getStablePlancks$ = (
	tokenId: TokenId,
	plancks: bigint | undefined,
) => {
	if (plancks === 0n)
		return of({ stablePlancks: 0n, isLoadingStablePlancks: false });

	return combineLatest([stableToken$, getAssetHubMirrorTokenId$(tokenId)]).pipe(
		map(([stableToken, tokenIdIn]) => ({
			tokenIdIn,
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
			return combineLatest([
				assetHub$,
				stableToken$,
				getAssetHubMirrorTokenId$(token.id),
			]).pipe(
				switchMap(([assetHub, stableToken, mirrorTokenId]) => {
					const nativeTokenId = getTokenId({
						type: "native",
						chainId: assetHub.id,
					});

					const nativePrice$ = getAssetConvert$({
						tokenIdIn: mirrorTokenId,
						plancksIn: parseUnits("1", token.decimals),
						tokenIdOut: nativeTokenId,
					});

					const stablePrice$ = getAssetConvert$({
						tokenIdIn: mirrorTokenId,
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
