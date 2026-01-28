import { execSync } from "node:child_process";
import {
	type Chain,
	type ChainId,
	getChainById,
	getTokenId,
} from "@kheopswap/registry";
import { safeStringify } from "@kheopswap/utils";
import { getApi } from "./getApi";
import {
	getKnownTokensMap,
	getTokenOverridesMap,
	type KnownToken,
	type TokenOverride,
} from "./known";
import type {
	DirectoryToken,
	DirectoryTokenAsset,
	DirectoryTokenForeignAsset,
	DirectoryTokenNative,
	DirectoryTokenPoolAsset,
} from "./types";

/**
 * Get current git branch name
 */
const getCurrentBranch = (): string => {
	try {
		return execSync("git rev-parse --abbrev-ref HEAD", {
			encoding: "utf-8",
		}).trim();
	} catch {
		return "main";
	}
};

const CURRENT_BRANCH = getCurrentBranch();
const LOGOS_BASE_URL = `https://raw.githubusercontent.com/kheopswap/kheopswap/${CURRENT_BRANCH}/directory/logos`;

const DEFAULT_ASSET_LOGO = `${LOGOS_BASE_URL}/asset.svg`;
const DEFAULT_UNKNOWN_LOGO = `${LOGOS_BASE_URL}/unknown.svg`;

/**
 * Convert a local logo path to a GitHub raw URL
 */
const resolveLogoUrl = (logo: string | undefined): string => {
	if (!logo) return DEFAULT_UNKNOWN_LOGO;

	// If already a URL, return as is
	if (logo.startsWith("http://") || logo.startsWith("https://")) {
		return logo;
	}

	// Convert ./img/tokens/XXX.ext to GitHub raw URL
	// Handle paths like "./img/tokens/USDC.webp" or "./img/tokens/USDC.webp?rounded"
	const match = logo.match(/\.\/img\/tokens\/(.+)/);
	if (match) {
		return `${LOGOS_BASE_URL}/${match[1]}`;
	}

	return DEFAULT_UNKNOWN_LOGO;
};

/**
 * Get native token for a chain from known tokens
 */
export const getNativeToken = (
	chain: Chain,
	knownTokensMap: Record<string, KnownToken>,
): DirectoryTokenNative | null => {
	const tokenId = getTokenId({ type: "native", chainId: chain.id });
	const knownToken = knownTokensMap[tokenId];

	if (!knownToken || knownToken.type !== "native") {
		console.warn(`No native token defined for chain ${chain.id}`);
		return null;
	}

	return {
		id: tokenId,
		type: "native",
		chainId: chain.id,
		decimals: knownToken.decimals,
		symbol: knownToken.symbol,
		name: knownToken.name,
		logo: resolveLogoUrl(knownToken.logo),
		verified: true,
		isSufficient: true,
	};
};

/**
 * Fetch all asset tokens from chain
 */
export const fetchAssetTokens = async (
	chain: Chain,
	knownTokensMap: Record<string, KnownToken>,
	overridesMap: Record<string, TokenOverride>,
): Promise<DirectoryTokenAsset[]> => {
	const api = await getApi(chain.id);
	await api.waitReady;

	console.log(`Fetching asset tokens for ${chain.id}...`);

	const metadataEntries = await api.query.Assets.Metadata.getEntries({
		at: "best",
	});

	const assetEntries = await api.query.Assets.Asset.getEntries({
		at: "best",
	});

	// Create a map of assetId to asset info for quick lookup
	const assetInfoMap = new Map<number, { isSufficient: boolean }>();
	for (const entry of assetEntries) {
		assetInfoMap.set(entry.keyArgs[0], {
			isSufficient: entry.value.is_sufficient,
		});
	}

	const tokens: DirectoryTokenAsset[] = [];

	for (const entry of metadataEntries) {
		const assetId = entry.keyArgs[0];
		const metadata = entry.value;

		const tokenId = getTokenId({
			type: "asset",
			chainId: chain.id,
			assetId,
		});

		const knownToken = knownTokensMap[tokenId];
		const override = overridesMap[tokenId];
		const assetInfo = assetInfoMap.get(assetId);

		// Base token from on-chain data
		const baseToken: DirectoryTokenAsset = {
			id: tokenId,
			type: "asset",
			chainId: chain.id,
			assetId,
			symbol: metadata.symbol.asText(),
			decimals: metadata.decimals,
			name: metadata.name.asText(),
			logo: DEFAULT_ASSET_LOGO,
			verified: false,
			isSufficient: assetInfo?.isSufficient ?? false,
		};

		// Merge with known token (fully verified tokens)
		if (knownToken && knownToken.type === "asset") {
			baseToken.symbol = knownToken.symbol;
			baseToken.name = knownToken.name;
			baseToken.decimals = knownToken.decimals;
			baseToken.logo = resolveLogoUrl(knownToken.logo);
			baseToken.verified = true;
			baseToken.isSufficient =
				knownToken.isSufficient ?? baseToken.isSufficient;
		}

		// Apply overrides (partial updates like logo only)
		if (override) {
			if (override.logo) baseToken.logo = resolveLogoUrl(override.logo);
			if (override.symbol) baseToken.symbol = override.symbol;
			if (override.name) baseToken.name = override.name;
			if (override.decimals !== undefined)
				baseToken.decimals = override.decimals;
			if (override.verified !== undefined)
				baseToken.verified = override.verified;
		}

		tokens.push(baseToken);
	}

	console.log(`Found ${tokens.length} asset tokens for ${chain.id}`);
	return tokens;
};

/**
 * Fetch all pool asset tokens from chain
 */
export const fetchPoolAssetTokens = async (
	chain: Chain,
): Promise<DirectoryTokenPoolAsset[]> => {
	const api = await getApi(chain.id);
	await api.waitReady;

	console.log(`Fetching pool asset tokens for ${chain.id}...`);

	const entries = await api.query.PoolAssets.Asset.getEntries({
		at: "best",
	});

	const tokens: DirectoryTokenPoolAsset[] = entries.map((entry) => {
		const poolAssetId = entry.keyArgs[0];
		const tokenId = getTokenId({
			type: "pool-asset",
			chainId: chain.id,
			poolAssetId,
		});

		return {
			id: tokenId,
			type: "pool-asset",
			chainId: chain.id,
			poolAssetId,
			symbol: "",
			decimals: 0,
			name: "",
			logo: "",
			verified: false,
			isSufficient: false,
		};
	});

	console.log(`Found ${tokens.length} pool asset tokens for ${chain.id}`);
	return tokens;
};

/**
 * Fetch all foreign asset tokens from chain
 */
export const fetchForeignAssetTokens = async (
	chain: Chain,
	knownTokensMap: Record<string, KnownToken>,
	overridesMap: Record<string, TokenOverride>,
): Promise<DirectoryTokenForeignAsset[]> => {
	const api = await getApi(chain.id);
	await api.waitReady;

	console.log(`Fetching foreign asset tokens for ${chain.id}...`);

	const [assetEntries, metadataEntries] = await Promise.all([
		api.query.ForeignAssets.Asset.getEntries({ at: "best" }),
		api.query.ForeignAssets.Metadata.getEntries({ at: "best" }),
	]);

	const tokens: DirectoryTokenForeignAsset[] = [];

	for (const assetEntry of assetEntries) {
		const location = assetEntry.keyArgs[0];

		const tokenId = getTokenId({
			type: "foreign-asset",
			chainId: chain.id,
			location,
		});

		// Find matching metadata
		const metadataEntry = metadataEntries.find(
			(m) => safeStringify(m.keyArgs[0]) === safeStringify(location),
		);

		const metadata = metadataEntry?.value;
		const knownToken = knownTokensMap[tokenId];
		const override = overridesMap[tokenId];

		// Skip tokens without metadata unless they're known tokens
		if (!metadata && !knownToken && !override) {
			console.warn(`No metadata found for foreign asset: ${tokenId}`);
			continue;
		}

		const baseToken: DirectoryTokenForeignAsset = {
			id: tokenId,
			type: "foreign-asset",
			chainId: chain.id,
			location,
			symbol: metadata?.symbol.asText() ?? "",
			decimals: metadata?.decimals ?? 0,
			name: metadata?.name.asText() ?? "",
			logo: DEFAULT_ASSET_LOGO,
			verified: false,
			isSufficient: false,
		};

		// Merge with known token
		if (knownToken && knownToken.type === "foreign-asset") {
			baseToken.symbol = knownToken.symbol;
			baseToken.name = knownToken.name;
			baseToken.decimals = knownToken.decimals;
			baseToken.logo = resolveLogoUrl(knownToken.logo);
			baseToken.verified = true;
			baseToken.isSufficient = knownToken.isSufficient ?? false;
		}

		// Apply overrides
		if (override) {
			if (override.logo) baseToken.logo = resolveLogoUrl(override.logo);
			if (override.symbol) baseToken.symbol = override.symbol;
			if (override.name) baseToken.name = override.name;
			if (override.decimals !== undefined)
				baseToken.decimals = override.decimals;
			if (override.verified !== undefined)
				baseToken.verified = override.verified;
		}

		// Skip tokens without valid metadata
		if (
			!baseToken.symbol ||
			typeof baseToken.decimals !== "number" ||
			!baseToken.name
		) {
			console.warn(`Incomplete metadata for foreign asset: ${tokenId}`, {
				symbol: baseToken.symbol,
				decimals: baseToken.decimals,
				name: baseToken.name,
			});
			continue;
		}

		tokens.push(baseToken);
	}

	console.log(`Found ${tokens.length} foreign asset tokens for ${chain.id}`);
	return tokens;
};

/**
 * Fetch all tokens for a chain
 */
export const fetchAllTokens = async (
	chainId: ChainId,
): Promise<DirectoryToken[]> => {
	const chain = getChainById(chainId);
	const knownTokensMap = getKnownTokensMap();
	const overridesMap = getTokenOverridesMap();

	const tokens: DirectoryToken[] = [];

	// Add native token
	const nativeToken = getNativeToken(chain, knownTokensMap);
	if (nativeToken) {
		tokens.push(nativeToken);
	}

	// Fetch all token types in parallel
	const [assetTokens, poolAssetTokens, foreignAssetTokens] = await Promise.all([
		fetchAssetTokens(chain, knownTokensMap, overridesMap),
		fetchPoolAssetTokens(chain),
		fetchForeignAssetTokens(chain, knownTokensMap, overridesMap),
	]);

	tokens.push(...assetTokens, ...poolAssetTokens, ...foreignAssetTokens);

	console.log(`Total tokens for ${chainId}: ${tokens.length}`);
	return tokens;
};
