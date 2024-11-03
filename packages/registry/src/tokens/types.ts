import type { ChainId, XcmV3Multilocation } from "@kheopswap/registry";

export type TokenTypeNative = "native";
export type TokenTypeAsset = "asset";
export type TokenTypePoolAsset = "pool-asset";
export type TokenTypeForeignAsset = "foreign-asset";
export type TokenTypeHydrationAsset = "hydration-asset";
export type TokenType =
	| TokenTypeNative
	| TokenTypeAsset
	| TokenTypePoolAsset
	| TokenTypeForeignAsset
	| TokenTypeHydrationAsset;

export type TokenNativeNoId = {
	type: TokenTypeNative;
	chainId: ChainId;
	decimals: number;
	symbol: string;
	name: string;
	logo: string;
	verified: undefined;
	isSufficient: true;
};

export type TokenAssetNoId = {
	type: TokenTypeAsset;
	chainId: ChainId;
	decimals: number;
	symbol: string;
	name: string;
	logo: string;
	assetId: number;
	verified: boolean;
	isSufficient: boolean;
};

export type TokenPoolAssetNoId = {
	type: TokenTypePoolAsset;
	chainId: ChainId;
	decimals: number; // TODO set to 0
	symbol: string; // TODO remove
	name: string; // TODO remove
	logo: string; // TODO remove
	poolAssetId: number;
	verified: undefined;
	isSufficient: false;
};

export type TokenForeignAssetNoId = {
	type: TokenTypeForeignAsset;
	chainId: ChainId;
	decimals: number; // TODO set to 0
	symbol: string; // TODO remove
	name: string; // TODO remove
	logo: string; // TODO remove
	location: XcmV3Multilocation;
	verified: boolean;
	isSufficient: boolean;
};

export type TokenHydrationAssetNoId = {
	type: TokenTypeHydrationAsset;
	chainId: ChainId;
	decimals: number;
	symbol: string;
	name: string;
	logo: string;
	assetId: number;
	location: XcmV3Multilocation;
	verified: boolean;
	isSufficient: boolean;
};

export type TokenNoId =
	| TokenNativeNoId
	| TokenAssetNoId
	| TokenPoolAssetNoId
	| TokenForeignAssetNoId
	| TokenHydrationAssetNoId;

/* declaration */
export type TokenIdNative = string; // `native::${ChainId}`;
export type TokenIdAsset = string; // `asset::${ChainId}::${number}`;
export type TokenIdPoolAsset = string; // `pool-asset::${ChainId}::${number}`;
export type TokenIdForeignAsset = string; // `foreign-asset::${ChainId}::${multilocation}`;
export type TokenIdHydrationAsset = string; // `hydration-asset::${ChainId}::${number}`;
export type TokenId =
	| TokenIdNative
	| TokenIdAsset
	| TokenIdPoolAsset
	| TokenIdForeignAsset
	| TokenIdHydrationAsset;

export type TokenIdsPair = [TokenId, TokenId];

export type TokenNative = TokenNativeNoId & { id: TokenIdNative };
export type TokenAsset = TokenAssetNoId & { id: TokenIdAsset };
export type TokenPoolAsset = TokenPoolAssetNoId & { id: TokenIdPoolAsset };
export type TokenForeignAsset = TokenForeignAssetNoId & {
	id: TokenIdForeignAsset;
};
export type TokenHydrationAsset = TokenHydrationAssetNoId & {
	id: TokenIdHydrationAsset;
};
export type Token =
	| TokenNative
	| TokenAsset
	| TokenPoolAsset
	| TokenForeignAsset
	| TokenHydrationAsset;

export type TokenInfoAsset = {
	id: TokenIdAsset;
	type: TokenTypeAsset;
	supply: bigint;
	owner: string;
	issuer: string;
	admin: string;
	freezer: string;
	minBalance: bigint;
	accounts: number;
	status: string;
};

export type TokenInfoForeignAsset = {
	id: TokenIdForeignAsset;
	type: TokenTypeForeignAsset;
	supply: bigint;
	owner: string;
	issuer: string;
	admin: string;
	freezer: string;
	minBalance: bigint;
	accounts: number;
	status: string;
};

export type TokenInfoPoolAsset = {
	id: TokenIdPoolAsset;
	type: TokenTypePoolAsset;
	supply: bigint;
	owner: string;
	issuer: string;
	admin: string;
	freezer: string;
	minBalance: bigint;
	accounts: number;
	status: string;
};

export type TokenInfoNative = {
	id: TokenIdNative;
	type: TokenTypeNative;
	minBalance: bigint;
	supply: bigint;
};

export type TokenInfoHydrationAsset = {
	id: TokenIdHydrationAsset;
	type: TokenTypeHydrationAsset;
	supply: bigint;
	minBalance: bigint;
	isSufficient: boolean;
};

export type TokenInfo =
	| TokenInfoNative
	| TokenInfoAsset
	| TokenInfoPoolAsset
	| TokenInfoForeignAsset
	| TokenInfoHydrationAsset;
