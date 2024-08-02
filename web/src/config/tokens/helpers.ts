import lzs from "lz-string";
import urlJoin from "url-join";

import {
	Token,
	TokenForeignAsset,
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

import { getParachainName } from "src/config/parachains";
import { XcmV3Multilocation } from "src/types";
import { ChainId, getChainById } from "src/config/chains";
import { safeParse, safeStringify } from "src/util";
import { getEvmNetworkName, getEvmNetworkById } from "src/config/evmNetworks";

export const isTokenIdNative = (
	tokenId: TokenId | null | undefined,
): tokenId is TokenIdNative => {
	if (!tokenId) return false;
	try {
		const parsed = parseTokenId(tokenId);
		return parsed.type === "native";
	} catch (err) {
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
	} catch (err) {
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
			location: XcmV3Multilocation;
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
				if (isNaN(assetId)) throw new Error("Invalid assetId");
				return { type: "asset", chainId, assetId };
			}
			case "pool-asset": {
				const poolAssetId = Number(parts[2]);
				if (isNaN(poolAssetId)) throw new Error("Invalid poolAssetId");
				return { type: "pool-asset", chainId, poolAssetId };
			}
			case "foreign-asset": {
				const location = safeParse<XcmV3Multilocation>(
					lzs.decompressFromBase64(parts[2]),
				);
				return { type: "foreign-asset", chainId, location };
			}
			default:
				throw new Error(`Unsupported token type: ${tokenId}`);
		}
	} catch (err) {
		throw new Error(`Failed to parse token id: ${tokenId}`);
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

export const getChainIdFromTokenId = (
	tokenId: TokenId | null | undefined,
): ChainId | null => {
	if (!tokenId) return null;
	try {
		const parsed = parseTokenId(tokenId);
		return parsed.chainId;
	} catch (err) {
		return null;
	}
};

export type DisplayProperty = {
	label: string;
	value: string;
	format?: "address";
	url?: string;
};

export const getTokenDisplayProperties = (token: Token): DisplayProperty[] => {
	if (token.type === "foreign-asset") {
		const interior = token.location.interior;
		if (interior.type === "X1") {
			if (interior.value.type === "Parachain")
				return [
					{
						label: "Origin",
						value: getParachainName(interior.value.value.toString()),
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
				interior.value[0].type === "GlobalConsensus" &&
				interior.value[0].value.type === "Ethereum" &&
				interior.value[1].type === "AccountKey20"
			) {
				const network = getEvmNetworkById(
					interior.value[0].value.value.chain_id.toString(),
				);
				return [
					{
						label: "Origin",
						value: getEvmNetworkName(
							interior.value[0].value.value.chain_id.toString(),
						),
					},
					{
						label: "Contract address",
						value: interior.value[1].value.key.asHex(),
						format: "address",
						url: network?.explorerUrl
							? urlJoin(
									network.explorerUrl,
									"address",
									interior.value[1].value.key.asHex(),
								)
							: undefined,
					},
				];
			}
		}

		if (interior.type === "X2") {
			if (interior.value[0].type === "Parachain") {
				const network = {
					label: "Origin",
					value: getParachainName(interior.value[0].value.toString()),
				};
				return [network];
			}
		}
	}
	return [];
};
