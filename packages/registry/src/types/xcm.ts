import type { XcmV5Junctions } from "@polkadot-api/descriptors";

export type XcmV5Multilocation = {
	parents: number;
	interior: XcmV5Junctions;
};
