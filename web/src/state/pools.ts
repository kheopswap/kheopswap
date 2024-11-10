import {
	type TokenId,
	getChainIdFromTokenId,
	parseTokenId,
} from "@kheopswap/registry";
import { getBalance$ } from "@kheopswap/services/balances";
import { getPoolsByChain$ } from "@kheopswap/services/pools";
import { getCachedObservable$, isBigInt } from "@kheopswap/utils";
import type { LoadingStatus } from "node_modules/@kheopswap/services/src/common";
import type {
	AssetConvertionPoolDef,
	Pool,
} from "node_modules/@kheopswap/services/src/pools/types";
import {
	type Observable,
	combineLatest,
	map,
	of,
	shareReplay,
	switchMap,
} from "rxjs";

const getIsLoading = (...loadingStatuses: LoadingStatus[]) =>
	loadingStatuses.some((status) => status !== "loaded");

const getPool$ = (
	tokenId1: TokenId,
	tokenId2: TokenId,
): Observable<{ pool: Pool | null; status: LoadingStatus }> =>
	getCachedObservable$("getPool$", [tokenId1, tokenId2].join(","), () => {
		if (!tokenId1 || !tokenId2) return of({ pool: null, status: "loaded" });

		const token1 = parseTokenId(tokenId1);
		const token2 = parseTokenId(tokenId2);

		if (!token1.chainId || !token2.chainId || token1.chainId !== token2.chainId)
			return of({ pool: null, status: "loaded" });

		// scan will be faster if we search for the non native token first
		const tokenIds =
			token1.type === "native" ? [tokenId2, tokenId1] : [tokenId1, tokenId2];

		return getPoolsByChain$(token1.chainId).pipe(
			map(({ pools, status }) => {
				const pool =
					pools.find((pool) =>
						tokenIds.every((tokenId) => pool.tokenIds.includes(tokenId)),
					) ?? null;
				return { pool, status };
			}),
			shareReplay({ bufferSize: 1, refCount: true }),
		);
	});

const getAssetHubPoolReserves$ = (
	pool: AssetConvertionPoolDef | null,
): Observable<{ reserves: [bigint, bigint] | null; isLoading: boolean }> =>
	getCachedObservable$(
		"getPoolReserves$",
		pool?.poolAssetId.toString() ?? "null",
		() => {
			if (!pool) return of({ reserves: null, isLoading: false });

			return combineLatest([
				getBalance$({
					address: pool.owner,
					tokenId: pool.tokenIds[0],
				}),
				getBalance$({
					address: pool.owner,
					tokenId: pool.tokenIds[1],
				}),
			]).pipe(
				map(
					([
						{ balance: reserveNative, status: statusNative },
						{ balance: reserveAsset, status: statusAsset },
					]) => ({
						reserves:
							isBigInt(reserveNative) && isBigInt(reserveAsset)
								? ([reserveNative, reserveAsset] as [bigint, bigint])
								: null,
						isLoading: getIsLoading(statusNative, statusAsset),
					}),
				),
				shareReplay({ bufferSize: 1, refCount: true }),
			);
		},
	);

// export const getPoolWithReserves$ = (
// 	tokenId1: TokenId | null | undefined,
// 	tokenId2: TokenId | null | undefined,
// ): Observable<{ reserves: [bigint, bigint] | null; isLoading: boolean }> =>
// 	getCachedObservable$(
// 		"getPoolReservesByTokenIds$",
// 		[tokenId1, tokenId2].join(","),
// 		() => {
// 			if (!tokenId1 || !tokenId2)
// 				return of({ isLoading: false, reserves: null });

// 			const chainId1 = getChainIdFromTokenId(tokenId1);
// 			const chainId2 = getChainIdFromTokenId(tokenId2);

// 			if (!chainId1 || !chainId2 || chainId1 !== chainId2)
// 				return of({
// 					isLoading: false,
// 					reserves: null,
// 				});

// 			return combineLatest([
// 				getTokenById$(tokenId1),
// 				getTokenById$(tokenId2),
// 				getPool$(tokenId1, tokenId2),
// 			]).pipe(
// 				switchMap(
// 					([
// 						{ token: token1, status: statusToken1 },
// 						{ token: token2, status: statusToken2 },
// 						{ pool, status: statusPool },
// 					]) => {
// 						const isLoading = getIsLoading(
// 							statusToken1,
// 							statusToken2,
// 							statusPool,
// 						);
// 						if (!token1 || !token2 || !pool)
// 							return of({
// 								isLoading,
// 								reserves: null,
// 							});

// 						return getAssetHubPoolReserves$(pool).pipe(
// 							map(({ reserves, isLoading }) => ({
// 								isLoading,
// 								reserves:
// 									reserves && token1
// 										? token1.type === "native"
// 											? reserves // native to asset
// 											: (reserves.slice().reverse() as [bigint, bigint]) // asset to native
// 										: null,
// 							})),
// 						);
// 					},
// 				),
// 				shareReplay({ bufferSize: 1, refCount: true }),
// 			);
// 		},
// 	);

export const getPoolReserves$ = (
	tokenId1: TokenId | null | undefined,
	tokenId2: TokenId | null | undefined,
): Observable<{ reserves: [bigint, bigint] | null; isLoading: boolean }> =>
	getCachedObservable$(
		"getPoolReserves$",
		[tokenId1, tokenId2].join(","),
		() => {
			if (!tokenId1 || !tokenId2)
				return of({ isLoading: false, reserves: null });

			const token1 = parseTokenId(tokenId1);
			const chainId1 = token1.chainId;
			const chainId2 = getChainIdFromTokenId(tokenId2);

			if (!chainId1 || !chainId2 || chainId1 !== chainId2)
				return of({
					isLoading: false,
					reserves: null,
				});

			return combineLatest([getPool$(tokenId1, tokenId2)]).pipe(
				switchMap(([{ pool, status: statusPool }]) => {
					const isLoading = getIsLoading(statusPool);
					if (!pool)
						return of({
							isLoading,
							reserves: null,
						});

					return getAssetHubPoolReserves$(pool).pipe(
						map(({ reserves, isLoading }) => ({
							isLoading,
							reserves: reserves
								? token1.type === "native"
									? reserves // native to asset
									: (reserves.slice().reverse() as [bigint, bigint]) // asset to native
								: null,
						})),
					);
				}),
				shareReplay({ bufferSize: 1, refCount: true }),
			);
		},
	);
