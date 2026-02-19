export type TextLike = {
	asText: () => string;
};

export type AssetMetadataEntry = {
	keyArgs: [number];
	value: {
		decimals: number;
		symbol: TextLike;
		name: TextLike;
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
		symbol: TextLike;
		name: TextLike;
	};
};
