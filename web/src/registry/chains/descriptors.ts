import { hydration, kah, pah, pasah, wah } from "@polkadot-api/descriptors";

export const DESCRIPTORS_ASSET_HUB = {
	pah,
	kah,
	wah,
	pasah,
} as const;

export const DESCRIPTORS_HYDRATION = {
	hydration,
} as const;

export const DESCRIPTORS = {
	...DESCRIPTORS_ASSET_HUB,
	...DESCRIPTORS_HYDRATION,
} as const;

export type DescriptorsAssetHub = typeof DESCRIPTORS_ASSET_HUB;
export type DescriptorsHydration = typeof DESCRIPTORS_HYDRATION;
export type DescriptorsAll = typeof DESCRIPTORS;
