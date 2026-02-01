import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import {
	type Chain,
	type ChainId,
	getChainById,
	getTokenId,
} from "@kheopswap/registry";
import { isBinary, safeStringify } from "@kheopswap/utils";
import { ChaindataProvider, type Token } from "@talismn/chaindata-provider";
import { filter, firstValueFrom } from "rxjs";
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
 * Map our chain IDs to Talisman chaindata network IDs
 */
const CHAIN_ID_TO_NETWORK_ID: Record<string, string> = {
	pah: "polkadot-asset-hub",
	kah: "kusama-asset-hub",
	pasah: "paseo-asset-hub",
};

/**
 * Singleton ChaindataProvider instance for fetching token metadata
 */
let chaindataProvider: ChaindataProvider | null = null;

/**
 * Get or create the ChaindataProvider instance
 */
const getChaindataProvider = (): ChaindataProvider => {
	if (!chaindataProvider) {
		chaindataProvider = new ChaindataProvider();
	}
	return chaindataProvider;
};

/**
 * Token info from Talisman chaindata
 */
type ChaindataTokenInfo = {
	symbol: string;
	name: string;
	decimals: number;
	logo?: string;
	coingeckoId?: string;
};

/**
 * Caches for chaindata token lookups
 */
let chaindataErc20Cache: Map<string, ChaindataTokenInfo> | null = null;
let chaindataNativeCache: Map<string, ChaindataTokenInfo> | null = null;
let chaindataAssetsCache: Map<string, ChaindataTokenInfo> | null = null;
let chaindataForeignAssetsCache: Map<string, ChaindataTokenInfo> | null = null;

/**
 * Directory for downloaded logos
 */
const LOGOS_DIR = path.join(import.meta.dirname, "..", "logos");

/**
 * Downloaded logos cache to avoid re-downloading
 */
const downloadedLogos = new Set<string>();

/**
 * Download a logo from a URL and save it locally
 * Returns the local filename or undefined if download failed
 */
const downloadLogo = async (
	logoUrl: string,
	filename: string,
): Promise<string | undefined> => {
	if (downloadedLogos.has(filename)) {
		return filename;
	}

	const localPath = path.join(LOGOS_DIR, filename);

	// Check if file already exists
	if (fs.existsSync(localPath)) {
		downloadedLogos.add(filename);
		return filename;
	}

	try {
		const response = await fetch(logoUrl);
		if (!response.ok) {
			return undefined;
		}

		const buffer = await response.arrayBuffer();

		// Ensure logos directory exists
		if (!fs.existsSync(LOGOS_DIR)) {
			fs.mkdirSync(LOGOS_DIR, { recursive: true });
		}

		fs.writeFileSync(localPath, Buffer.from(buffer));
		downloadedLogos.add(filename);
		console.log(`  Downloaded logo: ${filename}`);
		return filename;
	} catch (error) {
		console.warn(`  Failed to download logo from ${logoUrl}:`, error);
		return undefined;
	}
};

/**
 * Build caches of chaindata tokens for quick lookup
 */
const buildChaindataCaches = async (): Promise<void> => {
	if (chaindataErc20Cache) {
		return; // Already built
	}

	const provider = getChaindataProvider();

	console.log("Chaindata: Fetching token data from GitHub...");
	const tokens = await firstValueFrom(
		provider.tokens$.pipe(filter((t: Token[]) => t.length > 0)),
	);

	console.log(`Chaindata: Loaded ${tokens.length} total tokens`);

	chaindataErc20Cache = new Map();
	chaindataNativeCache = new Map();
	chaindataAssetsCache = new Map();
	chaindataForeignAssetsCache = new Map();

	for (const token of tokens) {
		const info: ChaindataTokenInfo = {
			symbol: token.symbol,
			name: token.name ?? token.symbol,
			decimals: token.decimals,
			logo: token.logo,
			coingeckoId: token.coingeckoId,
		};

		// Index ERC20 tokens by their contract address (lowercase)
		if (token.type === "evm-erc20" && "contractAddress" in token) {
			const key = token.contractAddress.toLowerCase();
			chaindataErc20Cache.set(key, info);
		}

		// Index native tokens by network ID
		if (token.type === "substrate-native") {
			chaindataNativeCache.set(token.networkId, info);
		}

		// Index asset tokens by networkId:assetId
		if (token.type === "substrate-assets" && "assetId" in token) {
			const key = `${token.networkId}:${token.assetId}`;
			chaindataAssetsCache.set(key, info);
		}

		// Index foreign asset tokens by networkId:onChainId
		if (token.type === "substrate-foreignassets" && "onChainId" in token) {
			const key = `${token.networkId}:${token.onChainId}`;
			chaindataForeignAssetsCache.set(key, info);
		}
	}

	console.log(
		`Chaindata: Cached ${chaindataErc20Cache.size} ERC20, ${chaindataNativeCache.size} native, ${chaindataAssetsCache.size} assets, ${chaindataForeignAssetsCache.size} foreign assets`,
	);
};

/**
 * Look up ERC20 token info from chaindata by contract address
 */
const lookupErc20Token = async (
	contractAddress: string,
): Promise<ChaindataTokenInfo | undefined> => {
	await buildChaindataCaches();
	return chaindataErc20Cache?.get(contractAddress.toLowerCase());
};

/**
 * Look up native token info from chaindata by our chain ID
 */
const lookupNativeToken = async (
	chainId: ChainId,
): Promise<ChaindataTokenInfo | undefined> => {
	await buildChaindataCaches();
	const networkId = CHAIN_ID_TO_NETWORK_ID[chainId];
	if (!networkId) return undefined;
	return chaindataNativeCache?.get(networkId);
};

/**
 * Look up asset token info from chaindata by our chain ID and asset ID
 */
const lookupAssetToken = async (
	chainId: ChainId,
	assetId: number,
): Promise<ChaindataTokenInfo | undefined> => {
	await buildChaindataCaches();
	const networkId = CHAIN_ID_TO_NETWORK_ID[chainId];
	if (!networkId) return undefined;
	return chaindataAssetsCache?.get(`${networkId}:${assetId}`);
};

/**
 * Look up foreign asset token info from chaindata by our chain ID and on-chain ID
 */
const lookupForeignAssetToken = async (
	chainId: ChainId,
	onChainId: string,
): Promise<ChaindataTokenInfo | undefined> => {
	await buildChaindataCaches();
	const networkId = CHAIN_ID_TO_NETWORK_ID[chainId];
	if (!networkId) return undefined;
	return chaindataForeignAssetsCache?.get(`${networkId}:${onChainId}`);
};

/**
 * Get logo URL from chaindata, downloading if necessary
 * Returns a local path or the original URL
 */
const getLogoFromChaindata = async (
	chaindataInfo: ChaindataTokenInfo | undefined,
	fallbackFilename: string,
): Promise<string | undefined> => {
	if (!chaindataInfo?.logo) return undefined;

	// Determine filename from URL
	const urlParts = chaindataInfo.logo.split("/");
	const originalFilename = urlParts[urlParts.length - 1] ?? "";
	const ext = path.extname(originalFilename) || ".svg";
	const filename = `${fallbackFilename}${ext}`;

	const downloaded = await downloadLogo(chaindataInfo.logo, filename);
	return downloaded;
};

/**
 * Extract Ethereum chain ID and contract address from XCM location
 * Returns null if the location is not an Ethereum-based foreign asset
 */
const extractEthereumTokenInfo = (
	location: unknown,
): { chainId: number; contractAddress: string } | null => {
	try {
		const loc = location as {
			parents?: number;
			interior?: {
				type?: string;
				value?: Array<{
					type?: string;
					value?: unknown;
				}>;
			};
		};

		// Check if it's a GlobalConsensus Ethereum location with AccountKey20
		// Structure: { parents: 2, interior: { type: "X2", value: [GlobalConsensus(Ethereum), AccountKey20] } }
		if (
			loc?.parents === 2 &&
			loc?.interior?.type === "X2" &&
			Array.isArray(loc?.interior?.value) &&
			loc.interior.value.length === 2
		) {
			const [junction0, junction1] = loc.interior.value;

			// First junction should be GlobalConsensus with Ethereum
			if (junction0?.type === "GlobalConsensus") {
				const globalConsensusValue = junction0.value as
					| { type?: string; value?: { chain_id?: bigint | string } }
					| undefined;

				if (globalConsensusValue?.type === "Ethereum") {
					// Extract chain ID - handle both bigint (PAPI) and string formats
					const chainIdValue = globalConsensusValue.value?.chain_id;
					const chainId =
						typeof chainIdValue === "bigint"
							? Number(chainIdValue)
							: typeof chainIdValue === "string"
								? Number(chainIdValue)
								: null;

					// Second junction should be AccountKey20
					const accountKey20Value = junction1?.value as
						| { key?: unknown }
						| undefined;
					if (
						junction1?.type === "AccountKey20" &&
						accountKey20Value &&
						"key" in accountKey20Value &&
						chainId !== null
					) {
						const key = accountKey20Value.key;
						// Handle both Binary (PAPI) and string (JSON) formats
						const contractAddress = isBinary(key) ? key.asHex() : String(key);
						return { chainId, contractAddress };
					}
				}
			}
		}

		return null;
	} catch {
		return null;
	}
};

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

/**
 * Convert a local logo path to a GitHub raw URL
 * Returns undefined if no logo is available (frontend will use fallback)
 */
const resolveLogoUrl = (logo: string | undefined): string | undefined => {
	if (!logo) return undefined;

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

	return undefined;
};

/**
 * Get native token for a chain from known tokens
 */
export const getNativeToken = async (
	chain: Chain,
	knownTokensMap: Record<string, KnownToken>,
): Promise<DirectoryTokenNative | null> => {
	const tokenId = getTokenId({ type: "native", chainId: chain.id });
	const knownToken = knownTokensMap[tokenId];

	if (!knownToken || knownToken.type !== "native") {
		console.warn(`No native token defined for chain ${chain.id}`);
		return null;
	}

	let logo = resolveLogoUrl(knownToken.logo);

	// Try to get logo from chaindata if not available locally
	if (!logo) {
		const chaindataInfo = await lookupNativeToken(chain.id);
		const chaindataLogo = await getLogoFromChaindata(
			chaindataInfo,
			`${chain.id}-native`,
		);
		if (chaindataLogo) {
			logo = `${LOGOS_BASE_URL}/${chaindataLogo}`;
		}
	}

	const token: DirectoryTokenNative = {
		id: tokenId,
		type: "native",
		chainId: chain.id,
		decimals: knownToken.decimals,
		symbol: knownToken.symbol,
		name: knownToken.name,
		verified: undefined,
		isSufficient: true,
	};
	if (logo) token.logo = logo;

	return token;
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

		// Base token from on-chain data (no logo - frontend will use fallback)
		const baseToken: DirectoryTokenAsset = {
			id: tokenId,
			type: "asset",
			chainId: chain.id,
			assetId,
			symbol: metadata.symbol.asText(),
			decimals: metadata.decimals,
			name: metadata.name.asText(),
			verified: false,
			isSufficient: assetInfo?.isSufficient ?? false,
		};

		// Merge with known token (fully verified tokens)
		if (knownToken && knownToken.type === "asset") {
			baseToken.symbol = knownToken.symbol;
			baseToken.name = knownToken.name;
			baseToken.decimals = knownToken.decimals;
			const logo = resolveLogoUrl(knownToken.logo);
			if (logo) baseToken.logo = logo;
			baseToken.verified = true;
			baseToken.isSufficient =
				knownToken.isSufficient ?? baseToken.isSufficient;
		}

		// Apply overrides (partial updates like logo only)
		if (override) {
			const logo = resolveLogoUrl(override.logo);
			if (logo) baseToken.logo = logo;
			if (override.symbol) baseToken.symbol = override.symbol;
			if (override.name) baseToken.name = override.name;
			if (override.decimals !== undefined)
				baseToken.decimals = override.decimals;
			if (override.verified !== undefined)
				baseToken.verified = override.verified;
		}

		// Try to get logo from chaindata if not available locally
		if (!baseToken.logo) {
			const chaindataInfo = await lookupAssetToken(chain.id, assetId);
			const chaindataLogo = await getLogoFromChaindata(
				chaindataInfo,
				`${chain.id}-asset-${assetId}`,
			);
			if (chaindataLogo) {
				baseToken.logo = `${LOGOS_BASE_URL}/${chaindataLogo}`;
			}
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
			verified: undefined,
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
			verified: false,
			isSufficient: false,
		};

		// For Ethereum-based tokens, fetch info from Talisman chaindata
		// This provides more accurate metadata than on-chain data for Snowbridge tokens
		const ethInfo = extractEthereumTokenInfo(location);
		if (ethInfo) {
			const tokenInfo = await lookupErc20Token(ethInfo.contractAddress);
			if (tokenInfo) {
				baseToken.symbol = tokenInfo.symbol || baseToken.symbol;
				baseToken.name = tokenInfo.name || baseToken.name;
				baseToken.decimals =
					tokenInfo.decimals !== undefined
						? tokenInfo.decimals
						: baseToken.decimals;
				console.log(
					`  Chaindata: Found ${tokenInfo.symbol} (${tokenInfo.name})`,
				);
			}
		}

		// Merge with known token (overrides Etherscan data)
		if (knownToken && knownToken.type === "foreign-asset") {
			baseToken.symbol = knownToken.symbol;
			baseToken.name = knownToken.name;
			baseToken.decimals = knownToken.decimals;
			const logo = resolveLogoUrl(knownToken.logo);
			if (logo) baseToken.logo = logo;
			baseToken.verified = true;
			baseToken.isSufficient = knownToken.isSufficient ?? false;
		}

		// Apply overrides (highest priority)
		if (override) {
			const logo = resolveLogoUrl(override.logo);
			if (logo) baseToken.logo = logo;
			if (override.symbol) baseToken.symbol = override.symbol;
			if (override.name) baseToken.name = override.name;
			if (override.decimals !== undefined)
				baseToken.decimals = override.decimals;
			if (override.verified !== undefined)
				baseToken.verified = override.verified;
		}

		// Try to get logo from chaindata if not available locally
		if (!baseToken.logo) {
			// For Ethereum tokens, try ERC20 lookup
			if (ethInfo) {
				const tokenInfo = await lookupErc20Token(ethInfo.contractAddress);
				const chaindataLogo = await getLogoFromChaindata(
					tokenInfo,
					`${chain.id}-foreign-${ethInfo.contractAddress.toLowerCase().slice(2, 10)}`,
				);
				if (chaindataLogo) {
					baseToken.logo = `${LOGOS_BASE_URL}/${chaindataLogo}`;
				}
			} else {
				// For non-Ethereum foreign assets, try foreign asset lookup by on-chain ID
				const onChainIdStr = safeStringify(location);
				const chaindataInfo = await lookupForeignAssetToken(
					chain.id,
					onChainIdStr,
				);
				const chaindataLogo = await getLogoFromChaindata(
					chaindataInfo,
					`${chain.id}-foreign-${baseToken.symbol.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
				);
				if (chaindataLogo) {
					baseToken.logo = `${LOGOS_BASE_URL}/${chaindataLogo}`;
				}
			}
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
	const nativeToken = await getNativeToken(chain, knownTokensMap);
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
