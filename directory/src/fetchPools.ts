import {
	type ChainId,
	getChainById,
	getTokenIdFromXcmV5Multilocation,
	type TokenIdsPair,
} from "@kheopswap/registry";
import { getApi } from "./getApi";
import type { DirectoryPool } from "./types";

/**
 * Fetch all asset conversion pools from chain
 */
export const fetchPools = async (
	chainId: ChainId,
): Promise<DirectoryPool[]> => {
	const chain = getChainById(chainId);
	const api = await getApi(chain.id);
	await api.waitReady;

	console.log(`Fetching pools for ${chain.id}...`);

	const [poolEntries, poolAssetEntries] = await Promise.all([
		api.query.AssetConversion.Pools.getEntries({ at: "best" }),
		api.query.PoolAssets.Asset.getEntries({ at: "best" }),
	]);

	const pools: DirectoryPool[] = [];

	for (const poolEntry of poolEntries) {
		const poolAssetId = poolEntry.value;

		// Find the pool asset to get the owner
		const poolAsset = poolAssetEntries.find(
			(p) => p.keyArgs[0] === poolAssetId,
		);

		if (!poolAsset) {
			console.warn(`Pool asset not found for poolAssetId: ${poolAssetId}`);
			continue;
		}

		// Convert XCM multilocations to token IDs
		const tokenIds = poolEntry.keyArgs[0].map((location) =>
			getTokenIdFromXcmV5Multilocation(chain.id, location),
		) as TokenIdsPair;

		// Skip pools with invalid token IDs
		if (!tokenIds.every((t) => !!t)) {
			console.warn(`Invalid token IDs for pool: ${poolAssetId}`, tokenIds);
			continue;
		}

		pools.push({
			type: "asset-convertion",
			chainId: chain.id,
			poolAssetId,
			tokenIds,
			owner: poolAsset.value.owner,
		});
	}

	console.log(`Found ${pools.length} pools for ${chain.id}`);
	return pools;
};
