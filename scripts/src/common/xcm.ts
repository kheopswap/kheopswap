import { XcmV3Junctions } from "@polkadot-api/descriptors";

export type XcmV3Multilocation = {
	parents: number;
	interior: XcmV3Junctions;
};

// local token
export const getNativeTokenLocation = (
	parents: number,
): XcmV3Multilocation => ({
	parents,
	interior: {
		type: "Here",
		value: undefined,
	},
});

// asset to create, derived from ASSET_ID
export const getAssetTokenLocation = (
	assetId: number,
	parents = 0,
): XcmV3Multilocation => ({
	parents,
	interior: {
		type: "X2",
		value: [
			{
				type: "PalletInstance",
				value: 50,
			},
			{
				type: "GeneralIndex",
				value: BigInt(assetId),
			},
		],
	},
});
