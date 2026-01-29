import {
	getChainIdFromTokenId,
	parseTokenId,
	type TokenId,
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
	combineLatest,
	map,
	type Observable,
	of,
	shareReplay,
	switchMap,
} from "rxjs";

// Only consider "loading" as loading, not "stale"
// "stale" means we have data but it might be old, not that we're fetching
const getIsLoading = (...loadingStatuses: LoadingStatus[]) =>
	loadingStatuses.some((status) => status === "loading");

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

export const getAssetHubPoolReserves$ = (
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
					// If no pool exists, return isLoading based on pool status
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
