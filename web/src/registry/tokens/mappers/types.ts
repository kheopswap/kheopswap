import type { XcmV5Multilocation } from "../../types/xcm.ts";

export type AssetMetadataEntry = {
	keyArgs: [number];
	value: {
		decimals: number;
		symbol: Uint8Array;
		name: Uint8Array;
	};
};

export type AssetInfoEntry = {
	keyArgs: [number];
	value: {
		is_sufficient: boolean;
	};
};

export type PoolAssetEntry = {
	keyArgs: [number];
};

export type ForeignAssetLocation = {
	interior?: {
		type?: string;
		value?: unknown;
	};
};

export type ForeignAssetEntry<
	Location extends ForeignAssetLocation = ForeignAssetLocation,
> = {
	keyArgs: [Location];
	value: {
		is_sufficient?: boolean;
	};
};

export type ForeignMetadataEntry<
	Location extends ForeignAssetLocation = ForeignAssetLocation,
> = {
	keyArgs: [Location];
	value: {
		decimals: number;
		symbol: Uint8Array;
		name: Uint8Array;
	};
};

export type HydrationAssetType =
	| "Token"
	| "External"
	| "XYK"
	| "StableSwap"
	| "Bond"
	| "Erc20";

export type HydrationAssetEntry = {
	keyArgs: [number];
	value: {
		asset_type: { type: HydrationAssetType };
		name?: Uint8Array;
		symbol?: Uint8Array;
		decimals?: number;
		is_sufficient: boolean;
	};
};

export type HydrationAssetLocationEntry = {
	keyArgs: [number];
	value: XcmV5Multilocation;
};
