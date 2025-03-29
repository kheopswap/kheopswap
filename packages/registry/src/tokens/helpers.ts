import lzs from "lz-string";

import type {
	BifrostAssetCurrencyId,
	Token,
	TokenId,
	TokenIdAsset,
	TokenIdBifrostAsset,
	TokenIdForeignAsset,
	TokenIdHydrationAsset,
	TokenIdNative,
	TokenIdPoolAsset,
	TokenType,
	TokenTypeAsset,
	TokenTypeBifrostAsset,
	TokenTypeForeignAsset,
	TokenTypeHydrationAsset,
	TokenTypeNative,
	TokenTypePoolAsset,
} from "./types";

import {
	getBlockExplorerUrl,
	logger,
	safeParse,
	safeStringify,
} from "@kheopswap/utils";

import { type ChainId, getChainById } from "../chains";
import { getEvmNetworkById, getEvmNetworkName } from "../evmNetworks";
import { getParachainName } from "../parachains";
import type { XcmV3Multilocation } from "../types";

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

export type TokenSpec =
	| { type: TokenTypeNative; chainId: ChainId }
	| { type: TokenTypeAsset; chainId: ChainId; assetId: number }
	| { type: TokenTypePoolAsset; chainId: ChainId; poolAssetId: number }
	| {
			type: TokenTypeForeignAsset;
			chainId: ChainId;
			location: XcmV3Multilocation;
	  }
	| {
			type: TokenTypeHydrationAsset;
			chainId: ChainId;
			assetId: number;
	  }
	| {
			type: TokenTypeBifrostAsset;
			chainId: ChainId;
			currencyId: BifrostAssetCurrencyId;
	  };

export type TokenSpecWithId = TokenSpec & { id: TokenId };

export const parseTokenId = (id: TokenId): TokenSpecWithId => {
	try {
		const parts = id.split("::");

		const chainId = parts[1] as ChainId;
		if (!getChainById(chainId))
			throw new Error(`Unsupported chain id: ${chainId}`);

		switch (parts[0]) {
			case "native":
				return { id, type: "native", chainId };
			case "asset": {
				const assetId = Number(parts[2]);
				if (Number.isNaN(assetId)) throw new Error("Invalid assetId");
				return { id, type: "asset", chainId, assetId };
			}
			case "pool-asset": {
				const poolAssetId = Number(parts[2]);
				if (Number.isNaN(poolAssetId)) throw new Error("Invalid poolAssetId");
				return { id, type: "pool-asset", chainId, poolAssetId };
			}
			case "foreign-asset": {
				if (parts.length < 3) throw new Error("Invalid foreign-asset token id");
				const location = safeParse<XcmV3Multilocation>(
					lzs.decompressFromBase64(parts[2] as string),
				);
				return { id, type: "foreign-asset", chainId, location };
			}
			case "hydration-asset": {
				const assetId = Number(parts[2]);
				if (Number.isNaN(assetId)) throw new Error("Invalid assetId");
				return { id, type: "hydration-asset", chainId, assetId };
			}
			case "bifrost-asset": {
				if (parts.length < 3) throw new Error("Invalid bifrost-asset token id");
				const currencyId = safeParse<BifrostAssetCurrencyId>(
					lzs.decompressFromBase64(parts[2] as string),
				);
				return { id, type: "bifrost-asset", chainId, currencyId };
			}
			default:
				throw new Error(`Unsupported token type: ${id}`);
		}
	} catch (cause) {
		logger.error(`Failed to parse token id: ${id}`, { cause });
		throw new Error(`Failed to parse token id: ${id}`, { cause });
	}
};

export const getTokenSpecs = (tokenOrId: Token | TokenId): TokenSpecWithId => {
	return typeof tokenOrId === "string" ? parseTokenId(tokenOrId) : tokenOrId;
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
					: T extends TokenTypeBifrostAsset
						? TokenIdBifrostAsset
						: never;

export const getTokenId = <Type extends TokenType, Result = TokenIdTyped<Type>>(
	token: TokenSpec,
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
		case "bifrost-asset":
			return `bifrost-asset::${token.chainId}::${lzs.compressToBase64(safeStringify(token.currencyId))}` as Result;
		default:
			throw new Error("Unknown token spec");
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
