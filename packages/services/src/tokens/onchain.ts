import { getApi } from "@kheopswap/papi";
import {
	type ChainId,
	getTokenId,
	parseTokenId,
	type Token,
	type TokenAsset,
	type TokenForeignAsset,
	type TokenId,
	type TokenPoolAsset,
} from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import { catchError, from, type Observable, of, shareReplay } from "rxjs";

/**
 * Fetch all asset tokens from chain
 * Returns tokens with verified: false, no logo (chain doesn't have this info)
 */
const fetchAssetTokensFromChain = async (
	chainId: ChainId,
): Promise<TokenAsset[]> => {
	const api = await getApi(chainId);

	const [metadataEntries, assetEntries] = await Promise.all([
		api.query.Assets.Metadata.getEntries({ at: "best" }),
		api.query.Assets.Asset.getEntries({ at: "best" }),
	]);

	// Create a map of assetId -> asset info for isSufficient lookup
	const assetInfoMap = new Map(
		assetEntries.map((entry) => [entry.keyArgs[0], entry.value]),
	);

	const tokens: TokenAsset[] = [];

	for (const entry of metadataEntries) {
		const assetId = entry.keyArgs[0];
		const metadata = entry.value;
		const assetInfo = assetInfoMap.get(assetId);

		// Skip if no metadata or frozen
		if (!metadata || assetInfo?.status.type === "Frozen") continue;

		const id = getTokenId({ type: "asset", chainId, assetId });

		tokens.push({
			id,
			type: "asset",
			chainId,
			assetId,
			decimals: metadata.decimals,
			symbol: metadata.symbol.asText(),
			name: metadata.name.asText(),
			verified: false,
			isSufficient: assetInfo?.is_sufficient ?? false,
		});
	}

	return tokens;
};

/**
 * Fetch all foreign asset tokens from chain
 * Returns tokens with verified: false, no logo (chain doesn't have this info)
 */
const fetchForeignAssetTokensFromChain = async (
	chainId: ChainId,
): Promise<TokenForeignAsset[]> => {
	const api = await getApi(chainId);

	const [metadataEntries, assetEntries] = await Promise.all([
		api.query.ForeignAssets.Metadata.getEntries({ at: "best" }),
		api.query.ForeignAssets.Asset.getEntries({ at: "best" }),
	]);

	// Create a map of location -> asset info for isSufficient lookup
	// We need to stringify location for map key comparison
	const assetInfoMap = new Map(
		assetEntries.map((entry) => [
			JSON.stringify(entry.keyArgs[0]),
			entry.value,
		]),
	);

	const tokens: TokenForeignAsset[] = [];

	for (const entry of metadataEntries) {
		const location = entry.keyArgs[0];
		const metadata = entry.value;
		const assetInfo = assetInfoMap.get(JSON.stringify(location));

		// Skip if no metadata or frozen
		if (!metadata || assetInfo?.status.type === "Frozen") continue;

		const id = getTokenId({ type: "foreign-asset", chainId, location });

		tokens.push({
			id,
			type: "foreign-asset",
			chainId,
			location,
			decimals: metadata.decimals,
			symbol: metadata.symbol.asText(),
			name: metadata.name.asText(),
			verified: false,
			isSufficient: assetInfo?.is_sufficient ?? false,
		});
	}

	return tokens;
};

/**
 * Fetch all pool asset tokens from chain
 * Pool assets have minimal metadata (no name/symbol on chain)
 */
const fetchPoolAssetTokensFromChain = async (
	chainId: ChainId,
): Promise<TokenPoolAsset[]> => {
	const api = await getApi(chainId);

	const assetEntries = await api.query.PoolAssets.Asset.getEntries({
		at: "best",
	});

	const tokens: TokenPoolAsset[] = [];

	for (const entry of assetEntries) {
		const poolAssetId = entry.keyArgs[0];

		const id = getTokenId({ type: "pool-asset", chainId, poolAssetId });

		tokens.push({
			id,
			type: "pool-asset",
			chainId,
			poolAssetId,
			decimals: 0, // Pool assets don't have metadata
			symbol: `LP-${poolAssetId}`,
			name: `Liquidity Pool ${poolAssetId}`,
			verified: undefined,
			isSufficient: false,
		});
	}

	return tokens;
};

/**
 * Fetch all tokens from chain (assets + foreign assets + pool assets)
 * Native tokens are not fetched - they come from registry
 */
export const fetchTokensFromChain$ = (
	chainId: ChainId,
): Observable<Token[]> => {
	return from(
		Promise.all([
			fetchAssetTokensFromChain(chainId),
			fetchForeignAssetTokensFromChain(chainId),
			fetchPoolAssetTokensFromChain(chainId),
		]).then(([assets, foreignAssets, poolAssets]) => [
			...assets,
			...foreignAssets,
			...poolAssets,
		]),
	).pipe(
		catchError((err) => {
			// Ensure error message is extracted properly
			const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
			logger.error(`Failed to fetch tokens from chain ${chainId}: ${errorMsg}`);
			return of([]);
		}),
		shareReplay({ bufferSize: 1, refCount: true }),
	);
};

/**
 * Fetch specific tokens by their IDs from chain
 * Used for on-demand fetching when pools reference unknown tokens
 */
export const fetchTokensByIds = async (
	chainId: ChainId,
	tokenIds: TokenId[],
): Promise<Token[]> => {
	const api = await getApi(chainId);
	const tokens: Token[] = [];

	for (const tokenId of tokenIds) {
		try {
			const parsed = parseTokenId(tokenId);

			if (parsed.type === "asset") {
				const [metadata, asset] = await Promise.all([
					api.query.Assets.Metadata.getValue(parsed.assetId, { at: "best" }),
					api.query.Assets.Asset.getValue(parsed.assetId, { at: "best" }),
				]);

				if (metadata && asset) {
					tokens.push({
						id: tokenId,
						type: "asset",
						chainId,
						assetId: parsed.assetId,
						decimals: metadata.decimals,
						symbol: metadata.symbol.asText(),
						name: metadata.name.asText(),
						verified: false,
						isSufficient: asset.is_sufficient,
					});
				}
			} else if (parsed.type === "foreign-asset") {
				const [metadata, asset] = await Promise.all([
					api.query.ForeignAssets.Metadata.getValue(parsed.location, {
						at: "best",
					}),
					api.query.ForeignAssets.Asset.getValue(parsed.location, {
						at: "best",
					}),
				]);

				if (metadata && asset) {
					tokens.push({
						id: tokenId,
						type: "foreign-asset",
						chainId,
						location: parsed.location,
						decimals: metadata.decimals,
						symbol: metadata.symbol.asText(),
						name: metadata.name.asText(),
						verified: false,
						isSufficient: asset.is_sufficient,
					});
				}
			} else if (parsed.type === "pool-asset") {
				const asset = await api.query.PoolAssets.Asset.getValue(
					parsed.poolAssetId,
					{ at: "best" },
				);

				if (asset) {
					tokens.push({
						id: tokenId,
						type: "pool-asset",
						chainId,
						poolAssetId: parsed.poolAssetId,
						decimals: 0,
						symbol: `LP-${parsed.poolAssetId}`,
						name: `Liquidity Pool ${parsed.poolAssetId}`,
						verified: undefined,
						isSufficient: false,
					});
				}
			}
			// Native tokens are not fetched from chain - they come from registry
		} catch (err) {
			logger.warn(`Failed to fetch token ${tokenId} from chain`, { err });
		}
	}

	return tokens;
};

// Accumulator for batching requests per chain
const pendingRequests = new Map<
	ChainId,
	{
		tokenIds: Set<TokenId>;
		resolvers: Array<(tokens: Token[]) => void>;
	}
>();

/**
 * Request tokens to be fetched on-demand with batching
 * Multiple requests within 100ms are batched together
 */
export const requestTokensFetch = (
	chainId: ChainId,
	tokenIds: TokenId[],
): Promise<Token[]> => {
	return new Promise((resolve) => {
		let pending = pendingRequests.get(chainId);
		if (!pending) {
			pending = { tokenIds: new Set(), resolvers: [] };
			pendingRequests.set(chainId, pending);

			// Schedule the batch fetch
			setTimeout(async () => {
				const batch = pendingRequests.get(chainId);
				pendingRequests.delete(chainId);

				if (batch && batch.tokenIds.size > 0) {
					try {
						const tokens = await fetchTokensByIds(
							chainId,
							Array.from(batch.tokenIds),
						);
						// Resolve all pending promises with the fetched tokens
						for (const resolver of batch.resolvers) {
							resolver(tokens);
						}
					} catch (err) {
						logger.error(`Batch token fetch failed for ${chainId}`, { err });
						for (const resolver of batch.resolvers) {
							resolver([]);
						}
					}
				}
			}, 100);
		}

		for (const id of tokenIds) {
			pending.tokenIds.add(id);
		}
		pending.resolvers.push(resolve);
	});
};
