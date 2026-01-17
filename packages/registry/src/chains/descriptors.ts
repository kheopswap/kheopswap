import {
	kah,
	kusama,
	pah,
	pasah,
	paseo,
	polkadot,
	wah,
	westend,
} from "@polkadot-api/descriptors";

export const DESCRIPTORS_RELAY = {
	polkadot,
	kusama,
	westend,
	paseo,
} as const;

export const DESCRIPTORS_ASSET_HUB = {
	pah,
	kah,
	wah,
	pasah,
} as const;

export const DESCRIPTORS_ALL = {
	...DESCRIPTORS_RELAY,
	...DESCRIPTORS_ASSET_HUB,
} as const;

export type DescriptorsAssetHub = typeof DESCRIPTORS_ASSET_HUB;
export type DescriptorsRelay = typeof DESCRIPTORS_RELAY;
export type DescriptorsAll = DescriptorsRelay & DescriptorsAssetHub;
