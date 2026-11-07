import {
	hydration,
	kah,
	kpeople,
	pah,
	pasah,
	paspeople,
	ppeople,
	wah,
	wpeople,
} from "@polkadot-api/descriptors";

export const DESCRIPTORS_ASSET_HUB = {
	pah,
	kah,
	wah,
	pasah,
} as const;

export const DESCRIPTORS_HYDRATION = {
	hydration,
} as const;

export const DESCRIPTORS_PEOPLE = {
	ppeople,
	kpeople,
	wpeople,
	paspeople,
} as const;

export const DESCRIPTORS = {
	...DESCRIPTORS_ASSET_HUB,
	...DESCRIPTORS_HYDRATION,
	...DESCRIPTORS_PEOPLE,
} as const;

export type DescriptorsAssetHub = typeof DESCRIPTORS_ASSET_HUB;
export type DescriptorsHydration = typeof DESCRIPTORS_HYDRATION;
export type DescriptorsPeople = typeof DESCRIPTORS_PEOPLE;
export type DescriptorsAll = typeof DESCRIPTORS;
