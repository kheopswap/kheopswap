import {
	getBlockExplorerUrl,
	logger,
	safeParse,
	safeStringify,
} from "@kheopswap/utils";
import lzs from "lz-string";
import { type ChainId, getChainById } from "../chains";
import { getEvmNetworkById, getEvmNetworkName } from "../evmNetworks";
import { getParachainName } from "../parachains";
import type { XcmV5Multilocation } from "../types";
import { toXcmV5Multilocation } from "../utils";
import type {
	Token,
	TokenId,
	TokenIdAsset,
	TokenIdForeignAsset,
	TokenIdNative,
	TokenIdPoolAsset,
	TokenType,
	TokenTypeAsset,
	TokenTypeForeignAsset,
	TokenTypeNative,
	TokenTypePoolAsset,
} from "./types";

export const isTokenIdNative = (
	tokenId: TokenId | null | undefined,
): tokenId is TokenIdNative => {
	if (!tokenId) return false;
	try {
		const parsed = parseTokenId(tokenId);
		return parsed.type === "native";
	} catch (_err) {
		return false;
	}
};

export const isTokenIdAsset = (
	tokenId: TokenId | null | undefined,
): tokenId is TokenIdAsset => {
	if (!tokenId) return false;
	try {
		const parsed = parseTokenId(tokenId);
		return parsed.type === "asset";
	} catch (_err) {
		return false;
	}
};

export const parseTokenId = (
	tokenId: TokenId,
):
	| { type: "native"; chainId: ChainId }
	| { type: "asset"; chainId: ChainId; assetId: number }
	| { type: "pool-asset"; chainId: ChainId; poolAssetId: number }
	| {
			type: "foreign-asset";
			chainId: ChainId;
			location: XcmV5Multilocation;
	  } => {
	try {
		const parts = tokenId.split("::");

		const chainId = parts[1] as ChainId;
		if (!getChainById(chainId))
			throw new Error(`Unsupported chain id: ${chainId}`);

		switch (parts[0]) {
			case "native":
				return { type: "native", chainId };
			case "asset": {
				const assetId = Number(parts[2]);
				if (Number.isNaN(assetId)) throw new Error("Invalid assetId");
				return { type: "asset", chainId, assetId };
			}
			case "pool-asset": {
				const poolAssetId = Number(parts[2]);
				if (Number.isNaN(poolAssetId)) throw new Error("Invalid poolAssetId");
				return { type: "pool-asset", chainId, poolAssetId };
			}
			case "foreign-asset": {
				if (parts.length < 3) throw new Error("Invalid foreign-asset token id");
				const rawLocation = safeParse<unknown>(
					lzs.decompressFromBase64(parts[2] as string),
				);
				const location = normalizeXcmLocation(rawLocation);
				return { type: "foreign-asset", chainId, location };
			}
			default:
				throw new Error(`Unsupported token type: ${tokenId}`);
		}
	} catch (cause) {
		logger.error(`Failed to parse token id: ${tokenId}`, { cause });
		throw new Error(`Failed to parse token id: ${tokenId}`, { cause });
	}
};

const normalizeXcmLocation = (location: unknown): XcmV5Multilocation => {
	if (!location || typeof location !== "object")
		throw new Error("Invalid multilocation");

	const candidate = location as XcmV5Multilocation;
	if (typeof candidate.parents !== "number" || !candidate.interior)
		throw new Error("Invalid multilocation");

	if (isXcmV3Multilocation(location)) return toXcmV5Multilocation(location);

	return candidate;
};

// Detects if a multilocation is in XCM V3 format by checking for deprecated network IDs
// that were removed in V5 (Westend, Rococo, Wococo) anywhere in the junction tree.
// This ensures persisted V3 data from localStorage is properly converted to V5.
const isXcmV3Multilocation = (
	location: unknown,
): location is Parameters<typeof toXcmV5Multilocation>[0] => {
	if (!location || typeof location !== "object") return false;
	const candidate = location as { parents?: unknown; interior?: unknown };
	if (typeof candidate.parents !== "number") return false;
	if (!candidate.interior || typeof candidate.interior !== "object")
		return false;

	const interior = candidate.interior as { type?: string; value?: unknown };
	if (!interior.type) return false;

	// Get all junctions from the interior
	const junctions: unknown[] = [];
	if (interior.type === "Here") {
		// No junctions to check
	} else if (interior.type === "X1") {
		junctions.push(interior.value);
	} else if (Array.isArray(interior.value)) {
		junctions.push(...interior.value);
	}

	// Check if any junction contains a deprecated V3 network ID
	return junctions.some((junction) => hasDeprecatedV3NetworkId(junction));
};

// Checks if a junction contains a deprecated V3 network ID (Westend, Rococo, Wococo)
const hasDeprecatedV3NetworkId = (junction: unknown): boolean => {
	if (!junction || typeof junction !== "object") return false;

	const j = junction as { type?: string; value?: unknown };

	// Check GlobalConsensus junction directly
	if (j.type === "GlobalConsensus") {
		const network = j.value as { type?: string } | undefined;
		return (
			network?.type === "Westend" ||
			network?.type === "Rococo" ||
			network?.type === "Wococo"
		);
	}

	// Check junctions that have a network field (AccountId32, AccountIndex64, AccountKey20)
	if (
		j.type === "AccountId32" ||
		j.type === "AccountIndex64" ||
		j.type === "AccountKey20"
	) {
		const value = j.value as { network?: { type?: string } } | undefined;
		const network = value?.network;
		return (
			network?.type === "Westend" ||
			network?.type === "Rococo" ||
			network?.type === "Wococo"
		);
	}

	return false;
};

type TokenIdTyped<T extends TokenType> = T extends TokenTypeNative
	? TokenIdNative
	: T extends TokenTypeAsset
		? TokenIdAsset
		: T extends TokenTypePoolAsset
			? TokenIdPoolAsset
			: T extends TokenTypeForeignAsset
				? TokenIdForeignAsset
				: never;

export const getTokenId = <Type extends TokenType, Result = TokenIdTyped<Type>>(
	token:
		| { type: TokenTypeNative; chainId: ChainId }
		| { type: TokenTypeAsset; chainId: ChainId; assetId: number }
		| { type: TokenTypePoolAsset; chainId: ChainId; poolAssetId: number }
		| { type: TokenTypeForeignAsset; chainId: ChainId; location: unknown },
): Result => {
	switch (token.type) {
		case "native":
			return `native::${token.chainId}` as Result;
		case "asset":
			return `asset::${token.chainId}::${token.assetId}` as Result;
		case "pool-asset":
			return `pool-asset::${token.chainId}::${token.poolAssetId}` as Result;
		case "foreign-asset":
			return `foreign-asset::${token.chainId}::${lzs.compressToBase64(safeStringify(token.location))}` as Result;
	}
};

type TokenChainId<T extends TokenId | null | undefined> = T extends TokenId
	? ChainId
	: null;

export const getChainIdFromTokenId = <T extends TokenId | null | undefined>(
	tokenId: T,
): TokenChainId<T> => {
	if (!tokenId) return null as TokenChainId<T>;
	try {
		const parsed = parseTokenId(tokenId);
		return parsed.chainId as TokenChainId<T>;
	} catch (_err) {
		return null as TokenChainId<T>;
	}
};

export type DisplayProperty = {
	label: string;
	value: string;
	format?: "address";
	url?: string | null;
};

export const getTokenDisplayProperties = (token: Token): DisplayProperty[] => {
	if (token.type === "foreign-asset") {
		const interior = token.location.interior;
		if (interior.type === "X1") {
			if (interior.value.type === "Parachain")
				return [
					{
						label: "Origin",
						value: getParachainName(
							getChainById(token.chainId).relay,
							interior.value.value.toString(),
						),
					},
				];

			if (interior.value.type === "GlobalConsensus") {
				switch (interior.value.value.type) {
					case "ByFork":
					case "ByGenesis":
					case "PolkadotBulletin":
						return [];
					default:
						return [{ label: "Origin", value: interior.value.value.type }];
				}
			}
		}

		if (interior.type === "X2") {
			if (
				interior.value[0]?.type === "GlobalConsensus" &&
				interior.value[0].value.type === "Ethereum" &&
				interior.value[1]?.type === "AccountKey20"
			) {
				const network = getEvmNetworkById(
					interior.value[0].value.value.chain_id,
				);
				return [
					{
						label: "Origin",
						value: getEvmNetworkName(interior.value[0].value.value.chain_id),
					},
					{
						label: "Contract address",
						value: interior.value[1].value.key.asHex(),
						format: "address",
						url: getBlockExplorerUrl(
							network?.explorerUrl,
							interior.value[1].value.key.asHex(),
							"address",
						),
					},
				];
			}
		}

		if (interior.type === "X2") {
			if (interior.value[0]?.type === "Parachain") {
				const network = {
					label: "Origin",
					value: getParachainName(
						getChainById(token.chainId).relay,
						interior.value[0].value,
					),
				};
				return [network];
			}
		}
	}
	return [];
};
