import { getApi } from "@kheopswap/papi";
import {
	type ChainId,
	getTokenIdFromXcmV5Multilocation,
	type TokenId,
	type TokenIdsPair,
} from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import { catchError, from, type Observable, of, shareReplay } from "rxjs";
import type { Pool } from "./types";

/**
 * Fetch all asset conversion pools from chain
 * Returns pools with tokenIds that may reference tokens not yet in the store
 */
export const fetchPoolsFromChain$ = (
	chainId: ChainId,
): Observable<{ pools: Pool[]; referencedTokenIds: TokenId[] }> => {
	return from(fetchPoolsFromChain(chainId)).pipe(
		catchError((err) => {
			logger.error(`Failed to fetch pools from chain ${chainId}`, { err });
			return of({ pools: [], referencedTokenIds: [] });
		}),
		shareReplay({ bufferSize: 1, refCount: true }),
	);
};

/**
 * Fetch all asset conversion pools from chain (async version)
 */
export const fetchPoolsFromChain = async (
	chainId: ChainId,
): Promise<{ pools: Pool[]; referencedTokenIds: TokenId[] }> => {
	const api = await getApi(chainId);

	const [poolEntries, poolAssetEntries] = await Promise.all([
		api.query.AssetConversion.Pools.getEntries({ at: "best" }),
		api.query.PoolAssets.Asset.getEntries({ at: "best" }),
	]);

	const pools: Pool[] = [];
	const referencedTokenIds = new Set<TokenId>();

	for (const poolEntry of poolEntries) {
		const poolAssetId = poolEntry.value;

		// Find the pool asset to get the owner
		const poolAsset = poolAssetEntries.find(
			(p) => p.keyArgs[0] === poolAssetId,
		);

		if (!poolAsset) {
			logger.warn(`Pool asset not found for poolAssetId: ${poolAssetId}`);
			continue;
		}

		// Convert XCM multilocations to token IDs
		const tokenIds = poolEntry.keyArgs[0].map((location) =>
			getTokenIdFromXcmV5Multilocation(chainId, location),
		) as TokenIdsPair;

		// Skip pools with invalid token IDs
		if (!tokenIds.every((t) => !!t)) {
			logger.warn(`Invalid token IDs for pool: ${poolAssetId}`, { tokenIds });
			continue;
		}

		// Track referenced token IDs for discovery
		for (const tokenId of tokenIds) {
			if (tokenId) referencedTokenIds.add(tokenId);
		}

		pools.push({
			type: "asset-convertion",
			chainId,
			poolAssetId,
			tokenIds,
			owner: poolAsset.value.owner,
		});
	}

	return {
		pools,
		referencedTokenIds: Array.from(referencedTokenIds),
	};
};
