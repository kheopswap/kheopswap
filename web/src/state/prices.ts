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
import { isChainIdAssetHub } from "../registry/chains/chains";
import { getChainIdFromTokenId, getTokenId } from "../registry/tokens/helpers";
import type { Token, TokenId, TokenType } from "../registry/tokens/types";
import type { BalanceWithStableSummary } from "../types/balances";
import { getAssetHubMirrorTokenIds } from "../utils/getAssetHubMirrorTokenId";
import { getCachedObservable$ } from "../utils/getCachedObservable";
import {
	getHoldingValuation,
	type HoldingValuation,
	UNPRICED,
	valuationOf,
} from "../utils/getHoldingValuation";
import { isBigInt } from "../utils/isBigInt";
import {
	getAssetConversionLpFee$,
	getAssetConvert$,
	getAssetConvertReserves$,
} from "./convert";
import { assetHub$, relayChains$, stableToken$ } from "./relay";
import { getAllTokens$ } from "./tokens";

export const LOW_LIQUIDITY_FLOOR_STABLE_UNITS = "100";

export const assetHubMirrorTokenIds$ = combineLatest([
	relayChains$,
	getAllTokens$(),
]).pipe(
	map(([{ assetHub, allChains }, { data: tokens }]) =>
		getAssetHubMirrorTokenIds(tokens, assetHub, allChains),
	),
	shareReplay({ bufferSize: 1, refCount: true }),
);

export const getAssetHubMirrorTokenId$ = (
	tokenId: TokenId,
): Observable<TokenId> =>
	isChainIdAssetHub(getChainIdFromTokenId(tokenId))
		? of(tokenId)
		: assetHubMirrorTokenIds$.pipe(
				map((mirrorTokenIds) => mirrorTokenIds.get(tokenId) ?? tokenId),
				distinctUntilChanged(),
			);

type StablePlancks = {
	stablePlancks: bigint | null;
	isLoadingStablePlancks: boolean;
};

export const getStablePlancks$ = (
	tokenId: TokenId,
	plancks: bigint | undefined,
): Observable<StablePlancks> => {
	if (plancks === undefined)
		return of({ stablePlancks: null, isLoadingStablePlancks: false });
	if (plancks === 0n)
		return of({ stablePlancks: 0n, isLoadingStablePlancks: false });

	return combineLatest([stableToken$, getAssetHubMirrorTokenId$(tokenId)]).pipe(
		switchMap(([stableToken, tokenIdIn]) =>
			getAssetConvert$({
				tokenIdIn,
				plancksIn: plancks,
				tokenIdOut: stableToken.id,
			}),
		),
		map(({ plancksOut, isLoading }) => ({
			stablePlancks: plancksOut,
			isLoadingStablePlancks: isLoading,
		})),
	);
};

type TokenValuation = {
	tokenId: TokenId;
	nativeTokenId: TokenId;
	stableTokenId: TokenId;
	lowLiquidityFloorStablePlancks: bigint;
	reservesNativeToToken: [bigint, bigint] | null;
	reservesNativeToStable: [bigint, bigint] | null;
	lpFee: number;
	isLoading: boolean;
};

const getTokenValuation$ = (tokenId: TokenId): Observable<TokenValuation> =>
	getCachedObservable$("getTokenValuation$", tokenId, () =>
		combineLatest([
			assetHub$,
			stableToken$,
			getAssetHubMirrorTokenId$(tokenId),
		]).pipe(
			switchMap(([assetHub, stableToken, mirrorTokenId]) => {
				const nativeTokenId = getTokenId({
					type: "native",
					chainId: assetHub.id,
				});
				const base = {
					tokenId: mirrorTokenId,
					nativeTokenId,
					stableTokenId: stableToken.id,
					lowLiquidityFloorStablePlancks: parseUnits(
						LOW_LIQUIDITY_FLOOR_STABLE_UNITS,
						stableToken.decimals,
					),
				};

				if (getChainIdFromTokenId(mirrorTokenId) !== assetHub.id)
					return of({
						...base,
						reservesNativeToToken: null,
						reservesNativeToStable: null,
						lpFee: 0,
						isLoading: false,
					});

				return combineLatest([
					getAssetConvertReserves$(mirrorTokenId, stableToken.id),
					getAssetConversionLpFee$(assetHub.id),
				]).pipe(
					map(([{ reserves, isLoading }, lpFee]) => ({
						...base,
						reservesNativeToToken: reserves?.reservesNativeToTokenIn ?? null,
						reservesNativeToStable: reserves?.reservesNativeToTokenOut ?? null,
						lpFee,
						isLoading,
					})),
				);
			}),
			shareReplay({ bufferSize: 1, refCount: true }),
		),
	);

export type HoldingStablePlancks = HoldingValuation & {
	isLoadingStablePlancks: boolean;
};

export const getHoldingStablePlancks$ = (
	tokenId: TokenId,
	plancks: bigint | undefined,
): Observable<HoldingStablePlancks> =>
	getTokenValuation$(tokenId).pipe(
		map((valuation) => ({
			...(plancks === undefined
				? UNPRICED
				: getHoldingValuation({ ...valuation, plancks })),
			isLoadingStablePlancks: valuation.isLoading,
		})),
	);

const getTokenPrice$ = (token: Token) =>
	getCachedObservable$(
		"getTokenPrice$",
		[token.id, token.decimals].join(","),
		() =>
			combineLatest([assetHub$, getAssetHubMirrorTokenId$(token.id)]).pipe(
				switchMap(([assetHub, mirrorTokenId]) => {
					const nativeTokenId = getTokenId({
						type: "native",
						chainId: assetHub.id,
					});
					const oneToken = parseUnits("1", token.decimals);

					return combineLatest([
						getAssetConvert$({
							tokenIdIn: mirrorTokenId,
							plancksIn: oneToken,
							tokenIdOut: nativeTokenId,
						}),
						getStablePlancks$(token.id, oneToken),
						getHoldingStablePlancks$(token.id, oneToken),
					]).pipe(
						map(
							([
								nativePrice,
								stablePrice,
								holding,
							]): BalanceWithStableSummary => ({
								tokenId: token.id,
								tokenPlancks: nativePrice.plancksOut,
								isLoadingTokenPlancks: nativePrice.isLoading,
								isLoadingStablePlancks: stablePrice.isLoadingStablePlancks,
								isInitializing:
									!isBigInt(nativePrice.plancksOut) && nativePrice.isLoading,
								...(holding.status === "priced"
									? valuationOf(stablePrice.stablePlancks)
									: holding),
							}),
						),
					);
				}),
				shareReplay({ bufferSize: 1, refCount: true }),
			),
	);

export const getTokenPrices$ = (types?: TokenType[]) =>
	getCachedObservable$(
		"getTokenPrices$",
		types ? [...types].sort().join(",") : "all",
		() =>
			getAllTokens$(types).pipe(
				switchMap(({ data: dicTokens, isLoading: isLoadingTokens }) =>
					combineLatest(values(dicTokens).map(getTokenPrice$)).pipe(
						throttleTime(300, undefined, { leading: true, trailing: true }),
						map((data) => ({
							data,
							isLoading:
								isLoadingTokens ||
								data.some(
									(d) => d.isLoadingStablePlancks || d.isLoadingTokenPlancks,
								),
						})),
					),
				),
				shareReplay({ bufferSize: 1, refCount: true }),
			),
	);
