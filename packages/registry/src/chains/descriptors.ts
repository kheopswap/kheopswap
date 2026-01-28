import { kah, pah, pasah, wah } from "@polkadot-api/descriptors";

export const DESCRIPTORS_ASSET_HUB = {
	pah,
	kah,
	wah,
	pasah,
} as const;

export type DescriptorsAssetHub = typeof DESCRIPTORS_ASSET_HUB;
