import lzs from "lz-string";
import { getBlockExplorerUrl } from "../../utils/getBlockExplorerUrl";
import { safeParse, safeStringify } from "../../utils/serialization";
import {
	getChainById,
	isChainIdAssetHub,
	isChainIdHydration,
} from "../chains/chains";
import type {
	ChainId,
	ChainIdAssetHub,
	ChainIdHydration,
} from "../chains/types";
import {
	getEvmNetworkById,
	getEvmNetworkName,
} from "../evmNetworks/evmNetworks";
import { getParachainName } from "../parachains/parachains";
import type { XcmV5Multilocation } from "../types/xcm";
import type {
	Token,
	TokenId,
	TokenIdAsset,
	TokenIdForeignAsset,
	TokenIdHydrationAsset,
	TokenIdNative,
	TokenIdPoolAsset,
	TokenType,
	TokenTypeAsset,
	TokenTypeForeignAsset,
	TokenTypeHydrationAsset,
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

const narrowChainId = <Id extends ChainId>(
	chainId: ChainId,
	isChainIdOfKind: (id: unknown) => id is Id,
	tokenType: TokenType,
): Id => {
	if (!isChainIdOfKind(chainId))
		throw new Error(`Unsupported chain id for ${tokenType}: ${chainId}`);
	return chainId;
};

const parseNumericId = (value: string | undefined, label: string) => {
	const id = Number(value);
	if (Number.isNaN(id)) throw new Error(`Invalid ${label}`);
	return id;
};

export const parseTokenId = (
	tokenId: TokenId,
):
	| { type: "native"; chainId: ChainId }
	| { type: "asset"; chainId: ChainIdAssetHub; assetId: number }
	| { type: "pool-asset"; chainId: ChainIdAssetHub; poolAssetId: number }
	| {
			type: "foreign-asset";
			chainId: ChainIdAssetHub;
			location: XcmV5Multilocation;
	  }
	| { type: "hydration-asset"; chainId: ChainIdHydration; assetId: number } => {
	try {
		const parts = tokenId.split("::");

		const chainId = parts[1] as ChainId;
		if (!getChainById(chainId))
			throw new Error(`Unsupported chain id: ${chainId}`);

		switch (parts[0]) {
			case "native":
				return { type: "native", chainId };
			case "asset":
				return {
					type: "asset",
					chainId: narrowChainId(chainId, isChainIdAssetHub, "asset"),
					assetId: parseNumericId(parts[2], "assetId"),
				};
			case "pool-asset":
				return {
					type: "pool-asset",
					chainId: narrowChainId(chainId, isChainIdAssetHub, "pool-asset"),
					poolAssetId: parseNumericId(parts[2], "poolAssetId"),
				};
			case "foreign-asset": {
				const assetHubChainId = narrowChainId(
					chainId,
					isChainIdAssetHub,
					"foreign-asset",
				);
				if (parts.length < 3) throw new Error("Invalid foreign-asset token id");
				const location = safeParse<XcmV5Multilocation>(
					lzs.decompressFromBase64(parts[2] as string),
				);
				if (
					!location ||
					typeof location !== "object" ||
					typeof location.parents !== "number" ||
					!location.interior
				)
					throw new Error("Invalid multilocation");
				return { type: "foreign-asset", chainId: assetHubChainId, location };
			}
			case "hydration-asset":
				return {
					type: "hydration-asset",
					chainId: narrowChainId(
						chainId,
						isChainIdHydration,
						"hydration-asset",
					),
					assetId: parseNumericId(parts[2], "assetId"),
				};
			default:
				throw new Error(`Unsupported token type: ${tokenId}`);
		}
	} catch (cause) {
		throw new Error(`Failed to parse token id: ${tokenId}`, { cause });
	}
};

type TokenIdTyped<T extends TokenType> = T extends TokenTypeNative
	? TokenIdNative
	: T extends TokenTypeAsset
		? TokenIdAsset
		: T extends TokenTypePoolAsset
			? TokenIdPoolAsset
			: T extends TokenTypeForeignAsset
				? TokenIdForeignAsset
				: T extends TokenTypeHydrationAsset
					? TokenIdHydrationAsset
					: never;

export const getTokenId = <Type extends TokenType, Result = TokenIdTyped<Type>>(
	token:
		| { type: TokenTypeNative; chainId: ChainId }
		| { type: TokenTypeAsset; chainId: ChainIdAssetHub; assetId: number }
		| {
				type: TokenTypePoolAsset;
				chainId: ChainIdAssetHub;
				poolAssetId: number;
		  }
		| {
				type: TokenTypeForeignAsset;
				chainId: ChainIdAssetHub;
				location: unknown;
		  }
		| {
				type: TokenTypeHydrationAsset;
				chainId: ChainIdHydration;
				assetId: number;
		  },
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
		case "hydration-asset":
			return `hydration-asset::${token.chainId}::${token.assetId}` as Result;
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
						value: interior.value[1].value.key,
						format: "address",
						url: getBlockExplorerUrl(
							network?.explorerUrl,
							interior.value[1].value.key,
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
