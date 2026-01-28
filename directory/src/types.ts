import type { ChainId, TokenIdsPair } from "@kheopswap/registry";
import type { SS58String } from "polkadot-api";

/**
 * Directory output schema v1
 * Contains all tokens and pools for a single chain
 */

// Token types matching @kheopswap/registry Token types
export type DirectoryTokenNative = {
	id: string;
	type: "native";
	chainId: ChainId;
	decimals: number;
	symbol: string;
	name: string;
	logo?: string;
	verified: true;
	isSufficient: true;
};

export type DirectoryTokenAsset = {
	id: string;
	type: "asset";
	chainId: ChainId;
	decimals: number;
	symbol: string;
	name: string;
	logo?: string;
	assetId: number;
	verified: boolean;
	isSufficient: boolean;
};

export type DirectoryTokenPoolAsset = {
	id: string;
	type: "pool-asset";
	chainId: ChainId;
	decimals: number;
	symbol: string;
	name: string;
	logo?: string;
	poolAssetId: number;
	verified: false;
	isSufficient: false;
};

export type DirectoryTokenForeignAsset = {
	id: string;
	type: "foreign-asset";
	chainId: ChainId;
	decimals: number;
	symbol: string;
	name: string;
	logo?: string;
	location: unknown; // XcmV5Multilocation - stored as JSON
	verified: boolean;
	isSufficient: boolean;
};

export type DirectoryToken =
	| DirectoryTokenNative
	| DirectoryTokenAsset
	| DirectoryTokenPoolAsset
	| DirectoryTokenForeignAsset;

// Pool type matching @kheopswap/services AssetConvertionPoolDef
export type DirectoryPool = {
	type: "asset-convertion";
	chainId: ChainId;
	poolAssetId: number;
	tokenIds: TokenIdsPair;
	owner: SS58String;
};

// The output schema for each chain's JSON file
export type DirectoryChainData = {
	chainId: ChainId;
	generatedAt: string; // ISO timestamp
	tokens: DirectoryToken[];
	pools: DirectoryPool[];
};
