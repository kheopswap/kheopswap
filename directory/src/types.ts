import type {
	ChainId,
	Token,
	TokenAsset,
	TokenForeignAsset,
	TokenIdsPair,
	TokenNative,
	TokenPoolAsset,
} from "@kheopswap/registry";
import type { SS58String } from "polkadot-api";

/**
 * Directory output schema v1
 * Contains all tokens and pools for a single chain
 *
 * NOTE: These types are used for directory GENERATION only.
 * The generated JSON files are fetched at runtime and typed using
 * @kheopswap/registry types directly - there are NO runtime imports
 * from this package to avoid triggering Cloudflare rebuilds.
 */

// Re-export registry token types for use in generation scripts
export type DirectoryTokenNative = TokenNative;
export type DirectoryTokenAsset = TokenAsset;
export type DirectoryTokenPoolAsset = TokenPoolAsset;
export type DirectoryTokenForeignAsset = TokenForeignAsset;
export type DirectoryToken = Token;

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
	tokens: DirectoryToken[];
	pools: DirectoryPool[];
};
