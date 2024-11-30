import {
	hydration,
	kah,
	kusama,
	moonbeam,
	mythos,
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

export const DESCRIPTORS_HYDRATION = {
	hydration,
} as const;

export const DESCRIPTORS_MYTHOS = {
	mythos,
} as const;

export const DESCRIPTORS_MOONBEAM = {
	moonbeam,
} as const;

export const DESCRIPTORS_ALL = {
	...DESCRIPTORS_RELAY,
	...DESCRIPTORS_ASSET_HUB,
	...DESCRIPTORS_HYDRATION,
	...DESCRIPTORS_MYTHOS,
	...DESCRIPTORS_MOONBEAM,
} as const;

export type DescriptorsAssetHub = typeof DESCRIPTORS_ASSET_HUB;
export type DescriptorsRelay = typeof DESCRIPTORS_RELAY;
export type DescriptorsHydration = typeof DESCRIPTORS_HYDRATION;
export type DescriptorsMythos = typeof DESCRIPTORS_MYTHOS;
export type DescriptorsMoonbeam = typeof DESCRIPTORS_MOONBEAM;

export type DescriptorsAll = DescriptorsRelay &
	DescriptorsAssetHub &
	DescriptorsHydration &
	DescriptorsMythos &
	DescriptorsMoonbeam;
