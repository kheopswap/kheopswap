import type {
	ChainId,
	ChainIdAssetHub,
	ChainIdHydration,
} from "../chains/types.ts";
import type { XcmV5Multilocation } from "../types/xcm.ts";

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
	logo?: string;
	verified: undefined;
	isSufficient: true;
};

export type TokenAssetNoId = {
	type: TokenTypeAsset;
	chainId: ChainIdAssetHub;
	decimals: number;
	symbol: string;
	name: string;
	logo?: string;
	assetId: number;
	verified: boolean;
	isSufficient: boolean;
};

export type TokenPoolAssetNoId = {
	type: TokenTypePoolAsset;
	chainId: ChainIdAssetHub;
	/** Always 0 for pool-asset tokens (LP tokens). */
	decimals: number;
	/** Always "" — kept for Token union compatibility. */
	symbol: string;
	/** Always "" — kept for Token union compatibility. */
	name: string;
	/** Always undefined — kept for Token union compatibility. */
	logo?: string;
	poolAssetId: number;
	verified: undefined;
	isSufficient: false;
};

export type TokenForeignAssetNoId = {
	type: TokenTypeForeignAsset;
	chainId: ChainIdAssetHub;
	/** Populated from on-chain metadata at runtime. */
	decimals: number;
	/** Populated from on-chain metadata at runtime. */
	symbol: string;
	/** Populated from on-chain metadata at runtime. */
	name: string;
	logo?: string;
	location: XcmV5Multilocation;
	verified: boolean;
	isSufficient: boolean;
};

export type TokenHydrationAssetNoId = {
	type: TokenTypeHydrationAsset;
	chainId: ChainIdHydration;
	decimals: number;
	symbol: string;
	name: string;
	logo?: string;
	assetId: number;
	location?: XcmV5Multilocation;
	verified: boolean;
	isSufficient: boolean;
};

/* declaration */
export type TokenIdNative = string; // `native::${ChainId}`;
export type TokenIdAsset = string; // `asset::${ChainId}::${number}`;
export type TokenIdPoolAsset = string; // `pool-asset::${ChainId}::${number}`;
export type TokenIdForeignAsset = string; // `foreign-asset::${ChainId}::${multilocation}`;
export type TokenIdHydrationAsset = string; // `hydration-asset::${ChainIdHydration}::${number}`;
export type TokenId =
	| TokenIdNative
	| TokenIdAsset
	| TokenIdPoolAsset
	| TokenIdForeignAsset
	| TokenIdHydrationAsset;

export type TokenIdsPair = [TokenId, TokenId];

export type TokenAmount = { tokenId: TokenId; plancks: bigint };

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
	minBalance: bigint;
	supply: bigint;
};

export type TokenInfo =
	| TokenInfoNative
	| TokenInfoAsset
	| TokenInfoPoolAsset
	| TokenInfoForeignAsset
	| TokenInfoHydrationAsset;
