import { XcmV3Junction, XcmV3Junctions } from "@kheopswap/registry";

import type { Token } from "@kheopswap/registry";

export const getFeeAssetLocation = (feeToken: Token) => {
	if (!feeToken.isSufficient)
		throw new Error(
			`Token ${feeToken.symbol} (${feeToken.id}) is not sufficient`,
		);

	// only allow assets, undefined for others, including native token
	switch (feeToken.type) {
		case "asset":
			return {
				parents: 0,
				interior: XcmV3Junctions.X2([
					XcmV3Junction.PalletInstance(50),
					XcmV3Junction.GeneralIndex(BigInt(feeToken.assetId)),
				]),
			};
		default:
			return undefined;
	}
};
