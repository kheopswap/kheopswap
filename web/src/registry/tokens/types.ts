import type { ChainId } from "../chains/types";
import type { XcmV5Multilocation } from "../types/xcm";

export type TokenTypeNative = "native";
export type TokenTypeAsset = "asset";
export type TokenTypePoolAsset = "pool-asset";
export type TokenTypeForeignAsset = "foreign-asset";
export type TokenType =
	| TokenTypeNative
	| TokenTypeAsset
	| TokenTypePoolAsset
	| TokenTypeForeignAsset;

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
	location: XcmV5Multilocation;
	verified: boolean;
	isSufficient: boolean;
};

export type TokenNoId =
	| TokenNativeNoId
	| TokenAssetNoId
	| TokenPoolAssetNoId
	| TokenForeignAssetNoId;

/* declaration */
export type TokenIdNative = string; // `native::${ChainId}`;
export type TokenIdAsset = string; // `asset::${ChainId}::${number}`;
export type TokenIdPoolAsset = string; // `pool-asset::${ChainId}::${number}`;
export type TokenIdForeignAsset = string; // `foreign-asset::${ChainId}::${multilocation}`;
export type TokenId =
	| TokenIdNative
	| TokenIdAsset
	| TokenIdPoolAsset
	| TokenIdForeignAsset;

export type TokenIdsPair = [TokenId, TokenId];

export type TokenNative = TokenNativeNoId & { id: TokenIdNative };
export type TokenAsset = TokenAssetNoId & { id: TokenIdAsset };
export type TokenPoolAsset = TokenPoolAssetNoId & { id: TokenIdPoolAsset };
export type TokenForeignAsset = TokenForeignAssetNoId & {
	id: TokenIdForeignAsset;
};
export type Token =
	| TokenNative
	| TokenAsset
	| TokenPoolAsset
	| TokenForeignAsset;

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

export type TokenInfo =
	| TokenInfoNative
	| TokenInfoAsset
	| TokenInfoPoolAsset
	| TokenInfoForeignAsset;
