import type { ChainId, Token, TokenIdsPair } from "@kheopswap/registry";
import type { SS58String } from "polkadot-api";

/**
 * Directory data types matching the output schema from directory/src/types.ts
 * These are duplicated here to avoid circular dependencies between packages
 */

export type DirectoryToken = Token;

export type DirectoryPool = {
	type: "asset-convertion";
	chainId: ChainId;
	poolAssetId: number;
	tokenIds: TokenIdsPair;
	owner: SS58String;
};

export type DirectoryChainData = {
	chainId: ChainId;
	generatedAt: string;
	tokens: DirectoryToken[];
	pools: DirectoryPool[];
};

export type DirectoryLoadingState = "loading" | "loaded" | "error";

export type DirectoryState = {
	status: DirectoryLoadingState;
	data: DirectoryChainData | null;
	error: string | null;
	lastUpdated: number | null;
};
